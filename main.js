const { app, BrowserWindow, ipcMain, Menu, clipboard, screen } = require('electron');
const path = require('path');
const os = require('os');
const { autoUpdater } = require('electron-updater'); 
const dotenv = require('dotenv');
const fs = require('fs');

const username = os.userInfo().username;

const envPath = app.isPackaged 
    ? path.join(process.resourcesPath, '.env') 
    : path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log("Environment loaded from:", envPath);
} else {
    console.error("Environment file not found at:", envPath);
}

const arcsuite = require('./Scripts/arcsuite.js');
const productQuery = require('./Scripts/productQuery.js');

/*
const sharedEnv = {
    DB_SERVER: process.env.DB_SERVER,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    ARC_HOST: process.env.ARC_HOST
};*/

const createWindow = () => {
    Menu.setApplicationMenu(null);
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('main.html');

    if(username !== 'ian_tsai'){
        win.on('blur', () => { clipboard.writeText(""); });
        win.on('minimize', () => { clipboard.writeText(""); });
    };

    win.once('ready-to-show', () => {
        autoUpdater.checkForUpdatesAndNotify();
    });
}

autoUpdater.on('update-available', () => {
    console.log('Update available. Downloading...');
});

autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded. It will be installed on restart.');
    autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater: ', err);
});

app.whenReady().then(() => {
    ipcMain.handle('username', () => { return username; });
    ipcMain.handle('get-env', () => { return sharedEnv; });

    ipcMain.handle('search-arcsuite', async (event, searchParams, type) => {
        try {
            const resultData = await arcsuite.getDocList(searchParams, type);
            return { success: true, data: resultData };
        } catch (error) {
            console.error("Search Error:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('login-arcsuite', async (event, { username, password }) => {
        try {
            const loginResult = await arcsuite.login(username, password);
            return loginResult.success ? { success: true } : { success: false, error: loginResult.error };
        } catch (error) {
            console.error("Login Error:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('product-query', async (event, drawing) => {
        try {
            const productResult = await productQuery.getProductDetail(drawing);
            if (productResult.success) {
                return { success: true, BOM: productResult.BOM, SUBS: productResult.SUBS, message: productResult.message };
            } else {
                return { success: false, BOM: [], SUBS: [], message: productResult.message || '部品表見つかりません' };
            }   
        } catch (error) {
            console.error("Product Query Error:", error);
            return { success: false, BOM: [], SUBS: [], message: error.message || 'エラーが発生しました' };
        }
    });

    ipcMain.handle('check-credentials', () => {
        return arcsuite.hasCredentials();
    });

    ipcMain.handle('get-screen-size', () => {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        
        return { width, height };
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});