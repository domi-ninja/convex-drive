import { app, BrowserWindow, ipcMain, Menu, Notification, Tray } from 'electron';
import * as isDev from 'electron-is-dev';
import * as path from 'path';

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Mock data for sync status
const mockSyncData = {
  status: 'syncing',
  filesTotal: 120,
  filesProcessed: 0,
  currentFile: '',
  speed: '0 KB/s',
  timeRemaining: '0:00',
  lastSync: new Date().toISOString()
};

// Update interval for mock data (in milliseconds)
const UPDATE_INTERVAL = 2000;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // Load the index.html file
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../renderer/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close event
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
    return true;
  });

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Sync Client', 
      click: () => {
        mainWindow?.show();
      } 
    },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('File Sync Client');
  tray.setContextMenu(contextMenu);
  
  // Show window on tray icon click (Windows/Linux)
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
}

// Mock sync update function
function updateMockSyncData() {
  if (mockSyncData.filesProcessed < mockSyncData.filesTotal) {
    mockSyncData.filesProcessed += Math.floor(Math.random() * 5) + 1;
    if (mockSyncData.filesProcessed > mockSyncData.filesTotal) {
      mockSyncData.filesProcessed = mockSyncData.filesTotal;
    }
    
    const progress = mockSyncData.filesProcessed / mockSyncData.filesTotal;
    mockSyncData.currentFile = `file_${mockSyncData.filesProcessed}.jpg`;
    mockSyncData.speed = `${Math.floor(Math.random() * 500) + 100} KB/s`;
    
    const remainingFiles = mockSyncData.filesTotal - mockSyncData.filesProcessed;
    const secondsRemaining = remainingFiles * 0.5;
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = Math.floor(secondsRemaining % 60);
    mockSyncData.timeRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (mockSyncData.filesProcessed === mockSyncData.filesTotal) {
      mockSyncData.status = 'complete';
      mockSyncData.lastSync = new Date().toISOString();
      
      // Show notification when sync is complete
      new Notification({
        title: 'Sync Complete',
        body: `Successfully synced ${mockSyncData.filesTotal} files`
      }).show();
    }
  } else if (Math.random() > 0.95) {
    // Occasionally restart the sync process
    mockSyncData.status = 'syncing';
    mockSyncData.filesProcessed = 0;
  }
  
  // Send updated data to renderer process
  if (mainWindow) {
    mainWindow.webContents.send('sync-update', mockSyncData);
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Set up periodic sync updates
  setInterval(updateMockSyncData, UPDATE_INTERVAL);
  
  app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle sync status request from renderer
ipcMain.on('get-sync-status', (event) => {
  event.reply('sync-update', mockSyncData);
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
}); 