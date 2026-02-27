const form = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

// Listen for the submit event
form.addEventListener('submit', async function(e) {
    e.preventDefault(); // Stop page from refreshing

    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    const loginResult = await window.electronAPI.login(user, pass);

    if (loginResult.success) {
        window.location.replace("nonconformity.html"); // Redirect to main page on success
        errorMsg.style.display = 'none';
    } else {
        // Show the error message
        errorMsg.style.display = 'block';
    }
});
/*
const hamburger = document.getElementById("hamburger");
const sideMenu = document.getElementById("sideMenu");

hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    sideMenu.classList.toggle("open");
});*/

