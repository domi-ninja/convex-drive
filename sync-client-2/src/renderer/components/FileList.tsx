import React from 'react';
import '../styles/FileList.css';

interface FileListProps {
  currentFile: string;
}

const FileList: React.FC<FileListProps> = ({ currentFile }) => {
  // Mock data for recently synced files
  const recentFiles = [
    { name: 'document.pdf', time: '2 minutes ago', status: 'success' },
    { name: 'image.jpg', time: '5 minutes ago', status: 'success' },
    { name: 'presentation.pptx', time: '10 minutes ago', status: 'success' },
    { name: 'spreadsheet.xlsx', time: '15 minutes ago', status: 'success' },
    { name: 'notes.txt', time: '20 minutes ago', status: 'success' }
  ];

  return (
    <div className="file-list">
      <h2>File Activity</h2>
      
      {currentFile && (
        <div className="current-file">
          <h3>Currently Syncing</h3>
          <div className="file-item current">
            <span className="file-icon">📄</span>
            <span className="file-name">{currentFile}</span>
            <span className="file-status syncing">⏳</span>
          </div>
        </div>
      )}
      
      <div className="recent-files">
        <h3>Recently Synced</h3>
        {recentFiles.map((file, index) => (
          <div key={index} className="file-item">
            <span className="file-icon">📄</span>
            <span className="file-name">{file.name}</span>
            <span className="file-time">{file.time}</span>
            <span className="file-status success">✅</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList; 