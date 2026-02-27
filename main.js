const { app, BrowserWindow, ipcMain, Menu, clipboard } = require('electron')
const path = require('path');
const arcsuite = require('./Scripts/arcsuite.js'); // Import the function from arcsuite.js
const productQuery = require('./Scripts/productQuery.js'); // Import the function from productQuery.js

const createWindow = () => {
    //Menu.setApplicationMenu(null);
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            // Load the bridge file
            preload: path.join(__dirname, 'preload.js')
        }
    });
    win.loadFile('main.html');
    win.on('blur', () => {
    clipboard.writeText("");
    });
    win.on('minimize', () => {
    clipboard.writeText("");
    });

}

app.whenReady().then(() => {
    ipcMain.handle('search-arcsuite', async (event, searchParams, type) => {
        try {
            console.log("Main Process: Received search params", searchParams, "type:", type);
            
            // Call the function in arcsuite.js
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
            if (loginResult.success) {
                return { success: true };
            } else {
                return { success: false, error: loginResult.error };
            }
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
        }catch (error) {
            console.error("Product Query Error:", error);
            return { success: false, BOM: [], SUBS: [], message: error.message || 'エラーが発生しました' };
        }
    });

    ipcMain.handle('check-credentials', () => {
        return arcsuite.hasCredentials();
    });

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
        }
    })

})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})