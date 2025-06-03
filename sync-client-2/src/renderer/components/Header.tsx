import React from 'react';
import '../styles/Header.css';

const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="logo">
        <span className="icon">🔄</span>
        <h1>File Sync Client</h1>
      </div>
      <div className="app-controls">
        <button className="settings-btn">⚙️ Settings</button>
      </div>
    </header>
  );
};

export default Header; 