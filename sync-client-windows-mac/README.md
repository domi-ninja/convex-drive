# Sync Client - Cross-Platform File Sync Application

A modern, cross-platform file synchronization client built with Electron that supports tray icon functionality and real-time sync status monitoring.

## Features

- ✅ Cross-platform GUI (Windows, macOS, Linux)
- ✅ Supports Windows and macOS
- ✅ Tray icon mode (runs in background)
- ✅ Can run as tray icon only, but can also be opened into a window
- ✅ Displays the status of file sync (currently using mock data)
- ✅ Modern, responsive UI with real-time updates
- ✅ System notifications
- ✅ Auto-refresh sync status
- ✅ Progress tracking with speed and time estimates

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

## Installation

1. Clone or download this repository
2. Navigate to the sync-client-windows-mac directory
3. Install dependencies:

```bash
npm install
```

## Development

To run the application in development mode:

```bash
npm run dev
```

To start the application normally:

```bash
npm start
```

## Building for Distribution

Build for all platforms:
```bash
npm run build-all
```

Build for Windows only:
```bash
npm run build-win
```

Build for macOS only:
```bash
npm run build-mac
```

The built applications will be available in the `dist/` directory.

## Project Structure

```
sync-client-windows-mac/
├── src/
│   ├── main.js           # Main Electron process
│   ├── preload.js        # Preload script for secure IPC
│   └── renderer/
│       ├── index.html    # Main UI
│       ├── styles.css    # Application styles
│       └── app.js        # Renderer process logic
├── assets/               # Application icons
├── package.json          # Project configuration
└── README.md            # This file
```

## Features in Detail

### Tray Icon Functionality
- Runs in system tray on all platforms
- Right-click context menu with sync status and controls
- Click to show/hide main window
- Continues running when main window is closed

### Sync Status Display
- Real-time progress tracking
- Files synced counter with progress bar
- Sync speed and time remaining estimates
- Last sync timestamp
- Visual status indicators (syncing, paused, error, complete)

### User Interface
- Modern, card-based design
- Responsive layout that works on different screen sizes
- Smooth animations and transitions
- System-native fonts and styling
- Toast notifications for user feedback

### Controls
- Pause/Resume sync functionality
- Open sync folder
- Refresh status manually
- Minimize to tray

## Configuration

### Icons
Place the following icon files in the `assets/` directory:
- `icon.png` - Main application icon (256x256 px recommended)
- `tray-icon.png` - Tray icon for macOS/Linux (16x16 or 22x22 px)
- `tray-icon.ico` - Tray icon for Windows (16x16 px)

### Mock Data
Currently, the application uses mock sync data. To integrate with a real sync service:

1. Modify the IPC handlers in `src/main.js`
2. Replace mock data with actual sync status from your service
3. Implement real sync control functionality

## Platform-Specific Notes

### Windows
- Uses `.ico` format for tray icon
- Builds to NSIS installer
- Supports Windows 10 and later

### macOS
- Uses `.png` format for tray icon
- Builds to DMG package
- Supports macOS 10.14 and later
- Properly handles dock hide/show behavior

### Linux
- Uses `.png` format for tray icon
- AppImage format for distribution
- Tested on Ubuntu and other major distributions

## Troubleshooting

### Tray Icon Not Showing
- Ensure icon files exist in the `assets/` directory
- Check if system tray is enabled in your OS
- Try running with `npm run dev` to see console errors

### Build Issues
- Make sure you have the latest version of electron-builder
- Check Node.js version compatibility
- For macOS builds on non-Mac systems, additional setup may be required

## Development Notes

- The application follows Electron security best practices
- Uses context isolation and disabled node integration
- IPC communication is handled through preload scripts
- No classes are used in the codebase (following project guidelines)

## License

MIT License - see LICENSE file for details