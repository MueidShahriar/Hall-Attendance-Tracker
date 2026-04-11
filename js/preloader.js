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
            })
            .catch(error => {
                console.error("Error loading preloader:", error);
            });
    }
});
