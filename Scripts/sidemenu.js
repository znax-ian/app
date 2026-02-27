// Scripts/menu.js

document.addEventListener("click", function (e) {
    const hamburger = document.getElementById("hamburger");
    const sideMenu = document.getElementById("sideMenu");
    const overlay = document.getElementById("menuOverlay");

    if (!hamburger || !sideMenu || !overlay) return;

    if (e.target.closest("#hamburger")) {
        hamburger.classList.toggle("active");
        sideMenu.classList.toggle("open");
        overlay.classList.toggle("show");
    }

    if (e.target === overlay) {
        hamburger.classList.remove("active");
        sideMenu.classList.remove("open");
        overlay.classList.remove("show");
    }
});

