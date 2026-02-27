// Scripts/loadMenu.js

fetch('menu.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('menu-placeholder').innerHTML = data;
    });