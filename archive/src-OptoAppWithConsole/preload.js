// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title) => ipcRenderer.send('set-title', title),
  getPorts: () => ipcRenderer.send('get-port'),
  connectToPort: (port) => ipcRenderer.send('connect2port', port),
  disconnectFromPort: () => ipcRenderer.send('disconnectFromPort'),
  sendMessage: (msg) => ipcRenderer.send('send-message', msg),

  handleCounter: (callback) => ipcRenderer.on('update-counter', callback), 
  serialHandler: (callback) => ipcRenderer.on('serial-update', callback),
  getPortsHandler: (callback) => ipcRenderer.on('get-port-res', callback),
  openPortError: (callback) => ipcRenderer.on('open-port-error', callback),
  openPortSuccess: (callback) => ipcRenderer.on('open-port-success', callback),
})