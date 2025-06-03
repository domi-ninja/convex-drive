// DOM elements
const elements = {
    statusText: document.getElementById('status-text'),
    statusIndicator: document.getElementById('status-indicator'),
    filesSynced: document.getElementById('files-synced'),
    totalFiles: document.getElementById('total-files'),
    progressFill: document.getElementById('progress-fill'),
    syncSpeed: document.getElementById('sync-speed'),
    remainingTime: document.getElementById('remaining-time'),
    lastSyncTime: document.getElementById('last-sync-time'),
    toggleSyncBtn: document.getElementById('toggle-sync-btn'),
    openFolderBtn: document.getElementById('open-folder-btn'),
    refreshBtn: document.getElementById('refresh-btn'),
    minimizeBtn: document.getElementById('minimize-btn'),
    versionInfo: document.getElementById('version-info'),
    platformInfo: document.getElementById('platform-info')
};

// State
let currentSyncStatus = null;
let isRefreshing = false;

// Initialize the app
async function initializeApp() {
    setupEventListeners();
    await loadSyncStatus();
    updateVersionInfo();

    // Auto-refresh every 3 seconds
    setInterval(loadSyncStatus, 3000);
}

// Setup event listeners
function setupEventListeners() {
    elements.toggleSyncBtn.addEventListener('click', handleToggleSync);
    elements.openFolderBtn.addEventListener('click', handleOpenFolder);
    elements.refreshBtn.addEventListener('click', handleRefresh);
    elements.minimizeBtn.addEventListener('click', handleMinimize);
}

// Load sync status from main process
async function loadSyncStatus() {
    if (isRefreshing) return;

    try {
        const status = await window.electronAPI.getSyncStatus();
        currentSyncStatus = status;
        updateUI(status);
    } catch (error) {
        console.error('Failed to load sync status:', error);
        showError('Failed to load sync status');
    }
}

// Update UI with sync status
function updateUI(status) {
    // Update status indicator
    const statusDot = elements.statusIndicator.querySelector('.status-dot');
    const statusColors = {
        syncing: '#10b981',
        paused: '#f59e0b',
        error: '#ef4444',
        complete: '#10b981'
    };

    statusDot.style.background = statusColors[status.status] || '#64748b';
    elements.statusText.textContent = getStatusText(status.status);
    elements.statusText.style.color = statusColors[status.status] || '#64748b';

    // Update progress
    const progress = (status.filesSync / status.totalFiles) * 100;
    elements.filesSynced.textContent = status.filesSync.toLocaleString();
    elements.totalFiles.textContent = status.totalFiles.toLocaleString();
    elements.progressFill.style.width = `${progress}%`;

    // Update speed and time
    elements.syncSpeed.textContent = status.syncSpeed || 'N/A';
    elements.remainingTime.textContent = status.remainingTime || 'Unknown';

    // Update last sync time
    if (status.lastSync) {
        const lastSyncDate = new Date(status.lastSync);
        elements.lastSyncTime.textContent = getRelativeTime(lastSyncDate);
    }

    // Update toggle button
    updateToggleButton(status.status);
}

// Get status text
function getStatusText(status) {
    const statusTexts = {
        syncing: 'Syncing...',
        paused: 'Paused',
        error: 'Error',
        complete: 'Up to date'
    };
    return statusTexts[status] || 'Unknown';
}

// Update toggle button based on status
function updateToggleButton(status) {
    const button = elements.toggleSyncBtn;
    const icon = button.querySelector('i');

    if (status === 'syncing') {
        icon.className = 'fas fa-pause';
        button.innerHTML = '<i class="fas fa-pause"></i> Pause Sync';
        button.className = 'btn btn-primary';
    } else {
        icon.className = 'fas fa-play';
        button.innerHTML = '<i class="fas fa-play"></i> Resume Sync';
        button.className = 'btn btn-primary';
    }
}

// Get relative time string
function getRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

// Event handlers
async function handleToggleSync() {
    const button = elements.toggleSyncBtn;
    const originalContent = button.innerHTML;

    // Show loading state
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    button.disabled = true;

    try {
        const result = await window.electronAPI.toggleSync();
        if (result.success) {
            await loadSyncStatus(); // Refresh status
            showNotification('Sync toggled successfully', 'success');
        } else {
            showNotification('Failed to toggle sync', 'error');
        }
    } catch (error) {
        console.error('Failed to toggle sync:', error);
        showNotification('Failed to toggle sync', 'error');
    } finally {
        button.innerHTML = originalContent;
        button.disabled = false;
    }
}

async function handleOpenFolder() {
    try {
        const result = await window.electronAPI.openFolder();
        if (result.success) {
            showNotification('Opened sync folder', 'success');
        } else {
            showNotification('Failed to open folder', 'error');
        }
    } catch (error) {
        console.error('Failed to open folder:', error);
        showNotification('Failed to open folder', 'error');
    }
}

async function handleRefresh() {
    if (isRefreshing) return;

    isRefreshing = true;
    const button = elements.refreshBtn;
    const icon = button.querySelector('i');

    // Add spinning animation
    icon.classList.add('fa-spin');

    try {
        await loadSyncStatus();
        showNotification('Status refreshed', 'success');
    } catch (error) {
        showNotification('Failed to refresh status', 'error');
    } finally {
        isRefreshing = false;
        icon.classList.remove('fa-spin');
    }
}

function handleMinimize() {
    // This will close the window and minimize to tray
    window.close();
}

// Update version info
function updateVersionInfo() {
    if (window.electronAPI) {
        const versions = window.electronAPI.versions;
        const platform = window.electronAPI.platform;

        elements.versionInfo.textContent = `Electron ${versions.electron}`;
        elements.platformInfo.textContent = `Platform: ${platform}`;
    }
}

// Show notification (simple implementation)
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add styles
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 16px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '1000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px'
    });

    // Set background based on type
    const backgrounds = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    notification.style.background = backgrounds[type] || backgrounds.info;

    // Add to DOM
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Show error state
function showError(message) {
    elements.statusText.textContent = 'Error';
    elements.statusText.style.color = '#ef4444';
    showNotification(message, 'error');
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
} 