const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 400,
        show: false,
        icon: path.join(__dirname, '../assets/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.resolve(__dirname, 'preload.js')
        }
    });


    // Load the app
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        console.log('Window ready to show');
        mainWindow.webContents.openDevTools();
        mainWindow.show();
    });

    // Handle window close
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            console.log('Window hidden');

            // Show notification on first minimize to tray
            if (process.platform === 'darwin') {
                app.dock.hide();
            }
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        console.log('Window closed');
    });
}

function createTray() {
    
    const iconPath = path.join(__dirname, '../assets/icon.png');
    const icon = nativeImage.createFromPath(iconPath)

    // Create the tray
    try {
        tray = new Tray(icon);
        console.log('Tray created successfully');
    } catch (error) {
        console.error('Failed to create tray:', error);
        return;
    }

    // // Create context menu
    // const contextMenu = Menu.buildFromTemplate([
    //     {
    //         label: 'Show Sync Client',
    //         click: () => {
    //             try {
    //                 if (mainWindow) {
    //                     if (mainWindow.isMinimized()) {
    //                         mainWindow.restore();
    //                     }
    //                     mainWindow.show();
    //                     mainWindow.focus();
    //                     if (process.platform === 'darwin') {
    //                         app.dock.show();
    //                     }
    //                 } else {
    //                     createWindow();
    //                 }
    //             } catch (error) {
    //                 console.error('Error showing window:', error);
    //             }
    //         }
    //     },
    //     {
    //         label: 'Sync Status',
    //         submenu: [
    //             { label: 'Syncing...', enabled: false },
    //             { label: 'Last sync: 2 minutes ago', enabled: false }
    //         ]
    //     },
    //     { type: 'separator' },
    //     {
    //         label: 'Preferences',
    //         click: () => {
    //             // Open preferences window
    //             console.log('Open preferences');
    //         }
    //     },
    //     { type: 'separator' },
    //     {
    //         label: 'Quit',
    //         click: () => {
    //             isQuitting = true;
    //             app.quit();
    //         }
    //     }
    // ]);

    // try {
    //     tray.setContextMenu(contextMenu);
    //     tray.setToolTip('Sync Client - Running in background');
    //     console.log('Tray context menu and tooltip set');
    // } catch (error) {
    //     console.error('Error setting tray context menu:', error);
    // }

    // // Handle tray click (different behavior for Windows vs other platforms)
    // if (process.platform === 'win32') {
    //     // On Windows, use double-click for primary action
    //     tray.on('double-click', () => {
    //         try {
    //             if (mainWindow) {
    //                 if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    //                     mainWindow.hide();
    //                 } else {
    //                     if (mainWindow.isMinimized()) {
    //                         mainWindow.restore();
    //                     }
    //                     mainWindow.show();
    //                     mainWindow.focus();
    //                 }
    //             } else {
    //                 createWindow();
    //             }
    //         } catch (error) {
    //             console.error('Error handling tray double-click:', error);
    //         }
    //     });

    //     // Single click on Windows shows context menu (handled automatically)
    // } else {
    //     // On macOS/Linux, use single click
    //     tray.on('click', () => {
    //         try {
    //             if (mainWindow) {
    //                 if (mainWindow.isVisible()) {
    //                     mainWindow.hide();
    //                 } else {
    //                     mainWindow.show();
    //                     if (process.platform === 'darwin') {
    //                         app.dock.show();
    //                     }
    //                 }
    //             } else {
    //                 createWindow();
    //             }
    //         } catch (error) {
    //             console.error('Error handling tray click:', error);
    //         }
    //     });
    // }

    // // Handle tray errors
    // tray.on('error', (error) => {
    //     console.error('Tray error:', error);
    // });
}

// App event handlers
app.whenReady().then(() => {
    createTray();
    createWindow();

    // app.on('activate', () => {
    //     if (BrowserWindow.getAllWindows().length === 0) {
    //         createWindow();
    //     }
    // });
});

app.on('window-all-closed', () => {
    // Keep app running in tray even when all windows are closed
    if (process.platform !== 'darwin' && !tray) {
        app.quit();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});

// IPC handlers for renderer process
ipcMain.handle('get-sync-status', () => {
    // Mock sync data
    console.log('Get sync status requested');
    return {
        status: 'syncing',
        filesSync: 1247,
        totalFiles: 1250,
        lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        syncSpeed: '2.3 MB/s',
        remainingTime: '5 seconds'
    };
});

ipcMain.handle('toggle-sync', () => {
    // Mock toggle sync functionality
    console.log('Toggle sync requested');
    return { success: true, message: 'Sync toggled' };
});

ipcMain.handle('open-folder', () => {
    // Mock open sync folder functionality
    console.log('Open folder requested');
    return { success: true, message: 'Folder opened' };
}); 