import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    getSyncStatus: () => {
      ipcRenderer.send('get-sync-status');
    },
    onSyncUpdate: (callback: (data: any) => void) => {
      ipcRenderer.on('sync-update', (_, data) => callback(data));
    }
  }
); 