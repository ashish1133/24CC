/**
 * innovation.js — PERFORMANCE-OPTIMIZED
 * Interactive & animated features for the 24CC website.
 * 
 * Perf fixes applied:
 *  - All scroll/mousemove listeners are passive
 *  - Cursor trail uses transform instead of top/left (GPU compositing)
 *  - Particle count reduced; O(n²) loop uses squared distance (no sqrt)
 *  - Gradient creation removed from particle draw loop
 *  - Card glow: caches querySelectorAll, uses throttled RAF
 *  - Filmstrip auto-scroll pauses when offscreen (IntersectionObserver)
 *  - Mobile: disables cursor, particles, tilt, parallax entirely
 *  - All interval/RAF loops properly cleaned up or gated
 */
(() => {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);

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
                if (countdownEl) countdownEl.textContent = nums[step];
                if (barFill) barFill.style.width = ((step + 1) / nums.length * 100) + '%';
            }
            if (step >= nums.length) {
                clearInterval(interval);
                loaderEl.classList.add('loaded');
                setTimeout(() => loaderEl.remove(), 900);
            }
        }, 350);
        if (barFill) barFill.style.width = '20%';
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
            width: 0%; pointer-events: none;
            will-change: width;
        `;
        const style = document.createElement('style');
        style.textContent = `@keyframes progress-gradient { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }`;
        document.head.appendChild(style);
        document.body.appendChild(progressBar);

        let progressTicking = false;
        window.addEventListener('scroll', () => {
            if (!progressTicking) {
                requestAnimationFrame(() => {
                    const scrollTop = window.scrollY;
                    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                    progressBar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
                    progressTicking = false;
                });
                progressTicking = true;
            }
        }, { passive: true });
    }

    /* ============================
       0b. Cinema Projector Cursor
       DISABLED on mobile/touch devices
       ============================ */
    if (!prefersReducedMotion && !isMobile && window.innerWidth > 768) {
        const cursorWrap = document.createElement('div');
        cursorWrap.className = 'cc-cursor';
        cursorWrap.innerHTML = '<div class="cc-cursor__ring"></div><div class="cc-cursor__dot"></div>';
        document.body.appendChild(cursorWrap);

        // Reduced trail count from 8 to 5
        const TRAIL_COUNT = 5;
        const trailDots = [];
        for (let i = 0; i < TRAIL_COUNT; i++) {
            const dot = document.createElement('div');
            dot.className = 'cc-trail-dot';
            document.body.appendChild(dot);
            trailDots.push({ el: dot, x: 0, y: 0 });
        }

        let mx = -100, my = -100;
        // Simpler trail: just lerp to cursor, no history array
        const trailPositions = [];
        for (let i = 0; i < TRAIL_COUNT; i++) {
            trailPositions.push({ x: -100, y: -100 });
        }

        document.addEventListener('mousemove', (e) => {
            mx = e.clientX;
            my = e.clientY;
        }, { passive: true });

        // Hover detection
        const INTERACTIVE = 'a, button, .card, .film-frame, .stat, .pill-list li, .craft-group, .roadmap-item, .step-card, .tool-card, input, textarea, select, .nav-link, .button, .badge-3d, .brand';

        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(INTERACTIVE)) cursorWrap.classList.add('is-hovering');
        }, { passive: true });
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest(INTERACTIVE)) cursorWrap.classList.remove('is-hovering');
        }, { passive: true });

        // Click ripple
        document.addEventListener('mousedown', () => {
            cursorWrap.classList.add('is-clicking');
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

        // Animation loop — uses transform instead of left/top for GPU compositing
        function animateCursor() {
            cursorWrap.style.transform = `translate3d(${mx}px, ${my}px, 0)`;

            // Simple lerp trail (no history array needed)
            for (let i = 0; i < TRAIL_COUNT; i++) {
                const target = i === 0 ? { x: mx, y: my } : trailPositions[i - 1];
                const pos = trailPositions[i];
                pos.x += (target.x - pos.x) * 0.3;
                pos.y += (target.y - pos.y) * 0.3;

                const dot = trailDots[i];
                const life = 1 - (i / TRAIL_COUNT);
                dot.el.style.transform = `translate3d(${pos.x - 2}px, ${pos.y - 2}px, 0) scale(${0.4 + life * 0.6})`;
                dot.el.style.opacity = life * 0.45;
            }

            requestAnimationFrame(animateCursor);
        }
        requestAnimationFrame(animateCursor);

        document.addEventListener('mouseleave', () => {
            cursorWrap.style.opacity = '0';
            trailDots.forEach(d => d.el.style.opacity = '0');
        }, { passive: true });
        document.addEventListener('mouseenter', () => {
            cursorWrap.style.opacity = '1';
        }, { passive: true });
    }

    /* ============================
       1. Particle Constellation
       DISABLED on mobile
       ============================ */
    const canvas = document.getElementById('particle-canvas');
    if (canvas && !prefersReducedMotion && !isMobile) {
        const ctx = canvas.getContext('2d');
        let w, h, particles = [];
        // Reduced from 70 to 40 particles
        const PARTICLE_COUNT = 40;
        const CONNECT_DIST = 120;
        const CONNECT_DIST_SQ = CONNECT_DIST * CONNECT_DIST; // avoid sqrt in loop
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
                    hueShift: Math.random() > 0.7
                });
            }
        };

        canvas.parentElement.addEventListener('mousemove', (e) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            mouseCanvasX = e.clientX - rect.left;
            mouseCanvasY = e.clientY - rect.top;
        }, { passive: true });
        canvas.parentElement.addEventListener('mouseleave', () => {
            mouseCanvasX = -999;
            mouseCanvasY = -999;
        }, { passive: true });

        // Pre-compute color prefixes to avoid string creation in draw loop
        const goldColor = 'rgba(240,192,64,';
        const cyanColor = 'rgba(125,249,255,';

        const draw = (time) => {
            ctx.clearRect(0, 0, w, h);
            const len = particles.length;

            // Lines — use squared distance, simple strokeStyle (no gradient per line)
            ctx.lineWidth = 0.6;
            for (let i = 0; i < len; i++) {
                const pi = particles[i];
                for (let j = i + 1; j < len; j++) {
                    const pj = particles[j];
                    const dx = pi.x - pj.x;
                    const dy = pi.y - pj.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < CONNECT_DIST_SQ) {
                        const alpha = (1 - distSq / CONNECT_DIST_SQ) * 0.18;
                        ctx.strokeStyle = goldColor + alpha + ')';
                        ctx.beginPath();
                        ctx.moveTo(pi.x, pi.y);
                        ctx.lineTo(pj.x, pj.y);
                        ctx.stroke();
                    }
                }
            }

            // Mouse connections
            if (mouseCanvasX > 0) {
                const MOUSE_DIST = 160;
                const MOUSE_DIST_SQ = MOUSE_DIST * MOUSE_DIST;
                ctx.lineWidth = 0.8;
                for (let i = 0; i < len; i++) {
                    const p = particles[i];
                    const dx = p.x - mouseCanvasX;
                    const dy = p.y - mouseCanvasY;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < MOUSE_DIST_SQ) {
                        const alpha = (1 - distSq / MOUSE_DIST_SQ) * 0.3;
                        ctx.strokeStyle = cyanColor + alpha + ')';
                        ctx.beginPath();
                        ctx.moveTo(mouseCanvasX, mouseCanvasY);
                        ctx.lineTo(p.x, p.y);
                        ctx.stroke();
                    }
                }
            }

            // Dots
            const timeFactor = time * 0.002;
            for (let i = 0; i < len; i++) {
                const p = particles[i];
                const pulse = Math.sin(timeFactor + p.pulseOffset) * 0.3 + 0.7;
                const r = p.r * pulse;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = p.hueShift
                    ? cyanColor + (p.alpha * pulse) + ')'
                    : goldColor + (p.alpha * pulse) + ')';
                ctx.fill();
            }
        };

        const update = () => {
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                if (mouseCanvasX > 0) {
                    const dx = p.x - mouseCanvasX;
                    const dy = p.y - mouseCanvasY;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 14400 && distSq > 0) { // 120²
                        const dist = Math.sqrt(distSq);
                        const force = (120 - dist) / 120 * 0.8;
                        p.vx += (dx / dist) * force * 0.05;
                        p.vy += (dy / dist) * force * 0.05;
                    }
                }
                p.vx *= 0.998;
                p.vy *= 0.998;
                const speedSq = p.vx * p.vx + p.vy * p.vy;
                if (speedSq > 2.25) { // 1.5²
                    const speed = Math.sqrt(speedSq);
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

        // Only run animation when canvas is visible
        let canvasVisible = true;
        const canvasObserver = new IntersectionObserver((entries) => {
            canvasVisible = entries[0].isIntersecting;
        }, { threshold: 0 });
        canvasObserver.observe(canvas);

        const loop = (time) => {
            if (canvasVisible) {
                update();
                draw(time);
            }
            requestAnimationFrame(loop);
        };

        resize();
        createParticles();
        requestAnimationFrame(loop);

        // Debounced resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                resize();
                createParticles();
            }, 200);
        }, { passive: true });
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
        document.querySelectorAll('.section').forEach(sec => {
            if (!sec.classList.contains('reveal')) sec.classList.add('reveal');
        });
        document.querySelectorAll('.grid-4, .grid-3, .grid-2, .stats-row, .stack').forEach(el => {
            el.classList.add('reveal-stagger');
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    if (!entry.target.classList.contains('reveal-stagger')) {
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

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
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(eased * target) + suffix;
                if (progress < 1) requestAnimationFrame(tick);
                else el.classList.add('counted');
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
        statEls.forEach(el => {
            el.textContent = (el.getAttribute('data-count') || '0') + (el.getAttribute('data-suffix') || '');
        });
    }

    /* ============================
       5. Card Mouse-Glow + 3D Tilt
       DISABLED on mobile
       ============================ */
    if (!prefersReducedMotion && !isMobile) {
        const tiltEls = document.querySelectorAll('.card, .stat, .step-card, .roadmap-item, .craft-group');

        tiltEls.forEach(el => {
            el.addEventListener('mouseenter', () => {
                el.style.transition = 'transform 0.1s ease-out, border-color 0.3s, background 0.3s, box-shadow 0.3s';
            }, { passive: true });

            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const rotateY = ((x - cx) / cx) * 6;  // reduced from 8
                const rotateX = ((cy - y) / cy) * 4;  // reduced from 6

                el.style.setProperty('--mouse-x', x + 'px');
                el.style.setProperty('--mouse-y', y + 'px');
                el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(12px)`;
            }, { passive: true });

            el.addEventListener('mouseleave', () => {
                el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s, background 0.3s, box-shadow 0.3s';
                el.style.transform = '';
            }, { passive: true });
        });

        // Card glow tracking — CACHED querySelectorAll + throttled via RAF
        const allCards = document.querySelectorAll('.card');
        let cardGlowTicking = false;
        let lastCardMouseX = 0, lastCardMouseY = 0;

        document.addEventListener('mousemove', (e) => {
            lastCardMouseX = e.clientX;
            lastCardMouseY = e.clientY;
            if (!cardGlowTicking) {
                requestAnimationFrame(() => {
                    const vh = window.innerHeight;
                    allCards.forEach(card => {
                        const rect = card.getBoundingClientRect();
                        // Only update cards near the viewport
                        if (rect.bottom > -100 && rect.top < vh + 100) {
                            card.style.setProperty('--mouse-x', (lastCardMouseX - rect.left) + 'px');
                            card.style.setProperty('--mouse-y', (lastCardMouseY - rect.top) + 'px');
                        }
                    });
                    cardGlowTicking = false;
                });
                cardGlowTicking = true;
            }
        }, { passive: true });
    }

    /* ============================
       6. 3D Parallax on Scroll
       DISABLED on mobile
       ============================ */
    if (!prefersReducedMotion && !isMobile) {
        const scenes = document.querySelectorAll('.scene-3d');
        let parallaxTicking = false;

        window.addEventListener('scroll', () => {
            if (!parallaxTicking) {
                requestAnimationFrame(() => {
                    const viewH = window.innerHeight;
                    scenes.forEach(scene => {
                        const rect = scene.getBoundingClientRect();
                        if (rect.bottom > 0 && rect.top < viewH) {
                            const progress = (viewH - rect.top) / (viewH + rect.height);
                            const clamped = Math.max(0, Math.min(1, progress));
                            const rotateX = (0.5 - clamped) * 3; // reduced from 4
                            scene.style.transform = `perspective(1200px) rotateX(${rotateX}deg)`;
                        }
                    });
                    parallaxTicking = false;
                });
                parallaxTicking = true;
            }
        }, { passive: true });
    }

    /* ============================
       7. Filmstrip Auto-Scroll
       PAUSES when offscreen (IntersectionObserver)
       ============================ */
    const filmstrips = document.querySelectorAll('.filmstrip');
    filmstrips.forEach(strip => {
        let scrollAmount = 0;
        const speed = 0.5;
        let paused = false;
        let visible = false;
        let rafId = null;

        strip.addEventListener('mouseenter', () => paused = true, { passive: true });
        strip.addEventListener('mouseleave', () => paused = false, { passive: true });

        // Only run RAF when strip is visible
        const obs = new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
            if (visible && rafId === null) startScroll();
        }, { threshold: 0 });
        obs.observe(strip);

        function startScroll() {
            function tick() {
                if (!visible) {
                    rafId = null;
                    return;
                }
                if (!paused && strip.scrollWidth > strip.clientWidth) {
                    scrollAmount += speed;
                    if (scrollAmount >= strip.scrollWidth - strip.clientWidth) {
                        scrollAmount = 0;
                    }
                    strip.scrollLeft = scrollAmount;
                }
                rafId = requestAnimationFrame(tick);
            }
            rafId = requestAnimationFrame(tick);
        }
    });

    /* ============================
       8. Magnetic Button Effect
       DISABLED on mobile
       ============================ */
    if (!prefersReducedMotion && !isMobile) {
        document.querySelectorAll('.button').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
            }, { passive: true });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            }, { passive: true });
        });
    }

    /* ============================
       9. Smooth Reveal for Text
       ============================ */
    if (!prefersReducedMotion) {
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
       10. Sprocket Animation (skip on mobile)
       ============================ */
    if (!prefersReducedMotion && !isMobile) {
        const holes = document.querySelectorAll('.sprocket-hole');
        if (holes.length) {
            const sprocketStyle = document.createElement('style');
            sprocketStyle.textContent = `
                @keyframes sprocket-glow {
                    0% { border-color: rgba(240,192,64,0.15); box-shadow: none; }
                    100% { border-color: rgba(240,192,64,0.5); box-shadow: 0 0 8px rgba(240,192,64,0.2); }
                }
            `;
            document.head.appendChild(sprocketStyle);
            holes.forEach((hole, i) => {
                hole.style.animation = `sprocket-glow 2s ease-in-out ${i * 0.12}s infinite alternate`;
            });
        }
    }

    /* ============================
       11. Smooth Page Load
       ============================ */
    if (!prefersReducedMotion) {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.5s ease';
        window.addEventListener('load', () => {
            requestAnimationFrame(() => {
                document.body.style.opacity = '1';
            });
        });
        if (document.readyState === 'complete') {
            document.body.style.opacity = '1';
        }
    }

    /* ============================
       12. Card Spotlight Tracking
       DISABLED on mobile
       ============================ */
    if (!prefersReducedMotion && !isMobile) {
        const spotlightCards = document.querySelectorAll('.card-spotlight');
        if (spotlightCards.length) {
            let spotTicking = false;
            let spotMx = 0, spotMy = 0;
            document.addEventListener('mousemove', (e) => {
                spotMx = e.clientX;
                spotMy = e.clientY;
                if (!spotTicking) {
                    requestAnimationFrame(() => {
                        const vh = window.innerHeight;
                        spotlightCards.forEach(card => {
                            const rect = card.getBoundingClientRect();
                            if (rect.bottom > 0 && rect.top < vh) {
                                card.style.setProperty('--spotlight-x', (spotMx - rect.left) + 'px');
                                card.style.setProperty('--spotlight-y', (spotMy - rect.top) + 'px');
                            }
                        });
                        spotTicking = false;
                    });
                    spotTicking = true;
                }
            }, { passive: true });
        }
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
                    document.body.style.transition = 'opacity 0.25s ease';
                    setTimeout(() => {
                        window.location.href = href;
                    }, 250);
                });
            }
        });
    }

    /* ============================
       14. Parallax Background Blobs
       DISABLED on mobile — uses throttled RAF
       ============================ */
    if (!prefersReducedMotion && !isMobile) {
        let lastScrollY = 0;
        let blobTicking = false;
        window.addEventListener('scroll', () => {
            if (!blobTicking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    if (Math.abs(scrollY - lastScrollY) > 3) {
                        document.body.style.setProperty('--parallax-shift', (scrollY * 0.02) + 'px');
                        lastScrollY = scrollY;
                    }
                    blobTicking = false;
                });
                blobTicking = true;
            }
        }, { passive: true });
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
