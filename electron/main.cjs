
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { initializeDatabase } = require('./database.cjs')

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Mantiqueira Industrial',
    backgroundColor: '#0b1120',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  } else {
    mainWindow.loadURL('http://127.0.0.1:5173')
  }
}

app.whenReady().then(async () => {
  try {
    const databasePath = await initializeDatabase()

    ipcMain.handle('database:get-status', () => ({
      connected: true,
      path: databasePath,
    }))

    createWindow()
  } catch (error) {
    console.error('Erro ao inicializar o banco:', error)
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
