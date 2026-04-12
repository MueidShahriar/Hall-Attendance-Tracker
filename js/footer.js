document.addEventListener("DOMContentLoaded", function () {
    const placeholder = document.getElementById("footer-placeholder");
    if (placeholder) {
        // Adjust path based on current location
        const pathPrefix = window.location.pathname.includes('/pages/') ? '../' : '';
        const applyAssetPrefix = (scope) => {
            const assets = scope.querySelectorAll('[data-asset-src]');
            assets.forEach((node) => {
                const assetPath = node.getAttribute('data-asset-src');
                if (assetPath) node.setAttribute('src', pathPrefix + assetPath);
            });
        };

        fetch(pathPrefix + "footer.html")
            .then(response => {
                if (!response.ok) throw new Error("Footer not found");
                return response.text();
            })
            .then(html => {
                placeholder.innerHTML = html;
                applyAssetPrefix(placeholder);
            })
            .catch(error => console.error("Error loading footer:", error));
    }
});
