document.addEventListener("DOMContentLoaded", function () {
    const placeholder = document.getElementById("footer-placeholder");
    if (placeholder) {
        // Adjust path based on current location
        const pathPrefix = window.location.pathname.includes('/pages/') ? '../' : '';
        fetch(pathPrefix + "footer.html")
            .then(response => {
                if (!response.ok) throw new Error("Footer not found");
                return response.text();
            })
            .then(html => {
                placeholder.innerHTML = html;
            })
            .catch(error => console.error("Error loading footer:", error));
    }
});
