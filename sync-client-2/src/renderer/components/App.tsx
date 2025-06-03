import React, { useEffect, useState } from 'react';
import '../styles/App.css';
import FileList from './FileList';
import Header from './Header';
import SyncStatus from './SyncStatus';

// Define the sync data interface
interface SyncData {
  status: 'syncing' | 'complete' | 'error';
  filesTotal: number;
  filesProcessed: number;
  currentFile: string;
  speed: string;
  timeRemaining: string;
  lastSync: string;
}

// Access the Electron API exposed in preload.js
declare global {
  interface Window {
    api: {
      getSyncStatus: () => void;
      onSyncUpdate: (callback: (data: SyncData) => void) => void;
    };
  }
}

const App: React.FC = () => {
  const [syncData, setSyncData] = useState<SyncData>({
    status: 'syncing',
    filesTotal: 0,
    filesProcessed: 0,
    currentFile: '',
    speed: '0 KB/s',
    timeRemaining: '0:00',
    lastSync: new Date().toISOString()
  });

  useEffect(() => {
    // Request initial sync status
    window.api.getSyncStatus();

    // Listen for sync updates
    window.api.onSyncUpdate((data) => {
      setSyncData(data);
    });

    // Set up periodic refresh
    const intervalId = setInterval(() => {
      window.api.getSyncStatus();
    }, 5000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="app">
      <Header />
      <main className="app-content">
        <SyncStatus data={syncData} />
        <FileList currentFile={syncData.currentFile} />
      </main>
      <footer className="app-footer">
        <p>Last synced: {new Date(syncData.lastSync).toLocaleString()}</p>
      </footer>
    </div>
  );
};

export default App; 