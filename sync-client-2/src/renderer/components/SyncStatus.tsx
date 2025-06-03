import React from 'react';
import '../styles/SyncStatus.css';

interface SyncData {
  status: 'syncing' | 'complete' | 'error';
  filesTotal: number;
  filesProcessed: number;
  currentFile: string;
  speed: string;
  timeRemaining: string;
  lastSync: string;
}

interface SyncStatusProps {
  data: SyncData;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ data }) => {
  const progress = data.filesTotal > 0 
    ? Math.round((data.filesProcessed / data.filesTotal) * 100) 
    : 0;
  
  const getStatusDisplay = () => {
    switch (data.status) {
      case 'syncing':
        return { text: 'Syncing...', color: 'var(--sync-color)' };
      case 'complete':
        return { text: 'Sync Complete', color: 'var(--complete-color)' };
      case 'error':
        return { text: 'Sync Error', color: 'var(--error-color)' };
      default:
        return { text: 'Unknown', color: 'var(--text-color)' };
    }
  };
  
  const statusDisplay = getStatusDisplay();
  
  return (
    <div className="sync-status">
      <div className="status-header">
        <h2>Sync Status</h2>
        <span 
          className="status-indicator" 
          style={{ color: statusDisplay.color }}
        >
          {statusDisplay.text}
        </span>
      </div>
      
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="progress-text">{progress}%</div>
      </div>
      
      <div className="sync-details">
        <div className="detail-item">
          <span className="detail-label">Files:</span>
          <span className="detail-value">{data.filesProcessed} / {data.filesTotal}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Speed:</span>
          <span className="detail-value">{data.speed}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Time Remaining:</span>
          <span className="detail-value">{data.timeRemaining}</span>
        </div>
      </div>
    </div>
  );
};

export default SyncStatus; 