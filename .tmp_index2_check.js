

        const SCENE = 'https://prod.spline.design/C1BUyPU9yQdApM7J/scene.splinecode';

        // Rotation applied per click side, in radians.
        // Left side click: +90deg, right side click: -90deg.
        const ROTATION_STEP_LEFT = Math.PI / 2;
        const ROTATION_STEP_RIGHT = -Math.PI / 2;
        const SECTION_COUNT = 4;
        const ROTATION_DURATION = 1000;
        const TARGET_NAME = 'Origin';
        const SECTION_OBJECT_NAMES = ['Section1', 'Section2', 'Section3', 'Section4'];
        const ACTIVE_SECTION_SCALE = 1;
        const INACTIVE_SECTION_SCALE = 0;
        const SECTION_BACKGROUND_COLORS = [
            { r: 25, g: 0, b: 30 },   // section 1: dark purple
            { r: 15, g: 15, b: 15 },   // section 2: dark grey
            { r: 10, g: 20, b: 40 },   // section 3: colder dark blue
            { r: 10, g: 25, b: 25 }    // section 4: darker green
        ];
        const CURSOR_SIZE = 35;
        // Shift the whole scene left in world space while keeping a full-screen canvas.
        const MODEL_OFFSET_X = -660;
        // Move the whole scene up in world space.
        const MODEL_OFFSET_Y = 300;

        const params = new URLSearchParams(window.location.search);
        const DEBUG = params.has('debug');

        function easeInOut(t) {
            return t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        const canvas = document.getElementById('spline-canvas');
        const app = new Application(canvas);
        const leftArrowCursor = `url("data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns='http://www.w3.org/2000/svg' width='${CURSOR_SIZE}' height='${CURSOR_SIZE}' viewBox='0 0 32 32'>
                <path d='M6 16L14 8V13H26V19H14V24Z' fill='black' stroke='white' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/>
            </svg>
        `)}") 16 16, pointer`;
        const rightArrowCursor = `url("data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns='http://www.w3.org/2000/svg' width='${CURSOR_SIZE}' height='${CURSOR_SIZE}' viewBox='0 0 32 32'>
                <path d='M26 16L18 8V13H6V19H18V24Z' fill='black' stroke='white' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/>
            </svg>
        `)}") 16 16, pointer`;

        const spline = {
            app,

            get(name) {
                const object = app.findObjectByName(name);
                if (!object && DEBUG) {
                    console.warn(`[spline] no object named "${name}"`);
                }
                return object;
            },

            list() {
                const objects = app.getAllObjects().map(({ name, id }) => ({ name, id }));
                console.table(objects);
                return objects;
            },

            inspect(name) {
                const object = spline.get(name);
                if (!object) {
                    return null;
                }
                console.log(JSON.stringify({
                    name: object.name,
                    position: { x: object.position.x, y: object.position.y, z: object.position.z },
                    rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z },
                    scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z },
                    visible: object.visible
                }, null, 2));
                return object;
            },

            emit(event, name) {
                app.emitEvent(event, name);
            }
        };

        window.spline = spline;

        function rotateOnClick(target) {
            const baseY = target.rotation.y;
            const content = document.getElementById('content');
            const sections = Array.from(content.querySelectorAll('[data-section-index]'));
            const sectionObjects = SECTION_OBJECT_NAMES.map((name) => spline.get(name));
            const quarterTurn = Math.PI / 2;
            content.style.setProperty('--section-duration', `${ROTATION_DURATION}ms`);
            let currentSectionIndex = sections.findIndex((section) => section.classList.contains('is-active'));
            if (currentSectionIndex < 0) {
                currentSectionIndex = 0;
            }

            // Keep an absolute target angle so rapid clicks queue smoothly.
            let targetAngle = 0;
            let fromAngle = 0;
            let currentAngle = 0;
            let startTime = null;
            let frame = null;
            let cleanupTimer = null;
            let transitionRaf1 = null;
            let transitionRaf2 = null;
            let sectionScaleFrame = null;
            let backgroundFrame = null;
            let sectionScaleValues = Array.from({ length: SECTION_COUNT }, (_, index) =>
                index === currentSectionIndex ? ACTIVE_SECTION_SCALE : INACTIVE_SECTION_SCALE
            );
            let currentBackgroundColor = { ...SECTION_BACKGROUND_COLORS[currentSectionIndex] };

            function applySectionObjectScales(scales) {
                sectionObjects.forEach((object, index) => {
                    if (!object) {
                        return;
                    }
                    const value = scales[index];
                    object.scale.x = value;
                    object.scale.y = value;
                    object.scale.z = value;
                });
            }

            function animateSectionObjectScales(nextSectionIndex) {
                if (sectionScaleFrame !== null) {
                    cancelAnimationFrame(sectionScaleFrame);
                }

                const from = sectionScaleValues.slice();
                const to = Array.from({ length: SECTION_COUNT }, (_, index) =>
                    index === nextSectionIndex ? ACTIVE_SECTION_SCALE : INACTIVE_SECTION_SCALE
                );
                let scaleStart = null;

                function scaleTick(now) {
                    if (scaleStart === null) {
                        scaleStart = now;
                    }
                    const t = Math.min((now - scaleStart) / ROTATION_DURATION, 1);
                    const eased = easeInOut(t);
                    sectionScaleValues = from.map((startValue, index) => {
                        const targetValue = to[index];
                        return startValue + (targetValue - startValue) * eased;
                    });
                    applySectionObjectScales(sectionScaleValues);

                    if (t < 1) {
                        sectionScaleFrame = requestAnimationFrame(scaleTick);
                    } else {
                        sectionScaleFrame = null;
                    }
                }

                sectionScaleFrame = requestAnimationFrame(scaleTick);
            }

            function setBackgroundColor(color) {
                document.body.style.backgroundColor = `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
                setRsvpButtonColor(color);
            }

            function brightenColor(color, amount) {
                return {
                    r: color.r + (255 - color.r) * amount,
                    g: color.g + (255 - color.g) * amount,
                    b: color.b + (255 - color.b) * amount
                };
            }

            function setRsvpButtonColor(color) {
                const brighter = brightenColor(color, 0.1);
                const rgb = `rgb(${Math.round(brighter.r)}, ${Math.round(brighter.g)}, ${Math.round(brighter.b)})`;
                document.body.style.setProperty('--rsvp-cta-color', rgb);
                document.body.style.setProperty('--button-bg-color', rgb);
            }

            function animateBackgroundColor(nextSectionIndex) {
                if (backgroundFrame !== null) {
                    cancelAnimationFrame(backgroundFrame);
                }

                const from = { ...currentBackgroundColor };
                const to = { ...SECTION_BACKGROUND_COLORS[nextSectionIndex] };
                let bgStart = null;

                function bgTick(now) {
                    if (bgStart === null) {
                        bgStart = now;
                    }
                    const t = Math.min((now - bgStart) / ROTATION_DURATION, 1);
                    const eased = easeInOut(t);
                    currentBackgroundColor = {
                        r: from.r + (to.r - from.r) * eased,
                        g: from.g + (to.g - from.g) * eased,
                        b: from.b + (to.b - from.b) * eased
                    };
                    setBackgroundColor(currentBackgroundColor);

                    if (t < 1) {
                        backgroundFrame = requestAnimationFrame(bgTick);
                    } else {
                        backgroundFrame = null;
                    }
                }

                backgroundFrame = requestAnimationFrame(bgTick);
            }

            applySectionObjectScales(sectionScaleValues);
            setBackgroundColor(currentBackgroundColor);

            function tick(now) {
                if (startTime === null) {
                    startTime = now;
                }

                const t = Math.min((now - startTime) / ROTATION_DURATION, 1);

                currentAngle = fromAngle + (targetAngle - fromAngle) * easeInOut(t);
                target.rotation.y = baseY + currentAngle;

                if (t < 1) {
                    frame = requestAnimationFrame(tick);
                } else {
                    frame = null;
                }
            }

            function normalizeSectionIndex(turns) {
                return ((turns % SECTION_COUNT) + SECTION_COUNT) % SECTION_COUNT;
            }

            function setActiveSection(sectionIndex, direction) {
                if (sectionIndex === currentSectionIndex) {
                    return;
                }

                const outgoing = sections[currentSectionIndex];
                const incoming = sections.find(
                    (section) => Number(section.dataset.sectionIndex) === sectionIndex
                );

                if (!incoming) {
                    return;
                }

                const enterClass = direction === 'clockwise' ? 'enter-from-left' : 'enter-from-right';
                const exitClass = direction === 'clockwise' ? 'exit-to-right' : 'exit-to-left';

                sections.forEach((section) => {
                    section.classList.remove(
                        'enter-from-left',
                        'enter-from-right',
                        'exit-to-left',
                        'exit-to-right',
                        'is-animating'
                    );
                });

                incoming.classList.remove('is-active');
                incoming.classList.add(enterClass);
                // Force initial enter position before activating transition.
                void incoming.offsetWidth;

                if (transitionRaf1 !== null) {
                    cancelAnimationFrame(transitionRaf1);
                }
                if (transitionRaf2 !== null) {
                    cancelAnimationFrame(transitionRaf2);
                }

                // Two RAFs ensure the browser commits the start transform first,
                // then animates toward the active state every time.
                transitionRaf1 = requestAnimationFrame(() => {
                    transitionRaf2 = requestAnimationFrame(() => {
                        if (outgoing) {
                            outgoing.classList.add('is-animating');
                            outgoing.classList.add(exitClass);
                            outgoing.classList.remove('is-active');
                        }
                        incoming.classList.add('is-animating');
                        incoming.classList.add('is-active');
                        incoming.classList.remove(enterClass);
                        transitionRaf1 = null;
                        transitionRaf2 = null;
                    });
                });

                if (cleanupTimer !== null) {
                    clearTimeout(cleanupTimer);
                }
                cleanupTimer = window.setTimeout(() => {
                    sections.forEach((section) => section.classList.remove('is-animating'));
                    cleanupTimer = null;
                }, ROTATION_DURATION + 20);

                currentSectionIndex = sectionIndex;
                animateSectionObjectScales(currentSectionIndex);
                animateBackgroundColor(currentSectionIndex);
            }

            function updateCursor(event) {
                const contentRect = content.getBoundingClientRect();
                const isInsideContent =
                    event.clientX >= contentRect.left &&
                    event.clientX <= contentRect.right &&
                    event.clientY >= contentRect.top &&
                    event.clientY <= contentRect.bottom;

                if (isInsideContent) {
                    canvas.style.cursor = '';
                    return;
                }

                const modelAreaMidX = contentRect.left / 2;
                canvas.style.cursor = event.clientX < modelAreaMidX ? leftArrowCursor : rightArrowCursor;
            }

            // Capture phase, so the click still counts if Spline handles it first.
            window.addEventListener('pointerdown', (event) => {
                const contentRect = content.getBoundingClientRect();
                const isInsideContent =
                    event.clientX >= contentRect.left &&
                    event.clientX <= contentRect.right &&
                    event.clientY >= contentRect.top &&
                    event.clientY <= contentRect.bottom;

                if (isInsideContent) {
                    return;
                }

                if (frame !== null) {
                    cancelAnimationFrame(frame);
                }

                // Split at the center of the interactive model area:
                // from viewport left edge to the start of the content panel.
                const modelAreaMidX = contentRect.left / 2;
                const step = event.clientX < modelAreaMidX ? ROTATION_STEP_LEFT : ROTATION_STEP_RIGHT;
                const direction = step < 0 ? 'clockwise' : 'counterclockwise';
                targetAngle += step;
                const turns = Math.round(targetAngle / quarterTurn);
                const sectionIndex = normalizeSectionIndex(-turns);
                setActiveSection(sectionIndex, direction);
                fromAngle = currentAngle;
                startTime = null;
                frame = requestAnimationFrame(tick);

                if (DEBUG) {
                    console.log(`[spline] click -> ${(targetAngle * 180 / Math.PI).toFixed(1)}deg section ${sectionIndex + 1}`);
                }
            }, { capture: true });

            window.addEventListener('pointermove', updateCursor, { capture: true });
            window.addEventListener('pointerleave', () => {
                canvas.style.cursor = '';
            }, { capture: true });
        }

        // ?fresh sidesteps a stale cached copy of the scene while iterating in Spline.
        const sceneUrl = params.has('fresh')
            ? `${SCENE}?t=${Date.now()}`
            : SCENE;

        app.load(sceneUrl).then(() => {
            const target = spline.get(TARGET_NAME);

            if (target) {
                target.position.x += MODEL_OFFSET_X;
                target.position.y += MODEL_OFFSET_Y;
                rotateOnClick(target);
            } else {
                console.error(`[spline] "${TARGET_NAME}" not found; click rotation is disabled.`);
            }

            if (DEBUG) {
                spline.list();
                spline.inspect(TARGET_NAME);
            }

            window.dispatchEvent(new CustomEvent('spline:ready', { detail: { app } }));
        }).catch((error) => {
            console.error('[spline] failed to load scene', error);
        });
    