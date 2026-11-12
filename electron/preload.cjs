
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('mantiqueira', {
  appName: 'Mantiqueira Industrial',
  appVersion: '1.0.0',
})
