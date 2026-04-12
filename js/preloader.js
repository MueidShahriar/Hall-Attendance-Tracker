const setViewportHeight = () => {
    const height = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight;
    document.documentElement.style.setProperty('--app-height', `${height}px`);
};

setViewportHeight();
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', setViewportHeight);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setViewportHeight);
    window.visualViewport.addEventListener('scroll', setViewportHeight);
}

const loadPreloader = () => {
    const placeholder = document.getElementById("preloader-placeholder");
    if (placeholder) {
        const pathPrefix = window.location.pathname.includes('/pages/') ? '../' : '';

        const applyAssetPrefix = (scope) => {
            const assets = scope.querySelectorAll('[data-asset-src]');
            assets.forEach((node) => {
                const assetPath = node.getAttribute('data-asset-src');
                if (assetPath) node.setAttribute('src', pathPrefix + assetPath);
            });
        };

        if (placeholder.querySelector("#page-loader")) {
            applyAssetPrefix(placeholder);
            return;
        }

        fetch(pathPrefix + "preloader.html")
            .then(response => {
                if (!response.ok) throw new Error("Preloader not found");
                return response.text();
            })
            .then(html => {
                placeholder.innerHTML = html;
                applyAssetPrefix(placeholder);
            })
            .catch(error => {
                console.error("Error loading preloader:", error);
            });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", loadPreloader);
} else {
    loadPreloader();
}

window.addEventListener("load", function () {
    const pageLoader = document.getElementById("page-loader");
    if (pageLoader && !pageLoader.classList.contains("loaded")) {
        pageLoader.classList.add("loaded");
        setTimeout(() => {
            pageLoader.style.display = "none";
        }, 500);
    }

    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.documentElement.style.touchAction = "";
});
