
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const {
  initializeDatabase,
  getDatabase,
  saveDatabase,
} = require('./database.cjs')

function registerDatabaseHandlers() {
  ipcMain.handle('database:get-status', () => ({
    connected: true,
    path: path.join(app.getPath('userData'), 'database', 'mantiqueira.db'),
  }))

  ipcMain.handle('production:save', (_event, record) => {
    const db = getDatabase()

    if (!record || !record.productId || !record.productionDate) {
      throw new Error('Produto e data da produção são obrigatórios.')
    }

    if (!Number.isInteger(record.bags) || record.bags < 0) {
      throw new Error('Quantidade de sacos inválida.')
    }

    const periods = Array.isArray(record.periods) ? record.periods : []

    db.run('BEGIN TRANSACTION')

    try {
      db.run(
        `INSERT INTO production_records
        (product_id, bags, total_kg, ingredient_cost,
         estimated_revenue, production_date, notes,
         start_time, end_time, total_minutes,
         stoppage_minutes, milling_tons_per_hour)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.productId,
          record.bags,
          record.totalKg || 0,
          record.ingredientCost || 0,
          record.estimatedRevenue || 0,
          record.productionDate,
          record.notes || '',
          record.startTime || null,
          record.endTime || null,
          record.totalMinutes || 0,
          record.stoppageMinutes || 0,
          record.millingTonsPerHour || 0,
        ],
      )

      const result = db.exec('SELECT last_insert_rowid() AS id')
      const productionId = result[0].values[0][0]

      for (const period of periods) {
        db.run(
          `INSERT INTO production_periods
          (production_id, period_number, start_time, end_time,
           duration_minutes, frequency_hz, bags, total_kg,
           tons_per_hour, is_estimated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            productionId,
            period.number,
            period.startTime,
            period.endTime,
            period.durationMinutes || 0,
            period.frequencyHz || 0,
            period.bags || 0,
            period.totalKg || 0,
            period.tonsPerHour || 0,
            period.isEstimated === false ? 0 : 1,
          ],
        )
      }

      db.run('COMMIT')
      saveDatabase()

      return { success: true, id: productionId }
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  })

  ipcMain.handle('production:list', (_event, filters = {}) => {
    const db = getDatabase()
    const date = filters.date || null

    let sql = `
      SELECT
        p.*,
        pr.name AS product_name
      FROM production_records p
      LEFT JOIN products pr ON pr.id = p.product_id
    `

    if (date) {
      sql += ' WHERE p.production_date = ?'
    }

    sql += ' ORDER BY p.production_date DESC, p.id DESC'

    const statement = db.prepare(sql)

    try {
      if (date) statement.bind([date])

      const records = []

      while (statement.step()) {
        const record = statement.getAsObject()

        const periodsStatement = db.prepare(
          `SELECT * FROM production_periods
           WHERE production_id = ?
           ORDER BY period_number`,
        )

        try {
          periodsStatement.bind([record.id])
          record.periods = []

          while (periodsStatement.step()) {
            record.periods.push(periodsStatement.getAsObject())
          }
        } finally {
          periodsStatement.free()
        }

        records.push(record)
      }

      return records
    } finally {
      statement.free()
    }
  })
}

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
    await initializeDatabase()
    registerDatabaseHandlers()
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
