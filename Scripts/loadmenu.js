// Scripts/loadMenu.js

async function loadMenu() {
    const username = await window.electronAPI.getUser();
    
    let menuFile = 'menu.html';
    if (username === 'ian_tsai') {
        menuFile = 'menu2.html';
    }

    const response = await fetch(menuFile);
    const data = await response.text();
    document.getElementById('menu-placeholder').innerHTML = data;
}

loadMenu();
