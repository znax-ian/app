const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Defines a function 'search' that the HTML can call.
    // It sends the params to main.js and waits for the answer.
    search: (params, type) => ipcRenderer.invoke('search-arcsuite', params, type),
    login: (username, password) => ipcRenderer.invoke('login-arcsuite', { username, password }),
    productQuery: (drawing) => ipcRenderer.invoke('product-query', drawing),
    checkCredentials: () => ipcRenderer.invoke('check-credentials'),
    getUser: () => ipcRenderer.invoke('username'),
    getEnv: () => ipcRenderer.invoke('get-env')
});