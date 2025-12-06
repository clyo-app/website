document.addEventListener('DOMContentLoaded', () => {

    // --- Cinematic Intro Sequencer ---
    const introOverlay = document.getElementById('intro-overlay');
    const mainContent = document.querySelector('main');
    // Removed scene-final, scene-3 is now the end
    const sceneIds = ['scene-0', 'scene-1', 'scene-2', 'scene-3'];
    const defaultDuration = 2400; 

    // --- Audio Engine (Web Audio API) ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx;
    let masterGain;
    let reverbNode;
    let ambienceNodes = [];

    // --- Sound Design Tools ---

    // 1. Reverb (Space Generator) - Makes it sound "Organic"
    async function setupReverb() {
        reverbNode = audioCtx.createConvolver();
        // Generate a synthetic impulse response for a "Large Hall" sound
        const length = audioCtx.sampleRate * 3; // 3 seconds tail
        const decay = 2.0;
        const buffer = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // Noise with exponential decay
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }
        reverbNode.buffer = buffer;
        reverbNode.connect(masterGain);
    }

    // 2. The Piano/Bell Instrument
    function playPianoNote(freq, time, duration, vol) {
        if (!audioCtx) return;
        const t = time;
        
        // Oscillator 1: The Body (Sine/Triangle mix)
        const osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        // Oscillator 2: The Hammer (Click/Attack)
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, t); // Octave up
        
        // Envelope
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.02); // Fast attack
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration); // Long release

        // Filter (make it softer)
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.linearRampToValueAtTime(200, t + duration);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(reverbNode); // Send to reverb
        gain.connect(masterGain); // Send to master

        osc.start(t);
        osc2.start(t);
        osc.stop(t + duration);
        osc2.stop(t + duration);
    }

    function playChord(notes, volume = 0.25) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        const t = audioCtx.currentTime;
        notes.forEach((freq, i) => {
            // Stagger notes slightly for realism (strumming effect)
            playPianoNote(freq, t + (i * 0.06), 3.5, volume);
        });
    }

    // 3. Ambience (The "No Silence" Pad)
    function startAmbience() {
        if (!audioCtx || ambienceNodes.length > 0) return;

        // Create a drone using warmer frequencies (Eb2 base)
        const freq = 155.56; // Eb3
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.value = freq;
        
        osc2.type = 'sawtooth';
        osc2.frequency.value = freq * 1.01; // Detuned slightly

        filter.type = 'lowpass';
        filter.frequency.value = 180; // Warm/Muffled

        gain.gain.value = 0;
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(reverbNode); 

        osc1.start();
        osc2.start();
        
        // Fade in
        gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 4);

        ambienceNodes.push(osc1, osc2, gain);
    }

    // 4. Noise Burst (Explosion SFX)
    function playNoiseBurst() {
        if (!audioCtx) return;
        const t = audioCtx.currentTime;
        const duration = 0.5;
        
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, t);
        filter.frequency.exponentialRampToValueAtTime(50, t + duration);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        
        noise.start(t);
    }

    function fadeOutAudio() {
        if (masterGain) {
            // Long fade out over 8 seconds
            masterGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 8);
            setTimeout(() => {
                if(audioCtx) audioCtx.close();
            }, 8500);
        }
    }

    // --- Frequencies (Eb Major / Lydian - Uplifting) ---
    const N = {
        Eb2: 77.78, G2: 98.00, Bb2: 116.54,
        C3: 130.81, D3: 146.83, Eb3: 155.56, F3: 174.61, G3: 196.00, Ab3: 207.65, Bb3: 233.08,
        C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23, G4: 392.00
    };

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new AudioContext();
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 0.8;
            masterGain.connect(audioCtx.destination);
            setupReverb();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        startAmbience();
    }
    // ------------------------------------

    if (introOverlay && mainContent) {
        const currentPath = window.location.pathname;
        const shouldPlayIntro = currentPath.endsWith('/intro') || (currentPath.includes('index.html') && window.location.search.includes('intro=true'));

        if (shouldPlayIntro) {
            // Wait for user interaction on Scene 0
            const scene0 = document.getElementById('scene-0');
            scene0.classList.add('active'); // Show Splash

            mainContent.style.transform = 'scale(0.92)';
            mainContent.style.transition = 'transform 0.8s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.8s ease-out';
            mainContent.style.opacity = '0';

            // Click Handler to Start the Show
            const startHandler = () => {
                scene0.removeEventListener('click', startHandler);
                initAudio(); // Unlock Audio
                
                // Start Sequence
                setTimeout(() => {
                    scene0.classList.remove('active');
                    scene0.classList.add('exit');
                    playScene(1); 
                }, 400); // Short delay after click
            };
            
            scene0.addEventListener('click', startHandler);

            function playScene(index) {
                if (index >= sceneIds.length) return;

                const currentScene = document.getElementById(sceneIds[index]);
                const isFinal = index === sceneIds.length - 1;
                
                const duration = defaultDuration;

                if (currentScene) {
                    currentScene.classList.add('active');
                    
                    // --- Music Sequencer (Happy/Dreamy) ---
                    if (audioCtx && audioCtx.state === 'running') {
                        switch(index) {
                            case 1: playChord([N.Eb3, N.G3, N.Bb3, N.D4]); break; // Eb Maj 7 (Dreamy)
                            case 2: playChord([N.G3, N.Bb3, N.D4, N.F4]); break; // G Minor 7 (Soft)
                            case 3: playChord([N.Ab3, N.C4, N.Eb4, N.G4]); break; // Ab Maj 7 (Hopeful)
                        }
                    }
                    // -----------------------

                    if (!isFinal) {
                        // Normal Scene Transition
                        setTimeout(() => {
                            currentScene.classList.remove('active');
                            currentScene.classList.add('exit');
                            setTimeout(() => playScene(index + 1), 600);
                        }, duration);
                    } else {
                        // FINAL SCENE (Scene 3) - AUTO EXIT to Website
                        setTimeout(() => {
                            // The BOOM (Happy Ending)
                            if (audioCtx && audioCtx.state === 'running') {
                                playChord([N.Eb2, N.Eb3, N.G3, N.Bb3], 0.6);
                                playNoiseBurst(); // Added SFX
                            }
                            fadeOutAudio(); // Slow fade out
                            
                            introOverlay.classList.add('digital-boom');
                            mainContent.style.opacity = '1';
                            mainContent.style.transform = 'scale(1)';

                            setTimeout(() => {
                                introOverlay.style.display = 'none';
                            }, 800);
                        }, 2800); // Hold final text slightly longer
                    }
                }
            }
        } else {
            introOverlay.style.display = 'none';
            mainContent.style.opacity = '1';
            mainContent.style.transform = 'scale(1)';
        }
    }

    // --- Intersection Observer for scroll animations ---
    const sections = document.querySelectorAll('section');
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });

    // --- Hide header on scroll ---
    let lastScrollTop = 0;
    const header = document.querySelector('.main-header');
    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > header.offsetHeight) {
            header.style.top = '-200px'; 
        } else {
            header.style.top = '0';
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });

    // --- Subscription Form ---
    const subscribeForm = document.getElementById('subscribe-form');
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = subscribeForm.querySelector('input[type="email"]');
            const email = emailInput.value;
            
            alert(`Thank you! We will notify you at ${email} when Clyo launches.`);
            
            emailInput.value = '';
        });
    }

    // --- Interactive Particle Background ---
    const canvas = document.getElementById('particles-js');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let particles = [];
        const particleCount = Math.floor(canvas.width / 35); 
        const colors = ['#855317', '#ffdcbc', '#e0c8b4'];
        const mouse = { x: null, y: null, radius: 120 };

        window.addEventListener('mousemove', (event) => {
            mouse.x = event.x;
            mouse.y = event.y;
        });
        window.addEventListener('mouseout', () => {
            mouse.x = null;
            mouse.y = null;
        });

        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.size = Math.random() * 2.5 + 1;
                this.baseX = this.x;
                this.baseY = this.y;
                this.density = (Math.random() * 20) + 5; 
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            update() {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouse.radius) {
                    let forceDirectionX = dx / distance;
                    let forceDirectionY = dy / distance;
                    let maxDistance = mouse.radius;
                    let force = (maxDistance - distance) / maxDistance;
                    let directionX = forceDirectionX * force * this.density;
                    let directionY = forceDirectionY * force * this.density;
                    this.x -= directionX;
                    this.y -= directionY;
                } else {
                    if (this.x !== this.baseX) {
                        let dx = this.x - this.baseX;
                        this.x -= dx / 10;
                    }
                    if (this.y !== this.baseY) {
                        let dy = this.y - this.baseY;
                        this.y -= dy / 10;
                    }
                }
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }
        }

        function initParticles() {
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height));
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
            }
            requestAnimationFrame(animateParticles);
        }

        initParticles();
        animateParticles();

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            mouse.radius = ((canvas.height/80) * (canvas.width/80));
            initParticles();
        });
    }

    // --- 3D Tilt Effect for Feature Cards ---
    const featureModes = document.querySelectorAll('.feature-mode');
    featureModes.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -5;
            const rotateY = ((x - centerX) / centerX) * 5;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        });
    });
});