/**
 * innovation.js
 * Interactive & animated features for the 24CC homepage.
 *  - Particle constellation canvas
 *  - Typewriter headline
 *  - Scroll-reveal (IntersectionObserver)
 *  - Animated stat counters
 *  - Card mouse-glow tracking
 */
(() => {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ============================
       1. Particle Constellation
       ============================ */
    const canvas = document.getElementById('particle-canvas');
    if (canvas && !prefersReducedMotion) {
        const ctx = canvas.getContext('2d');
        let w, h, particles = [];
        const PARTICLE_COUNT = 55;
        const CONNECT_DIST = 110;
        const SPEED = 0.25;

        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            w = canvas.width = rect.width;
            h = canvas.height = rect.height;
        };

        const createParticles = () => {
            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * SPEED,
                    vy: (Math.random() - 0.5) * SPEED,
                    r: Math.random() * 1.6 + 0.6,
                    alpha: Math.random() * 0.5 + 0.3
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, w, h);

            // Lines
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECT_DIST) {
                        const alpha = (1 - dist / CONNECT_DIST) * 0.18;
                        ctx.strokeStyle = `rgba(240,192,64,${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Dots
            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(125,249,255,${p.alpha})`;
                ctx.fill();
            }
        };

        const update = () => {
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
            }
        };

        const loop = () => {
            update();
            draw();
            requestAnimationFrame(loop);
        };

        resize();
        createParticles();
        loop();

        window.addEventListener('resize', () => {
            resize();
            createParticles();
        });
    }

    /* ============================
       2. Typewriter Effect
       ============================ */
    const twEl = document.querySelector('.typewriter[data-typewriter]');
    if (twEl) {
        const text = twEl.getAttribute('data-typewriter') || '';
        let i = 0;
        const type = () => {
            if (i <= text.length) {
                twEl.textContent = text.slice(0, i);
                i++;
                setTimeout(type, 60 + Math.random() * 40);
            } else {
                // Keep cursor blinking for 2s then hide
                setTimeout(() => twEl.classList.add('done'), 2000);
            }
        };
        if (prefersReducedMotion) {
            twEl.textContent = text;
            twEl.classList.add('done');
        } else {
            type();
        }
    }

    /* ============================
       3. Scroll Reveal
       ============================ */
    const revealSections = () => {
        // Auto-add .reveal to all sections (except hero)
        document.querySelectorAll('.section').forEach(sec => {
            if (!sec.classList.contains('reveal')) {
                sec.classList.add('reveal');
            }
        });

        // Add stagger class to grids and stat rows
        document.querySelectorAll('.grid-4, .grid-3, .grid-2, .stats-row, .stack').forEach(el => {
            el.classList.add('reveal-stagger');
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Don't unobserve stagger containers until children animate
                    if (!entry.target.classList.contains('reveal-stagger')) {
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => observer.observe(el));
    };

    if (!prefersReducedMotion) {
        revealSections();
    }

    /* ============================
       4. Animated Stat Counters
       ============================ */
    const statEls = document.querySelectorAll('.stat-number[data-count]');
    if (statEls.length && !prefersReducedMotion) {
        const animateCount = (el) => {
            const target = parseInt(el.getAttribute('data-count'), 10);
            const suffix = el.getAttribute('data-suffix') || '';
            const duration = 1600;
            const start = performance.now();

            const tick = (now) => {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                // Ease-out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(eased * target);
                el.textContent = current + suffix;

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    el.classList.add('counted');
                }
            };
            requestAnimationFrame(tick);
        };

        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCount(entry.target);
                    statObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        statEls.forEach(el => statObserver.observe(el));
    } else {
        // If reduced motion, just set final values immediately
        statEls.forEach(el => {
            const target = el.getAttribute('data-count') || '0';
            const suffix = el.getAttribute('data-suffix') || '';
            el.textContent = target + suffix;
        });
    }

    /* ============================
       5. Card Mouse-Glow + 3D Tilt
       ============================ */
    if (!prefersReducedMotion) {
        const tiltEls = document.querySelectorAll('.card, .stat, .step-card, .roadmap-item, .craft-group');

        tiltEls.forEach(el => {
            el.addEventListener('mouseenter', () => {
                el.style.transition = 'transform 0.1s ease-out, border-color 0.3s, background 0.3s, box-shadow 0.3s';
            });

            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const rotateY = ((x - cx) / cx) * 8;  // max ±8deg
                const rotateX = ((cy - y) / cy) * 6;  // max ±6deg

                el.style.setProperty('--rx', rotateX + 'deg');
                el.style.setProperty('--ry', rotateY + 'deg');
                el.style.setProperty('--mouse-x', x + 'px');
                el.style.setProperty('--mouse-y', y + 'px');
                el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
            });

            el.addEventListener('mouseleave', () => {
                el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s, background 0.3s, box-shadow 0.3s';
                el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)';
            });
        });

        // Global card glow tracking
        document.addEventListener('mousemove', (e) => {
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', x + 'px');
                card.style.setProperty('--mouse-y', y + 'px');
            });
        });
    }

    /* ============================
       6. 3D Parallax on Scroll
       ============================ */
    if (!prefersReducedMotion) {
        const scenes = document.querySelectorAll('.scene-3d');
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    scenes.forEach(scene => {
                        const rect = scene.getBoundingClientRect();
                        const viewH = window.innerHeight;
                        const progress = (viewH - rect.top) / (viewH + rect.height);
                        const clamped = Math.max(0, Math.min(1, progress));
                        const rotateX = (0.5 - clamped) * 4; // slight tilt based on scroll position
                        scene.style.transform = `perspective(1200px) rotateX(${rotateX}deg)`;
                    });
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    /* ============================
       7. Filmstrip Auto-Scroll
       ============================ */
    const filmstrips = document.querySelectorAll('.filmstrip');
    filmstrips.forEach(strip => {
        let scrollAmount = 0;
        const speed = 0.5;
        let paused = false;

        strip.addEventListener('mouseenter', () => paused = true);
        strip.addEventListener('mouseleave', () => paused = false);

        function autoScroll() {
            if (!paused && strip.scrollWidth > strip.clientWidth) {
                scrollAmount += speed;
                if (scrollAmount >= strip.scrollWidth - strip.clientWidth) {
                    scrollAmount = 0;
                }
                strip.scrollLeft = scrollAmount;
            }
            requestAnimationFrame(autoScroll);
        }
        autoScroll();
    });

})();
