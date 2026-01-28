// Preload script para Electron
// Aquí puedes exponer APIs seguras al renderer process

const { contextBridge } = require('electron');

// Exponer información del entorno
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron
});
