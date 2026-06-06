import { useState } from "react";
import {
  Settings as SettingsIcon,
  FolderOpen,
  Sun,
  Moon,
  Trash2,
  RefreshCw,
  Info,
  Database,
  Palette,
  HardDrive,
  Target,
  Cloud,
  Sparkles,
} from "lucide-react";
import { useLibrary } from "../context/LibraryContext";
import { useToast } from "../components/Toast";
import "../App.css";
import "./Settings.css";

function Settings() {
  const {
    dirHandle,
    selectDirectory,
    scanDirectory,
    theme,
    toggleTheme,
    books,
    userName,
    updateUserName,
    yearlyGoal,
    updateYearlyGoal,
    syncKey,
    isSyncEnabled,
    lastSynced,
    syncWithCloud,
    enableCloudSync,
    disableCloudSync,
    importSyncKey,
    fetchBookMetadata,
    updateBook,
  } = useLibrary();
  const { addToast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importKeyVal, setImportKeyVal] = useState("");
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState({ current: 0, total: 0, updated: 0 });

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncWithCloud();
      addToast("Library successfully synced with cloud! ☁️", "success");
    } catch (err) {
      addToast("Sync failed. Check your internet connection.", "danger");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportKey = async () => {
    if (!importKeyVal.trim()) return;
    setIsSyncing(true);
    try {
      await importSyncKey(importKeyVal.trim());
      addToast("Library linked and synced successfully! 🎉", "success");
      setImportKeyVal("");
    } catch (err) {
      addToast("Failed to link key. Make sure the key is correct.", "danger");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRescan = async () => {
    if (dirHandle && !isScanning) {
      setIsScanning(true);
      try {
        await scanDirectory(dirHandle);
        addToast("Library rescanned successfully", "success");
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleClearData = async () => {
    if (
      window.confirm(
        "Are you sure? This will clear all saved book metadata and settings from this browser.",
      )
    ) {
      const { indexedDB } = window;
      indexedDB.deleteDatabase("ReadLibDB");
      window.location.reload();
    }
  };

  const handleRefreshAllMetadata = async () => {
    if (isRefreshingAll || books.length === 0) return;
    setIsRefreshingAll(true);
    const total = books.length;
    let updated = 0;
    setRefreshProgress({ current: 0, total, updated: 0 });

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      setRefreshProgress({ current: i + 1, total, updated });
      try {
        const meta = await fetchBookMetadata(book.title, book.author);
        if (meta) {
          const changes = {};
          if (meta.cover) changes.cover = meta.cover;
          if (meta.author && (!book.author || book.author === "Unknown Author"))
            changes.author = meta.author;
          if (meta.description && !book.description)
            changes.description = meta.description;
          if (meta.publisher && !book.publisher)
            changes.publisher = meta.publisher;
          if (meta.publishedDate && !book.publishedDate)
            changes.publishedDate = meta.publishedDate;
          if (meta.pageCount && !book.pageCount)
            changes.pageCount = meta.pageCount;
          if (meta.genre && book.genre === "Other")
            changes.genre = meta.genre;

          if (Object.keys(changes).length > 0) {
            await updateBook({ ...book, ...changes });
            updated++;
            setRefreshProgress({ current: i + 1, total, updated });
          }
        }
      } catch (err) {
        console.warn(`Failed to refresh metadata for "${book.title}"`, err);
      }
      // Small delay to avoid rate-limiting
      await new Promise((r) => setTimeout(r, 300));
    }

    setRefreshProgress({ current: total, total, updated });
    addToast(`Metadata refreshed! ${updated} of ${total} books updated ✨`, "success");
    setIsRefreshingAll(false);
  };

  return (
    <div className="settings-page">
      <div className="page-header fade-in">
        <h1>Settings</h1>
        <p className="page-subtitle">Manage your library and preferences</p>
      </div>

      {/* User Profile */}
      <div className="card settings-section fade-in fade-in-delay-1">
        <div className="settings-section-header">
          <div className="settings-icon-wrap user">
            <SettingsIcon size={18} />
          </div>
          <div>
            <h3 className="settings-section-title">User Profile</h3>
            <p className="settings-desc">Update your display name.</p>
          </div>
        </div>
        <div className="settings-input-group">
          <input
            type="text"
            className="input"
            value={userName}
            onChange={(e) => updateUserName(e.target.value)}
            placeholder="Your name"
            id="user-name-input"
          />
        </div>
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
          <button
            className="btn btn-primary"
            onClick={selectDirectory}
            id="select-folder-btn"
          >
            <FolderOpen size={16} />{" "}
            {dirHandle ? "Change Folder" : "Select Folder"}
          </button>
          {dirHandle && (
            <button
              className="btn btn-secondary"
              onClick={handleRescan}
              disabled={isScanning}
              id="rescan-btn"
            >
              <RefreshCw size={16} className={isScanning ? "spin-icon" : ""} />
              {isScanning ? "Scanning..." : "Rescan"}
            </button>
          )}
        </div>
        {!window.showDirectoryPicker && (
          <div className="compat-warning">
            ⚠️ Folder selection requires a Chromium-based browser (Chrome, Edge,
            Brave). Firefox and iOS Safari are not supported.
          </div>
        )}
      </div>

      {/* Theme */}
      <div className="card settings-section fade-in fade-in-delay-2">
        <div className="settings-section-header">
          <div className="settings-icon-wrap theme">
            <Palette size={18} />
          </div>
          <div>
            <h3 className="settings-section-title">Appearance</h3>
            <p className="settings-desc">
              Toggle between dark and light themes.
            </p>
          </div>
        </div>
        <div className="theme-toggle-container">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            id="theme-toggle-btn"
          >
            <div
              className={`theme-toggle-track ${theme === "light" ? "light" : ""}`}
            >
              <div className="theme-toggle-thumb">
                {theme === "dark" ? <Moon size={12} /> : <Sun size={12} />}
              </div>
            </div>
            <span className="theme-toggle-label">
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </span>
          </button>
        </div>
      </div>

      {/* Cloud Sync */}
      <div className="card settings-section fade-in fade-in-delay-3">
        <div className="settings-section-header">
          <div className="settings-icon-wrap cloud">
            <Cloud size={18} />
          </div>
          <div>
            <h3 className="settings-section-title">Cloud Sync</h3>
            <p className="settings-desc">
              Synchronize your library metadata, reading stats, and progress across devices.
            </p>
          </div>
        </div>
        <div className="settings-sync-body">
          <div className="sync-toggle-row">
            <button
              className={`btn ${isSyncEnabled ? "btn-secondary" : "btn-primary"}`}
              onClick={isSyncEnabled ? disableCloudSync : enableCloudSync}
              id="cloud-sync-toggle-btn"
            >
              <Cloud size={16} />
              {isSyncEnabled ? "Disable Cloud Sync" : "Enable Cloud Sync"}
            </button>
            {isSyncEnabled && (
              <button
                className="btn btn-secondary"
                onClick={handleManualSync}
                disabled={isSyncing}
                id="manual-sync-btn"
              >
                <RefreshCw size={16} className={isSyncing ? "spin-icon" : ""} />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </button>
            )}
          </div>

          {isSyncEnabled && (
            <div className="sync-key-display glass-panel">
              <div className="sync-key-header">
                <span>Secret Sync Key</span>
                <span className="sync-status-indicator">
                  {lastSynced
                    ? `Last Synced: ${new Date(lastSynced).toLocaleTimeString()}`
                    : "Not synced yet"}
                </span>
              </div>
              <div className="sync-key-input-row">
                <input
                  type="text"
                  className="input sync-key-input"
                  readOnly
                  value={syncKey}
                  onClick={(e) => e.target.select()}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(syncKey);
                    addToast("Sync key copied to clipboard! 📋", "success");
                  }}
                >
                  Copy Key
                </button>
              </div>
              <p className="sync-key-help">
                ⚠️ Keep this key private. Use it on another device to link your library.
              </p>
            </div>
          )}

          {!isSyncEnabled && (
            <div className="sync-restore-box glass-panel">
              <h4>Link / Restore Existing Library</h4>
              <p>Enter a Sync Key from another device to restore or merge your data.</p>
              <div className="sync-key-input-row">
                <input
                  type="text"
                  className="input sync-restore-input"
                  placeholder="Paste your sync key here (e.g. readlib-sync-xxxxx)"
                  value={importKeyVal}
                  onChange={(e) => setImportKeyVal(e.target.value)}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleImportKey}
                  disabled={!importKeyVal.trim() || isSyncing}
                >
                  Link & Sync
                </button>
              </div>
            </div>
          )}
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
        <div className="settings-actions">
          <button
            className="btn btn-primary"
            onClick={handleRefreshAllMetadata}
            disabled={isRefreshingAll || books.length === 0}
            id="refresh-all-metadata-btn"
          >
            <Sparkles size={16} className={isRefreshingAll ? "spin-icon" : ""} />
            {isRefreshingAll
              ? `Refreshing ${refreshProgress.current}/${refreshProgress.total}...`
              : "Refresh All Metadata"}
          </button>
          <button
            className="btn btn-danger"
            onClick={handleClearData}
            id="clear-data-btn"
          >
            <Trash2 size={16} /> Clear All Data
          </button>
        </div>
        {isRefreshingAll && (
          <div className="refresh-progress-wrap">
            <div className="refresh-progress-bar">
              <div
                className="refresh-progress-fill"
                style={{ width: `${(refreshProgress.current / refreshProgress.total) * 100}%` }}
              ></div>
            </div>
            <span className="refresh-progress-text">
              {refreshProgress.current} / {refreshProgress.total} checked · {refreshProgress.updated} updated
            </span>
          </div>
        )}
      </div>

      {/* Yearly Goal */}
      <div className="card settings-section fade-in fade-in-delay-3">
        <div className="settings-section-header">
          <div className="settings-icon-wrap goal">
            <Target size={18} />
          </div>
          <div>
            <h3 className="settings-section-title">Yearly Reading Goal</h3>
            <p className="settings-desc">
              How many books do you want to read this year?
            </p>
          </div>
        </div>
        <div className="goal-input-row">
          <input
            type="number"
            className="input goal-input"
            value={yearlyGoal}
            min={1}
            max={365}
            onChange={async (e) => {
              const val = parseInt(e.target.value);
              if (val >= 1 && val <= 365) {
                await updateYearlyGoal(val);
                addToast(`Goal updated to ${val} books 🎯`, "success");
              }
            }}
          />
          <span className="goal-unit">books</span>
        </div>
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
