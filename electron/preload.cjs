const { contextBridge } = require('electron');

// Expose safe APIs to the frontend if needed in the future
contextBridge.exposeInMainWorld('electronAPI', {
  // Example:
  // getAppVersion: () => process.env.npm_package_version,
});
