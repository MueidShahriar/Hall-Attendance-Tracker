document.addEventListener("DOMContentLoaded", function () {
    const placeholder = document.getElementById("preloader-placeholder");
    if (placeholder) {
        let pathPrefix = '';
        if (window.location.pathname.includes('/pages/')) {
            pathPrefix = '../';
        }

        fetch(pathPrefix + "preloader.html")
            .then(response => {
                if (!response.ok) throw new Error("Preloader not found");
                return response.text();
            })
            .then(html => {
                placeholder.innerHTML = html;
                const pageLoader = placeholder.querySelector("#page-loader");
                if (pageLoader) {
                    pageLoader.classList.add("page-loader--visible");
                }
            })
            .catch(error => {
                console.error("Error loading preloader:", error);
            });
    }
});

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
