
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mantiqueira', {
  appName: 'Mantiqueira Industrial',
  appVersion: '1.0.0',

  database: {
    getStatus: () => ipcRenderer.invoke('database:get-status'),
  },

  production: {
    save: (record) => ipcRenderer.invoke('production:save', record),
    list: (filters) => ipcRenderer.invoke('production:list', filters),
  },
})
