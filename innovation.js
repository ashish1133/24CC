/**
 * innovation.js
 * Interactive & animated features for the 24CC website.
 *  - Custom cursor with glow trail
 *  - Scroll progress indicator
 *  - Enhanced particle constellation canvas
 *  - Typewriter headline
 *  - Scroll-reveal (IntersectionObserver)
 *  - Animated stat counters
 *  - Card 3D tilt + mouse-glow tracking
 *  - 3D parallax on scroll
 *  - Filmstrip auto-scroll
 *  - Magnetic button effect
 *  - Smooth page transitions
 */
(() => {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ============================
       -1. Cinematic Loading Screen
       ============================ */
    const loaderEl = document.getElementById('cinema-loader');
    const countdownEl = document.getElementById('loader-countdown');
    const barFill = document.getElementById('loader-bar-fill');

    if (loaderEl && !prefersReducedMotion) {
        const nums = ['5', '4', '3', '2', '1'];
        let step = 0;
        const interval = setInterval(() => {
            step++;
            if (step < nums.length) {
                countdownEl.textContent = nums[step];
                barFill.style.width = ((step + 1) / nums.length * 100) + '%';
            }
            if (step >= nums.length) {
                clearInterval(interval);
                loaderEl.classList.add('loaded');
                setTimeout(() => loaderEl.remove(), 900);
            }
        }, 350);
        barFill.style.width = '20%';
    } else if (loaderEl) {
        loaderEl.remove();
    }

    /* ============================
       0. Scroll Progress Bar
       ============================ */
    if (!prefersReducedMotion) {
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: fixed; top: 0; left: 0; height: 3px; z-index: 9999;
            background: linear-gradient(90deg, #f0c040, #7df9ff, #b388ff, #f0c040);
            background-size: 300% 100%;
            animation: progress-gradient 3s linear infinite;
            width: 0%; transition: width 0.1s linear;
            box-shadow: 0 0 10px rgba(240,192,64,0.4), 0 0 20px rgba(125,249,255,0.2);
            pointer-events: none;
        `;
        const style = document.createElement('style');
        style.textContent = `@keyframes progress-gradient { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }`;
        document.head.appendChild(style);
        document.body.appendChild(progressBar);

        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            progressBar.style.width = progress + '%';
        });
    }

    /* ============================
       0b. Cinema Projector Cursor
       Film-frame crosshair + particle trail + click ripple
       ============================ */
    if (!prefersReducedMotion && window.innerWidth > 768) {
        // --- Build cursor DOM ---
        const cursorWrap = document.createElement('div');
        cursorWrap.className = 'cc-cursor';
        cursorWrap.innerHTML = '<div class="cc-cursor__ring"></div><div class="cc-cursor__dot"></div>';
        document.body.appendChild(cursorWrap);

        // --- Trail dots (8 particles that follow with staggered delay) ---
        const TRAIL_COUNT = 8;
        const trailDots = [];
        for (let i = 0; i < TRAIL_COUNT; i++) {
            const dot = document.createElement('div');
            dot.className = 'cc-trail-dot';
            document.body.appendChild(dot);
            trailDots.push({ el: dot, x: 0, y: 0 });
        }

        let mx = -100, my = -100;
        const trailHistory = [];  // stores recent mouse positions

        // --- Mouse tracking ---
        document.addEventListener('mousemove', (e) => {
            mx = e.clientX;
            my = e.clientY;
            trailHistory.push({ x: mx, y: my, t: performance.now() });
            // Keep last 60 positions (~1s at 60fps)
            if (trailHistory.length > 60) trailHistory.shift();
        });

        // --- Hover detection ---
        const INTERACTIVE = 'a, button, .card, .film-frame, .stat, .pill-list li, .craft-group, .roadmap-item, .step-card, .tool-card, input, textarea, select, .nav-link, .button, .badge-3d, .brand';

        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(INTERACTIVE)) cursorWrap.classList.add('is-hovering');
        });
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest(INTERACTIVE)) cursorWrap.classList.remove('is-hovering');
        });

        // --- Click ripple ---
        document.addEventListener('mousedown', () => {
            cursorWrap.classList.add('is-clicking');
            // Spawn ripple
            const ripple = document.createElement('div');
            ripple.className = 'cc-click-ripple';
            ripple.style.left = mx + 'px';
            ripple.style.top = my + 'px';
            document.body.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        });
        document.addEventListener('mouseup', () => {
            cursorWrap.classList.remove('is-clicking');
        });

        // --- Animation loop ---
        function animateCursor() {
            // Position main cursor
            cursorWrap.style.left = mx + 'px';
            cursorWrap.style.top = my + 'px';

            // Position trail dots with staggered delay
            const now = performance.now();
            for (let i = 0; i < TRAIL_COUNT; i++) {
                const delay = (i + 1) * 25; // ms behind cursor
                const targetTime = now - delay;

                // Find closest history point
                let pos = { x: mx, y: my };
                for (let j = trailHistory.length - 1; j >= 0; j--) {
                    if (trailHistory[j].t <= targetTime) {
                        pos = trailHistory[j];
                        break;
                    }
                }

                const dot = trailDots[i];
                // Smooth lerp towards target
                dot.x += (pos.x - dot.x) * 0.35;
                dot.y += (pos.y - dot.y) * 0.35;
                dot.el.style.left = dot.x + 'px';
                dot.el.style.top = dot.y + 'px';

                // Opacity & scale fade out along the trail
                const life = 1 - (i / TRAIL_COUNT);
                dot.el.style.opacity = life * 0.55;
                dot.el.style.transform = `translate(-50%, -50%) scale(${0.4 + life * 0.6})`;

                // Alternate gold/cyan colors along trail
                if (i % 3 === 0) {
                    dot.el.style.background = `rgba(125,249,255,${life * 0.6})`;
                    dot.el.style.boxShadow = `0 0 ${4 + life * 4}px rgba(125,249,255,${life * 0.3})`;
                } else {
                    dot.el.style.background = `rgba(240,192,64,${life * 0.6})`;
                    dot.el.style.boxShadow = `0 0 ${4 + life * 4}px rgba(240,192,64,${life * 0.3})`;
                }
            }

            requestAnimationFrame(animateCursor);
        }
        requestAnimationFrame(animateCursor);

        // Hide cursor when leaving window
        document.addEventListener('mouseleave', () => {
            cursorWrap.style.opacity = '0';
            trailDots.forEach(d => d.el.style.opacity = '0');
        });
        document.addEventListener('mouseenter', () => {
            cursorWrap.style.opacity = '1';
        });
    }

    /* ============================
       1. Enhanced Particle Constellation
       ============================ */
    const canvas = document.getElementById('particle-canvas');
    if (canvas && !prefersReducedMotion) {
        const ctx = canvas.getContext('2d');
        let w, h, particles = [];
        const PARTICLE_COUNT = 70;
        const CONNECT_DIST = 130;
        const SPEED = 0.3;
        let mouseCanvasX = -999, mouseCanvasY = -999;

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
                    r: Math.random() * 2 + 0.8,
                    alpha: Math.random() * 0.5 + 0.3,
                    pulseOffset: Math.random() * Math.PI * 2,
                    hueShift: Math.random() > 0.7 // some particles are cyan, most are gold
                });
            }
        };

        // Track mouse inside the canvas panel
        canvas.parentElement.addEventListener('mousemove', (e) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            mouseCanvasX = e.clientX - rect.left;
            mouseCanvasY = e.clientY - rect.top;
        });
        canvas.parentElement.addEventListener('mouseleave', () => {
            mouseCanvasX = -999;
            mouseCanvasY = -999;
        });

        const draw = (time) => {
            ctx.clearRect(0, 0, w, h);

            // Lines with gradient alpha
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECT_DIST) {
                        const alpha = (1 - dist / CONNECT_DIST) * 0.22;
                        const gradient = ctx.createLinearGradient(
                            particles[i].x, particles[i].y,
                            particles[j].x, particles[j].y
                        );
                        gradient.addColorStop(0, `rgba(240,192,64,${alpha})`);
                        gradient.addColorStop(1, `rgba(125,249,255,${alpha * 0.8})`);
                        ctx.strokeStyle = gradient;
                        ctx.lineWidth = 0.7;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Mouse connections
            if (mouseCanvasX > 0) {
                for (const p of particles) {
                    const dx = p.x - mouseCanvasX;
                    const dy = p.y - mouseCanvasY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 180) {
                        const alpha = (1 - dist / 180) * 0.35;
                        ctx.strokeStyle = `rgba(125,249,255,${alpha})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(mouseCanvasX, mouseCanvasY);
                        ctx.lineTo(p.x, p.y);
                        ctx.stroke();
                    }
                }
            }

            // Dots with breathing glow
            for (const p of particles) {
                const pulse = Math.sin(time * 0.002 + p.pulseOffset) * 0.3 + 0.7;
                const r = p.r * pulse;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                if (p.hueShift) {
                    ctx.fillStyle = `rgba(125,249,255,${p.alpha * pulse})`;
                } else {
                    ctx.fillStyle = `rgba(240,192,64,${p.alpha * pulse})`;
                }
                ctx.fill();

                // Glow
                if (r > 1.5) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
                    ctx.fillStyle = p.hueShift
                        ? `rgba(125,249,255,${p.alpha * 0.06 * pulse})`
                        : `rgba(240,192,64,${p.alpha * 0.06 * pulse})`;
                    ctx.fill();
                }
            }
        };

        const update = () => {
            for (const p of particles) {
                // Mouse repulsion
                if (mouseCanvasX > 0) {
                    const dx = p.x - mouseCanvasX;
                    const dy = p.y - mouseCanvasY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120 && dist > 0) {
                        const force = (120 - dist) / 120 * 0.8;
                        p.vx += (dx / dist) * force * 0.05;
                        p.vy += (dy / dist) * force * 0.05;
                    }
                }

                // Damping
                p.vx *= 0.998;
                p.vy *= 0.998;

                // Speed limit
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (speed > 1.5) {
                    p.vx = (p.vx / speed) * 1.5;
                    p.vy = (p.vy / speed) * 1.5;
                }

                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
                p.x = Math.max(0, Math.min(w, p.x));
                p.y = Math.max(0, Math.min(h, p.y));
            }
        };

        const loop = (time) => {
            update();
            draw(time);
            requestAnimationFrame(loop);
        };

        resize();
        createParticles();
        requestAnimationFrame(loop);

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

    /* ============================
       8. Magnetic Button Effect
       ============================ */
    if (!prefersReducedMotion) {
        document.querySelectorAll('.button').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = `translateY(-3px) translate(${x * 0.15}px, ${y * 0.15}px) scale(1.02)`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

    /* ============================
       9. Smooth Reveal for Text
       ============================ */
    if (!prefersReducedMotion) {
        // Add character-level animation to .text-3d headings on scroll
        const textEls = document.querySelectorAll('.text-3d');
        textEls.forEach(el => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        el.style.opacity = '1';
                        el.style.transform = 'none';
                        observer.unobserve(el);
                    }
                });
            }, { threshold: 0.3 });
            observer.observe(el);
        });
    }

    /* ============================
       10. Sprocket Animation
       ============================ */
    if (!prefersReducedMotion) {
        document.querySelectorAll('.sprocket-hole').forEach((hole, i) => {
            hole.style.animation = `sprocket-glow 2s ease-in-out ${i * 0.12}s infinite alternate`;
        });
        const sprocketStyle = document.createElement('style');
        sprocketStyle.textContent = `
            @keyframes sprocket-glow {
                0% { border-color: rgba(240,192,64,0.15); box-shadow: none; }
                100% { border-color: rgba(240,192,64,0.5); box-shadow: 0 0 8px rgba(240,192,64,0.2); }
            }
        `;
        document.head.appendChild(sprocketStyle);
    }

    /* ============================
       11. Smooth Page Load
       ============================ */
    if (!prefersReducedMotion) {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.6s ease';
        window.addEventListener('load', () => {
            requestAnimationFrame(() => {
                document.body.style.opacity = '1';
            });
        });
        // Fallback if load already fired
        if (document.readyState === 'complete') {
            document.body.style.opacity = '1';
        }
    }

    /* ============================
       12. Card Spotlight Tracking
       ============================ */
    if (!prefersReducedMotion) {
        document.addEventListener('mousemove', (e) => {
            document.querySelectorAll('.card-spotlight').forEach(card => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--spotlight-x', (e.clientX - rect.left) + 'px');
                card.style.setProperty('--spotlight-y', (e.clientY - rect.top) + 'px');
            });
        });
    }

    /* ============================
       13. Smooth Page Transitions
       ============================ */
    if (!prefersReducedMotion) {
        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('mailto')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.body.style.opacity = '0';
                    document.body.style.transform = 'translateY(-10px)';
                    document.body.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                    setTimeout(() => {
                        window.location.href = href;
                    }, 350);
                });
            }
        });
    }

    /* ============================
       14. Parallax Background Blobs
       ============================ */
    if (!prefersReducedMotion) {
        let lastScrollY = 0;
        const body = document.body;
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            if (Math.abs(scrollY - lastScrollY) > 2) {
                const shift = scrollY * 0.02;
                body.style.setProperty('--parallax-shift', shift + 'px');
                lastScrollY = scrollY;
            }
        });
    }

    /* ============================
       15. Auto-animate Numbers
       ============================ */
    document.querySelectorAll('.highlight-number[data-value]').forEach(el => {
        const target = parseInt(el.getAttribute('data-value'), 10);
        const suffix = el.getAttribute('data-suffix') || '';
        if (prefersReducedMotion) {
            el.textContent = target + suffix;
            return;
        }
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const dur = 1200;
                    const start = performance.now();
                    const tick = (now) => {
                        const p = Math.min((now - start) / dur, 1);
                        const eased = 1 - Math.pow(1 - p, 3);
                        el.textContent = Math.round(eased * target) + suffix;
                        if (p < 1) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                    obs.unobserve(el);
                }
            });
        }, { threshold: 0.5 });
        obs.observe(el);
    });

})();
