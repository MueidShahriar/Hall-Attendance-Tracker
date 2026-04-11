(function () {
    const preventZoom = (event) => {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
        }
    };
    window.addEventListener('wheel', preventZoom, { passive: false });
    window.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && ['+', '-', '=', '0'].includes(event.key)) {
            event.preventDefault();
        }
    });
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
        window.addEventListener(type, (event) => event.preventDefault(), { passive: false });
    });
    // Prevent pinch and double-tap zoom on mobile.
    let lastTouchEnd = 0;
    window.addEventListener('touchstart', (event) => {
        if (event.touches && event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });
    window.addEventListener('touchmove', (event) => {
        if (event.touches && event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });
    window.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
})();
