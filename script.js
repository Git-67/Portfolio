/* Native anchors and the device theme remain usable without JavaScript. */
// Browsers may restore a focused link or section when reloading. Keep its focus
// and scroll position, but wait for user input before displaying its focus ring.
if (window.performance?.getEntriesByType('navigation')[0]?.type === 'reload') {
    document.documentElement.dataset.reloadFocus = 'true';
}

function restoreFocusIndicator() {
    delete document.documentElement.dataset.reloadFocus;
}

// Capture runs before the Tab default action or any keyboard-driven focus move.
document.addEventListener('keydown', restoreFocusIndicator, { capture: true, once: true });
document.addEventListener('pointerdown', restoreFocusIndicator, { capture: true, once: true });

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-navigation');
const header = document.querySelector('.site-header');
const themeButton = document.querySelector('.theme-toggle');
const sunIcon = document.querySelector('.theme-sun');
const moonIcon = document.querySelector('.theme-moon');
const mobileLayout = window.matchMedia('(max-width: 1023px)');
const deviceTheme = window.matchMedia('(prefers-color-scheme: dark)');
const sectionLinks = [...header.querySelectorAll('a[href^="#"]')];
const sections = sectionLinks.map((link) => document.getElementById(link.hash.slice(1)));
let themeOverride = null;
const themePreferenceKey = 'portfolio.theme';
function restoreThemePreference() {
    try {
        const preference = sessionStorage.getItem(themePreferenceKey);
        themeOverride = preference === 'dark' || preference === 'light' ? preference : null;
    } catch {
        // The toggle still works for this page when browser storage is blocked.
    }
    syncTheme();
}
let scrollFrame = null;
let preferredSection = null;

function isMenuOpen() {
    return mobileLayout.matches && menuButton.getAttribute('aria-expanded') === 'true';
}

function setMenuOpen(open) {
    const expanded = mobileLayout.matches && open;
    menuButton.setAttribute('aria-expanded', String(expanded));
    menuButton.setAttribute('aria-label', expanded ? 'Close menu' : 'Open menu');
    navigation.hidden = mobileLayout.matches && !expanded;
}

function closeMenu() {
    // Never leave focus inside a panel that is about to be hidden.
    if (navigation.contains(document.activeElement)) {
        menuButton.focus({ preventScroll: true });
    }
    setMenuOpen(false);
}

function syncLayout() {
    const focused = document.activeElement;
    menuButton.hidden = !mobileLayout.matches;
    if (mobileLayout.matches && navigation.contains(focused)) {
        menuButton.focus({ preventScroll: true });
    }
    setMenuOpen(false);
    if (!mobileLayout.matches && focused === menuButton) {
        navigation.querySelector('a').focus({ preventScroll: true });
    }
    updateHeaderHeight();
}

menuButton.addEventListener('click', () => setMenuOpen(!isMenuOpen()));

document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    // Preserve modified clicks and the browser's open-in-new-tab behavior.
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    if (isMenuOpen()) closeMenu();
    preferredSection = target;
    target.focus({ preventScroll: true });
    scheduleSectionUpdate();
    // Native anchors handle hashes, history and reduced-motion scrolling.
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isMenuOpen()) {
        event.preventDefault();
        closeMenu();
        menuButton.focus({ preventScroll: true });
    }
});

document.addEventListener('click', (event) => {
    if (isMenuOpen() && !header.contains(event.target)) closeMenu();
});

header.addEventListener('focusout', (event) => {
    if (isMenuOpen() && !header.contains(event.relatedTarget)) setMenuOpen(false);
});

/* Follow the device until the visitor chooses another theme in this tab. */
function syncTheme() {
    const dark = themeOverride === null ? deviceTheme.matches : themeOverride === 'dark';
    if (themeOverride === null) {
        delete document.documentElement.dataset.theme;
    } else {
        document.documentElement.dataset.theme = themeOverride;
    }
    const action = dark ? 'Switch to light mode' : 'Switch to dark mode';
    // Show the destination theme: sun offers light mode, moon offers dark mode.
    sunIcon.hidden = !dark;
    moonIcon.hidden = dark;
    themeButton.setAttribute('aria-label', `Theme: ${dark ? 'Dark' : 'Light'}. ${action}`);
    themeButton.title = action;
}

themeButton.addEventListener('click', () => {
    const dark = themeOverride === null ? deviceTheme.matches : themeOverride === 'dark';
    const next = dark ? 'light' : 'dark';
    themeOverride = next === (deviceTheme.matches ? 'dark' : 'light') ? null : next;
    try {
        if (themeOverride) sessionStorage.setItem(themePreferenceKey, themeOverride);
        else sessionStorage.removeItem(themePreferenceKey);
    } catch {
        // Keep the in-memory choice if this tab cannot save preferences.
    }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (document.startViewTransition && !motion.matches) {
        document.startViewTransition(syncTheme);
    } else syncTheme();
});

/* Track section boundaries during manual scrolling as well as link navigation.
 * Separate policy pages have no same-page section links to highlight.
 */
function updateCurrentSection() {
    scrollFrame = null;
    const readingLine = header.getBoundingClientRect().bottom + 25;
    const candidates = sections.filter((section) => {
        if (!section) return false;
        const bounds = section.getBoundingClientRect();
        return bounds.top <= readingLine && bounds.bottom > readingLine;
    });
    // About and Skills share a desktop row. Honor an explicit link selection
    // while both panels intersect the reading line; scrolling still updates it.
    // The last section can be shorter than the viewport, below the reading line.
    const atEnd = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const current = atEnd ? sections.find(section => section?.id === 'contact') :
        candidates.includes(preferredSection) ? preferredSection : candidates[0];
    sectionLinks.forEach((link, index) => {
        if (current && sections[index] === current) {
            link.setAttribute('aria-current', 'location');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

function scheduleSectionUpdate() {
    if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateCurrentSection);
}

function syncHashSection() {
    // Hashes are untrusted text; malformed encoding must not break navigation.
    try {
        preferredSection = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    } catch {
        preferredSection = null;
    }
    scheduleSectionUpdate();
}

function updateHeaderHeight() {
    document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    scheduleSectionUpdate();
}

header.dataset.enhanced = 'true';
mobileLayout.addEventListener('change', syncLayout);
deviceTheme.addEventListener('change', syncTheme);
window.addEventListener('scroll', scheduleSectionUpdate, { passive: true });
window.addEventListener('resize', updateHeaderHeight);
window.addEventListener('hashchange', syncHashSection);
window.addEventListener('pageshow', () => {
    restoreThemePreference();
    scheduleSectionUpdate();
});
restoreThemePreference();
themeButton.hidden = false;
syncLayout();
syncHashSection();

// The overlay panel does not change header height, keeping anchor offsets stable.
if ('ResizeObserver' in window) {
    new ResizeObserver(updateHeaderHeight).observe(header);
}

// Only horizontal gestures belong to slides. Vertical wheel input scrolls the page.
function carouselWheelDelta(event) {
    if (event.ctrlKey || event.metaKey || !event.cancelable) return 0;
    if (event.shiftKey) return event.deltaX || event.deltaY;
    return Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
}

/* Each layered carousel keeps its own controls, progress and idle timer. */
document.querySelectorAll('.toolkit-carousel').forEach((carousel) => {
    const track = carousel.querySelector('.toolkit-track');
    const slides = [...track.querySelectorAll('.toolkit-slide')];
    const dots = [...carousel.querySelectorAll('.toolkit-dot')];
    const previous = carousel.querySelector('.toolkit-previous');
    const next = carousel.querySelector('.toolkit-next');
    const panel = carousel.closest('.info-panel');
    const status = carousel.querySelector('.toolkit-status');
    // Keep links with their slides without JS. Enhanced certificates share an action row.
    const actionRow = carousel.querySelector('.certificate-actions');
    const certificateLinks = actionRow ? slides.map(slide => slide.querySelector('a.button')) : [];
    if (actionRow) actionRow.append(...certificateLinks);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const duration = 7000;
    let active = 0;
    let elapsed = 0;
    let frame = null;
    let lastTime = null;
    let visible = false;
    let interactionUntil = 0;
    let resumeTimer = null;
    let touchStart = null;
    let hovering = false;

    function canCycle() {
        return visible && !document.hidden && !motion.matches && !hovering && !touchStart &&
            !carousel.contains(document.activeElement) &&
            performance.now() >= interactionUntil;
    }

    function paintProgress() {
        const progress = Math.max(0, Math.min(1, elapsed / duration));
        // Smoothstep eases the fill while keeping it tied to the paused timer.
        const eased = progress * progress * (3 - 2 * progress);
        carousel.style.setProperty('--toolkit-progress', String(eased));
    }

    function alignArrows() {
        const image = slides[active].querySelector('.toolkit-image');
        // Offset geometry is independent of the image's entry transform.
        carousel.style.setProperty('--toolkit-image-center', (track.offsetTop + slides[active].offsetTop + image.offsetTop + image.offsetHeight / 2) + 'px');
    }

    function render(announce) {
        const before = (active - 1 + slides.length) % slides.length;
        const after = (active + 1) % slides.length;
        slides.forEach((slide, index) => {
            slide.classList.toggle('is-active', index === active);
            slide.classList.toggle('is-before', index === before);
            slide.classList.toggle('is-after', index === after);
            slide.setAttribute('aria-hidden', String(index !== active));
            slide.inert = index !== active;
        });
        dots.forEach((dot, index) => {
            dot.tabIndex = index === active ? 0 : -1;
            if (index === active) dot.setAttribute('aria-current', 'true');
            else dot.removeAttribute('aria-current');
        });
        certificateLinks.forEach((link, index) => { link.hidden = index !== active; });
        if (announce) status.textContent = (active + 1) + ' of ' + slides.length + ': ' + slides[active].querySelector('h2, h3, h4').textContent;
        alignArrows();
        paintProgress();
    }

    function goTo(index, announce = true) {
        const focusedDot = dots.includes(document.activeElement);
        // Keep keyboard focus in the carousel when its current link becomes inert.
        if (slides[active].contains(document.activeElement) || actionRow?.contains(document.activeElement)) {
            track.focus({ preventScroll: true });
        }
        active = (index + slides.length) % slides.length;
        elapsed = 0;
        lastTime = null;
        render(announce);
        if (focusedDot) dots[active].focus({ preventScroll: true });
    }

    function tick(now) {
        frame = null;
        if (!canCycle()) { lastTime = null; return; }
        if (lastTime !== null) elapsed += now - lastTime;
        lastTime = now;
        // Advance to the next photograph and dot on the right.
        if (elapsed >= duration) goTo(active + 1, false);
        paintProgress();
        frame = requestAnimationFrame(tick);
    }

    function syncTimer() {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        lastTime = null;
        clearTimeout(resumeTimer);
        resumeTimer = null;
        const remainingPause = interactionUntil - performance.now();
        if (remainingPause > 0) resumeTimer = setTimeout(syncTimer, remainingPause);
        if (canCycle()) frame = requestAnimationFrame(tick);
    }

    dots.forEach((dot, index) => dot.addEventListener('click', () => goTo(index)));
    previous.addEventListener('click', () => goTo(active - 1));
    next.addEventListener('click', () => goTo(active + 1));

    carousel.addEventListener('pointerenter', event => {
        hovering = event.pointerType === 'mouse';
        syncTimer();
    });
    carousel.addEventListener('pointerleave', () => { hovering = false; syncTimer(); });
    carousel.addEventListener('keydown', (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const destinations = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: slides.length - 1 };
        if (!Object.hasOwn(destinations, event.key)) return;
        event.preventDefault();
        goTo(destinations[event.key]);
    });
    // Every interaction restarts a full minute of quiet, including blank panel clicks.
    function pauseForInteraction() {
        interactionUntil = performance.now() + 60000;
        syncTimer();
    }
    panel.addEventListener('pointerdown', pauseForInteraction, { capture: true });
    panel.addEventListener('click', pauseForInteraction, { capture: true });
    panel.addEventListener('keydown', pauseForInteraction, { capture: true });
    panel.addEventListener('focusin', pauseForInteraction);
    panel.addEventListener('focusout', pauseForInteraction);
    panel.addEventListener('wheel', pauseForInteraction, { passive: true });
    // Normalize mouse wheels and trackpads; one deliberate gesture changes a slide.
    let wheelTotal = 0;
    let lastWheelTime = -Infinity;
    let lastWheelChange = -Infinity;
    carousel.addEventListener('wheel', (event) => {
        const rawDelta = carouselWheelDelta(event);
        if (!rawDelta) return;
        event.preventDefault();
        pauseForInteraction();
        const now = performance.now();
        if (now - lastWheelTime > 180 || Math.sign(rawDelta) !== Math.sign(wheelTotal)) wheelTotal = 0;
        lastWheelTime = now;
        if (now - lastWheelChange < 500) return;
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientHeight : 1;
        wheelTotal += rawDelta * unit;
        if (Math.abs(wheelTotal) < 40) return;
        goTo(active + Math.sign(wheelTotal));
        wheelTotal = 0;
        lastWheelChange = now;
    }, { passive: false });
    track.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'touch' || event.target.closest('a, button')) return;
        touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
        track.setPointerCapture(event.pointerId);
        syncTimer();
    });
    function finishTouch(event) {
        if (!touchStart || touchStart.id !== event.pointerId) return;
        const dx = event.clientX - touchStart.x;
        const dy = event.clientY - touchStart.y;
        if (event.type === 'pointerup' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(active + (dx < 0 ? 1 : -1));
        touchStart = null;
        syncTimer();
    }
    track.addEventListener('pointerup', finishTouch);
    track.addEventListener('pointercancel', finishTouch);
    track.addEventListener('lostpointercapture', finishTouch);
    document.addEventListener('visibilitychange', syncTimer);
    motion.addEventListener('change', syncTimer);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
            syncTimer();
        }, { threshold: [0, 0.5] }).observe(carousel);
    }
    if ('ResizeObserver' in window) new ResizeObserver(alignArrows).observe(track);
    carousel.dataset.enhanced = 'true';
    previous.hidden = false;
    next.hidden = false;

    carousel.querySelector('.toolkit-pagination').hidden = false;
    render(false);
    syncTimer();
});


/* Manual project slideshow. Without JS, published projects remain a readable list. */
document.querySelectorAll('.project-slideshow').forEach((carousel) => {
    const viewport = carousel.querySelector('.project-slides');
    const section = carousel.closest('#experiences') || carousel.closest('section');
    const controls = section.querySelector('.slideshow-controls');
    const status = carousel.querySelector('.slideshow-status');
    const previous = controls.querySelector('[data-slide-previous]');
    const next = controls.querySelector('[data-slide-next]');
    const countLabel = section.querySelector('.count-label');
    let slides = [];
    let activeIndex = 0;
    let touchStart = null;

    function showSlide(index) {
        if (!slides.length) return;
        const direction = Math.sign(index - activeIndex);
        const outgoing = slides[activeIndex];
        activeIndex = (index + slides.length) % slides.length;
        const incoming = slides[activeIndex];
        const animatePair = viewport.id === 'project-slides' && incoming !== outgoing &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        slides.forEach((slide, position) => {
            slide.getAnimations().forEach(animation => { animation.onfinish = null; animation.cancel(); });
            slide.hidden = slide !== incoming && !(animatePair && slide === outgoing);
            slide.inert = slide !== incoming;
            slide.setAttribute('aria-roledescription', 'slide');
            slide.setAttribute('aria-label', `${position + 1} of ${slides.length}`);
        });
        if (animatePair) {
            const timing = { duration: 540, easing: 'cubic-bezier(.4,0,.2,1)' };
            const frame = (x, scale, offset) => ({
                transform: 'translateX(' + x * direction + '%) scale(' + scale + ')', offset
            });
            const exit = outgoing.animate([
                frame(0, 1, 0), frame(-4, .94, .2), frame(-100, .94, 1)
            ], timing);
            incoming.animate([
                frame(100, .94, 0), frame(96, .94, .2), frame(4, .94, .8), frame(0, 1, 1)
            ], timing);
            exit.onfinish = () => { outgoing.hidden = true; };
        }
        status.textContent = `${activeIndex + 1} / ${slides.length} · ${slides[activeIndex].querySelector('h3, h4').textContent}`;
    }

    function refreshSlides() {
        slides = [...viewport.querySelectorAll('.project-slide')];
        const empty = viewport.querySelector('[data-project-empty]');
        if (empty) empty.hidden = slides.length > 0;
        controls.hidden = slides.length < 2;
        if (slides.length > 1) {
            carousel.setAttribute('tabindex', '0');
        } else {
            carousel.removeAttribute('tabindex');
        }
        countLabel.textContent = slides.length ? `${String(slides.length).padStart(2, '0')} published` : 'Coming soon';
        carousel.setAttribute('aria-roledescription', slides.length > 1 ? 'carousel' : 'region');
        status.textContent = '';
        showSlide(0);
    }

    previous.addEventListener('click', () => showSlide(activeIndex - 1));
    next.addEventListener('click', () => showSlide(activeIndex + 1));
    if (viewport.id === 'project-slides') {
        let distance = 0;
        let lastEvent = -Infinity;
        let nextAllowed = 0;
        viewport.addEventListener('wheel', event => {
            if (slides.length < 2) return;
            const delta = carouselWheelDelta(event);
            if (!delta) return;
            event.preventDefault();
            const now = performance.now();
            if (now - lastEvent > 180 || delta * distance < 0) distance = 0;
            lastEvent = now;
            if (now < nextAllowed) return;
            const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
            distance += delta * unit;
            if (Math.abs(distance) < 40) return;
            showSlide(activeIndex + Math.sign(distance));
            distance = 0;
            nextAllowed = now + 540;
        }, { passive: false });
    }
    carousel.addEventListener('keydown', (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (slides.length < 2 || event.target.closest('a, input, textarea, select')) return;
        const actions = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: slides.length - 1 };
        if (!Object.hasOwn(actions, event.key)) return;
        event.preventDefault();
        showSlide(actions[event.key]);
    });

    // Touch-only swipe support leaves vertical page scrolling and links intact.
    viewport.addEventListener('pointerdown', (event) => {
        touchStart = event.pointerType === 'touch' && !event.target.closest('a, button')
            ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null;
    });
    viewport.addEventListener('pointerup', (event) => {
        if (!touchStart || event.pointerId !== touchStart.id) return;
        const dx = event.clientX - touchStart.x;
        const dy = event.clientY - touchStart.y;
        touchStart = null;
        if (slides.length > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            showSlide(activeIndex + (dx < 0 ? 1 : -1));
        }
    });
    viewport.addEventListener('pointercancel', () => { touchStart = null; });
    refreshSlides();
});

/* One-shot terminal intro. The full heading remains accessible throughout;
 * input skips the sequence before focus can land on an invisible control.
 */
(() => {
    const title = document.querySelector('#home-title');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!title || motion.matches || (location.hash && location.hash !== '#home')) return;
    const original = title.textContent;
    const characters = Array.from(original);
    const reserve = document.createElement('span');
    reserve.className = 'typing-reserve';
    reserve.textContent = original;
    reserve.setAttribute('aria-hidden', 'true');
    const output = document.createElement('span');
    output.className = 'typing-output';
    output.setAttribute('aria-hidden', 'true');
    title.setAttribute('aria-label', original);
    title.replaceChildren(reserve, output);
    document.body.dataset.intro = 'typing';
    let timer;
    let position = 0;
    function finish() {
        clearTimeout(timer);
        output.textContent = original;
        document.body.dataset.intro = 'ready';
        document.removeEventListener('keydown', finish, true);
        document.removeEventListener('pointerdown', finish, true);
        motion.removeEventListener('change', finish);
        window.removeEventListener('resize', finish);
    }
    function stage(name, delay, next) {
        document.body.dataset.intro = name;
        timer = setTimeout(next, delay);
    }
    function typeNext() {
        output.textContent = characters.slice(0, ++position).join('');
        if (position >= characters.length) {
            stage('expanding', 290, () => stage('revealing', 170,
                () => stage('moving', 350, () => stage('portrait', 280, finish))));
        }
        else timer = setTimeout(typeNext, 18);
    }
    document.addEventListener('keydown', finish, true);
    document.addEventListener('pointerdown', finish, true);
    motion.addEventListener('change', finish);
    window.addEventListener('resize', finish);
    timer = setTimeout(typeNext, 100);
})();

/* Anchor the portrait below the actual wrapped title, including font/zoom changes. */
(() => {
    const stage = document.querySelector('.hero-stage');
    const title = document.querySelector('#home-title');
    const terminal = document.querySelector('.hero-copy');
    if (!stage || !title || !terminal) return;
    function alignPortrait() {
        stage.style.setProperty('--portrait-top',
            (terminal.offsetTop + title.offsetTop + title.offsetHeight + 8) + 'px');
    }
    alignPortrait();
    if ('ResizeObserver' in window) new ResizeObserver(alignPortrait).observe(title);
    window.addEventListener('resize', alignPortrait);
    document.fonts?.ready.then(alignPortrait);
})();

/* Hide the hint on scroll, including restored scroll positions and anchor jumps. */
(() => {
    const hint = document.querySelector('.scroll-hint');
    if (!hint) return;
    function syncHint() {
        hint.classList.toggle('is-scrolled', document.body.hasAttribute('data-fixed-landing') && window.scrollY > 24);
    }
    syncHint();
    window.addEventListener('scroll', syncHint, { passive: true });
    window.addEventListener('resize', syncHint);
    window.addEventListener('pageshow', syncHint);
})();

/* Fine-pointer parallax is capped and frame-batched; touch/reduced motion stay still. */
(() => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const windows = [...hero.querySelectorAll('.hero-copy, .satellite-window')];
    const enabled = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let frame = null;
    let x = 0;
    let y = 0;
    function paint() {
        frame = null;
        windows.forEach((element, index) => {
            const depth = [6, 13, 10][index] || 6;
            element.style.setProperty('--window-shift', (x * depth) + 'px ' + (y * depth) + 'px');
        });
    }
    function reset() {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        x = y = 0;
        windows.forEach(element => {
            element.style.removeProperty('--window-shift');
        });
    }
    window.addEventListener('pointermove', event => {
        if (!enabled.matches || event.pointerType !== 'mouse') return;
        if (document.body.dataset.intro && document.body.dataset.intro !== 'ready') return;
        // Normalize against the viewport, including the header and outer gutters.
        const bounds = hero.getBoundingClientRect();
        if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) { reset(); return; }
        x = Math.max(-1, Math.min(1, event.clientX / window.innerWidth * 2 - 1));
        y = Math.max(-1, Math.min(1, event.clientY / window.innerHeight * 2 - 1));
        if (frame === null) frame = requestAnimationFrame(paint);
    });
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('scroll', reset, { passive: true });
    enabled.addEventListener('change', reset);
})();

/* Count up once when terminal details appear. The accessible label stays stable. */
(() => {
    const value = document.querySelector('.token-value');
    if (!value) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let started = false, frame = null;
    const observer = new MutationObserver(start);
    function finish() {
        if (frame !== null) cancelAnimationFrame(frame);
        value.textContent = '2,048';
        observer.disconnect();
    }
    function start() {
        if (started) return;
        const state = document.body.dataset.intro;
        if (state === 'typing' || state === 'expanding') { value.textContent = '0'; return; }
        started = true;
        observer.disconnect();
        if (motion.matches) { finish(); return; }
        let began;
        function tick(now) {
            if (began === undefined) began = now;
            const progress = Math.min(1, (now - began) / 650);
            value.textContent = Math.round(2048 * (1 - (1 - progress) ** 3)).toLocaleString('en-US');
            if (progress < 1) frame = requestAnimationFrame(tick);
            else finish();
        }
        frame = requestAnimationFrame(tick);
    }
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-intro'] });
    motion.addEventListener('change', () => { if (motion.matches) finish(); });
    start();
})();


/* Hide the entire window if it crosses the first viewport's document boundary.
 * Visibility preserves layout, allowing windows to reappear after resizing.
 */
(() => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const windows = [...hero.querySelectorAll('.hero-copy, .satellite-window')];
    let frame = null;
    function check() {
        frame = null;
        const height = parseFloat(getComputedStyle(document.body, '::before').height) || window.innerHeight;
        const width = document.documentElement.clientWidth;
        windows.forEach(element => {
            const box = element.getBoundingClientRect();
            const fixed = document.body.hasAttribute('data-fixed-landing');
            const top = box.top + (fixed ? 0 : window.scrollY);
            const bottom = box.bottom + (fixed ? 0 : window.scrollY);
            const flowingIntro = element.classList.contains('hero-copy') && document.body.hasAttribute('data-flow-landing');
            const outside = !flowingIntro && (top < 0 || bottom > height || box.left < 0 || box.right > width);
            if (outside && element.contains(document.activeElement)) document.querySelector('#home').focus({ preventScroll: true });
            element.classList.toggle('window-outside', outside);
            element.inert = outside;
        });
    }
    function schedule() { if (frame === null) frame = requestAnimationFrame(check); }
    if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(schedule);
        windows.forEach(element => observer.observe(element));
        observer.observe(hero);
    }
    hero.addEventListener('transitionend', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('pointermove', schedule, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    document.fonts?.ready.then(schedule);
    schedule();
})();

/* Animate entries once on arrival; content stays visible without JS or motion. */
(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || !('IntersectionObserver' in window)) return;
    const elements = document.querySelectorAll('main section:not(.hero) h2, main section:not(.hero) h3, main section:not(.hero) p, .toolkit-image, .toolkit-badges li, .contact-buttons a, .project-marker, .policy-article');
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            if (!motion.matches) entry.target.classList.add('scroll-enter');
            observer.unobserve(entry.target);
        }
    }, { threshold: 0.12 });
    elements.forEach(element => {
        if (!element.closest('.toolkit-carousel, .education-timeline, #project-slides')) observer.observe(element);
    });
})();

/* Draw the education journey downward once it enters view, including anchor loads. */
(() => {
    const timeline = document.querySelector('.education-timeline');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!timeline || motion.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        if (!motion.matches) timeline.classList.add('is-revealing');
        observer.disconnect();
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    observer.observe(timeline);
})();

/* Preserve a real home anchor and natural space, without a click-blocking layer.
 * Covered links leave the tab order and return when revealed by scrolling up.
 */
(() => {
    const hero = document.querySelector('.hero');
    const slot = document.querySelector('.landing-slot');
    const content = document.querySelector('.page-content');
    if (!hero || !slot || !content) return;
    const links = [...hero.querySelectorAll('a, button')];
    let frame = null;
    function update() {
        frame = null;
        const fits = hero.offsetHeight <= window.innerHeight - header.offsetHeight + 1;
        document.body.toggleAttribute('data-flow-landing', !fits);
        document.body.toggleAttribute('data-fixed-landing', fits);
        slot.style.height = fits ? hero.offsetHeight + 'px' : '';
        const coverTop = content.getBoundingClientRect().top;
        links.forEach(link => {
            const covered = fits && link.getBoundingClientRect().bottom > coverTop;
            if (covered && link.contains(document.activeElement)) {
                document.querySelector('#main').focus({ preventScroll: true });
            }
            link.inert = covered;
        });
    }
    function schedule() { if (frame === null) frame = requestAnimationFrame(update); }
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(hero);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('pageshow', schedule);
    hero.addEventListener('transitionend', schedule);
    update();
})();
