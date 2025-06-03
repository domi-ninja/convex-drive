const { contextBridge, ipcRenderer } = require('electron');

// Log that preload script is running
console.log('Preload script is running');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
    toggleSync: () => ipcRenderer.invoke('toggle-sync'),
    openFolder: () => ipcRenderer.invoke('open-folder'),

    // Platform detection
    platform: process.platform,

    // Version info
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    }
}); 