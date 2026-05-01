import React, { useState } from 'react';
import { Settings as SettingsIcon, FolderOpen, Sun, Moon, Trash2, RefreshCw, Info, Database, Palette, HardDrive } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../components/Toast';
import '../App.css';
import './Settings.css';

function Settings() {
  const { dirHandle, selectDirectory, scanDirectory, theme, toggleTheme, books } = useLibrary();
  const { addToast } = useToast();
  const [isScanning, setIsScanning] = useState(false);

  const handleRescan = async () => {
    if (dirHandle && !isScanning) {
      setIsScanning(true);
      try {
        await scanDirectory(dirHandle);
        addToast('Library rescanned successfully', 'success');
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure? This will clear all saved book metadata and settings from this browser.')) {
      const { indexedDB } = window;
      indexedDB.deleteDatabase('ReadLibDB');
      window.location.reload();
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header fade-in">
        <h1>Settings</h1>
        <p className="page-subtitle">Manage your library and preferences</p>
      </div>

      {/* Library Folder */}
      <div className="card settings-section fade-in fade-in-delay-1">
        <div className="settings-section-header">
          <div className="settings-icon-wrap folder">
            <FolderOpen size={18} />
          </div>
          <div>
            <h3 className="settings-section-title">Library Folder</h3>
            <p className="settings-desc">
              Select the folder containing your PDF book collection.
            </p>
          </div>
        </div>
        <div className="settings-folder-info">
          {dirHandle ? (
            <div className="folder-badge">
              <HardDrive size={14} />
              <span>{dirHandle.name}</span>
              <span className="folder-badge-dot"></span>
              <span className="folder-badge-status">Connected</span>
            </div>
          ) : (
            <span className="no-folder">No folder selected</span>
          )}
        </div>
        <div className="settings-actions">
          <button className="btn btn-primary" onClick={selectDirectory} id="select-folder-btn">
            <FolderOpen size={16} /> {dirHandle ? 'Change Folder' : 'Select Folder'}
          </button>
          {dirHandle && (
            <button 
              className="btn btn-secondary" 
              onClick={handleRescan} 
              disabled={isScanning}
              id="rescan-btn"
            >
              <RefreshCw size={16} className={isScanning ? 'spin-icon' : ''} /> 
              {isScanning ? 'Scanning...' : 'Rescan'}
            </button>
          )}
        </div>
      </div>

      {/* Theme */}
      <div className="card settings-section fade-in fade-in-delay-2">
        <div className="settings-section-header">
          <div className="settings-icon-wrap theme">
            <Palette size={18} />
          </div>
          <div>
            <h3 className="settings-section-title">Appearance</h3>
            <p className="settings-desc">Toggle between dark and light themes.</p>
          </div>
        </div>
        <div className="theme-toggle-container">
          <button className="theme-toggle-btn" onClick={toggleTheme} id="theme-toggle-btn">
            <div className={`theme-toggle-track ${theme === 'light' ? 'light' : ''}`}>
              <div className="theme-toggle-thumb">
                {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
              </div>
            </div>
            <span className="theme-toggle-label">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="card settings-section fade-in fade-in-delay-3">
        <div className="settings-section-header">
          <div className="settings-icon-wrap data">
            <Database size={18} />
          </div>
          <div>
            <h3 className="settings-section-title">Data Management</h3>
            <p className="settings-desc">
              All data is stored locally in your browser using IndexedDB.
            </p>
          </div>
        </div>
        <div className="settings-data-info">
          <div className="data-stat">
            <span className="data-stat-value">{books.length}</span>
            <span className="data-stat-label">books tracked</span>
          </div>
        </div>
        <button className="btn btn-danger" onClick={handleClearData} id="clear-data-btn">
          <Trash2 size={16} /> Clear All Data
        </button>
      </div>

      {/* About */}
      <div className="card settings-section fade-in fade-in-delay-4">
        <div className="settings-section-header">
          <div className="settings-icon-wrap about">
            <Info size={18} />
          </div>
          <div>
            <h3 className="settings-section-title">About</h3>
            <p className="settings-desc">
              ReadLib v1.1.0 — A modern book and PDF management app.
            </p>
            <p className="settings-desc" style={{ marginBottom: 0 }}>
              Built with React, PDF.js, and the File System Access API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
