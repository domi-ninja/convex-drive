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
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Load the app
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        if (!tray) {
            mainWindow.show();
        }
    });

    // Handle window close
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();

            // Show notification on first minimize to tray
            if (process.platform === 'darwin') {
                app.dock.hide();
            }
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createTray() {
    // Create tray icon
    const iconPath = process.platform === 'win32'
        ? path.join(__dirname, '../assets/tray-icon.ico')
        : path.join(__dirname, '../assets/tray-icon.png');

    const trayIcon = nativeImage.createFromPath(iconPath);
    tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

    // Create context menu
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Sync Client',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    if (process.platform === 'darwin') {
                        app.dock.show();
                    }
                } else {
                    createWindow();
                }
            }
        },
        {
            label: 'Sync Status',
            submenu: [
                { label: 'Syncing...', enabled: false },
                { label: 'Last sync: 2 minutes ago', enabled: false }
            ]
        },
        { type: 'separator' },
        {
            label: 'Preferences',
            click: () => {
                // Open preferences window
                console.log('Open preferences');
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip('Sync Client - Running in background');

    // Handle tray click
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                if (process.platform === 'darwin') {
                    app.dock.show();
                }
            }
        } else {
            createWindow();
        }
    });
}

// App event handlers
app.whenReady().then(() => {
    createTray();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
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