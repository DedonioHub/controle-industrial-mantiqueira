
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

  // PRODUÇÃO
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
      SELECT p.*, pr.name AS product_name
      FROM production_records p
      LEFT JOIN products pr ON pr.id = p.product_id
    `

    if (date) sql += ' WHERE p.production_date = ?'

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

  // ESTOQUE: CONSULTAR MATÉRIAS-PRIMAS
  ipcMain.handle('stock:list', () => {
    const db = getDatabase()

    const result = db.exec(`
      SELECT
        id,
        name,
        cost_per_kg,
        stock_kg,
        minimum_stock_kg
      FROM raw_materials
      ORDER BY name
    `)

    if (!result.length) return []

    return result[0].values.map((row) => ({
      id: row[0],
      name: row[1],
      costPerKg: row[2],
      stockKg: row[3],
      minimumStockKg: row[4],
    }))
  })

  // ESTOQUE: REGISTRAR ENTRADA OU SAÍDA
  ipcMain.handle('stock:move', (_event, movement) => {
    const db = getDatabase()

    if (!movement || !movement.materialId) {
      throw new Error('Selecione uma matéria-prima.')
    }

    if (!['entrada', 'saida'].includes(movement.movementType)) {
      throw new Error('Tipo de movimentação inválido.')
    }

    const quantity = Number(movement.quantityKg)
    const unitCost = Number(movement.unitCost || 0)
    const movementDate = movement.movementDate

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Informe uma quantidade válida.')
    }

    if (!movementDate || !/^\d{4}-\d{2}-\d{2}$/.test(movementDate)) {
      throw new Error('Informe uma data válida.')
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new Error('Informe um custo por kg válido.')
    }

    const materialStatement = db.prepare(
      `SELECT id, name, cost_per_kg, stock_kg
       FROM raw_materials WHERE id = ?`,
    )

    let material

    try {
      materialStatement.bind([movement.materialId])

      if (materialStatement.step()) {
        material = materialStatement.getAsObject()
      }
    } finally {
      materialStatement.free()
    }

    if (!material) {
      throw new Error('Matéria-prima não encontrada.')
    }

    const currentStock = Number(material.stock_kg)
    const currentCost = Number(material.cost_per_kg)
    const appliedCost = movement.movementType === 'entrada'
      ? unitCost
      : currentCost

    if (movement.movementType === 'saida' && quantity > currentStock) {
      throw new Error(
        `Saldo insuficiente. Disponível: ${currentStock.toFixed(2)} kg.`,
      )
    }

    const newStock = movement.movementType === 'entrada'
      ? currentStock + quantity
      : currentStock - quantity

    let newCost = currentCost

    if (movement.movementType === 'entrada' && unitCost > 0) {
      newCost = (
        (currentStock * currentCost) + (quantity * unitCost)
      ) / newStock
    }

    db.run('BEGIN TRANSACTION')

    try {
      db.run(
        `INSERT INTO stock_movements
        (material_id, movement_type, quantity_kg, unit_cost,
         movement_date, description)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          movement.materialId,
          movement.movementType,
          quantity,
          appliedCost,
          movementDate,
          movement.description || '',
        ],
      )

      db.run(
        `UPDATE raw_materials
         SET stock_kg = ?, cost_per_kg = ?
         WHERE id = ?`,
        [newStock, newCost, movement.materialId],
      )

      db.run('COMMIT')
      saveDatabase()

      return {
        success: true,
        newStock,
        newCost,
      }
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  })

  // ESTOQUE: ATUALIZAR CADASTRO E ESTOQUE MÍNIMO
  ipcMain.handle('stock:update-material', (_event, material) => {
    const db = getDatabase()

    if (!material || !material.id) {
      throw new Error('Matéria-prima inválida.')
    }

    const name = String(material.name || '').trim()
    const cost = Number(material.costPerKg)
    const minimum = Number(material.minimumStockKg)

    if (!name) {
      throw new Error('Informe o nome da matéria-prima.')
    }

    if (!Number.isFinite(cost) || cost < 0) {
      throw new Error('Preço por kg inválido.')
    }

    if (!Number.isFinite(minimum) || minimum < 0) {
      throw new Error('Estoque mínimo inválido.')
    }

    const result = db.exec(
      `SELECT id FROM raw_materials WHERE id = '${String(material.id).replace(/'/g, "''")}'`,
    )

    if (!result.length || !result[0].values.length) {
      throw new Error('Matéria-prima não encontrada.')
    }

    db.run(
      `UPDATE raw_materials
       SET name = ?, cost_per_kg = ?, minimum_stock_kg = ?
       WHERE id = ?`,
      [name, cost, minimum, material.id],
    )

    saveDatabase()

    return { success: true }
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
