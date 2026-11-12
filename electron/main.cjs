
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


  ipcMain.handle('stock:list', () => {
    const db = getDatabase()
    const statement = db.prepare(`SELECT id, name, cost_per_kg, stock_kg, minimum_stock_kg
      FROM raw_materials ORDER BY name`)
    const materials = []
    try {
      while (statement.step()) {
        const row = statement.getAsObject()
        materials.push({
          id: String(row.id),
          name: String(row.name),
          costPerKg: Number(row.cost_per_kg || 0),
          stockKg: Number(row.stock_kg || 0),
          minimumStockKg: Number(row.minimum_stock_kg || 0),
        })
      }
    } finally {
      statement.free()
    }
    return materials
  })

  ipcMain.handle('stock:update-material', (_event, material) => {
    if (!material?.id || !String(material.name || '').trim()) {
      throw new Error('Informe o nome da matéria-prima.')
    }
    const cost = Number(material.costPerKg)
    const minimum = Number(material.minimumStockKg)
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(minimum) || minimum < 0) {
      throw new Error('Custo e estoque mínimo devem ser valores válidos.')
    }
    const db = getDatabase()
    db.run('UPDATE raw_materials SET name = ?, cost_per_kg = ?, minimum_stock_kg = ? WHERE id = ?',
      [String(material.name).trim(), cost, minimum, material.id])
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('stock:move', (_event, movement) => {
    const db = getDatabase()
    const qty = Number(movement?.quantityKg)
    const cost = Number(movement?.unitCost ?? 0)
    if (!movement?.materialId || !['entrada', 'saida'].includes(movement.movementType)) {
      throw new Error('Movimentação inválida.')
    }
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost < 0) {
      throw new Error('Informe quantidade e custo válidos.')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(movement.movementDate || '')) {
      throw new Error('Informe uma data válida.')
    }
    const current = db.exec('SELECT stock_kg, cost_per_kg FROM raw_materials WHERE id = ?', [movement.materialId])
    if (!current.length || !current[0].values.length) throw new Error('Matéria-prima não encontrada.')
    const oldStock = Number(current[0].values[0][0] || 0)
    const oldCost = Number(current[0].values[0][1] || 0)
    if (movement.movementType === 'saida' && qty > oldStock) {
      throw new Error('Saldo insuficiente para esta saída.')
    }
    const newStock = movement.movementType === 'entrada' ? oldStock + qty : oldStock - qty
    const newCost = movement.movementType === 'entrada' && newStock > 0
      ? ((oldStock * oldCost) + (qty * cost)) / newStock : oldCost
    db.run('BEGIN TRANSACTION')
    try {
      db.run('UPDATE raw_materials SET stock_kg = ?, cost_per_kg = ? WHERE id = ?',
        [newStock, newCost, movement.materialId])
      db.run(`INSERT INTO stock_movements
        (material_id, movement_type, quantity_kg, unit_cost, movement_date, description)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [movement.materialId, movement.movementType, qty, movement.movementType === 'entrada' ? cost : oldCost,
          movement.movementDate, movement.description || ''])
      db.run('COMMIT')
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
    saveDatabase()
    return { success: true, newStock, newCost }
  })


  ipcMain.handle('products:list', () => {
    const db = getDatabase()
    const products = db.exec('SELECT id, name, brand, bag_weight_kg, sale_price FROM products ORDER BY name')
    return (products[0]?.values || []).map((row) => {
      const product = { id: row[0], name: row[1], brand: row[2], bagWeightKg: Number(row[3]), salePrice: Number(row[4]), formula: [] }
      const formula = db.prepare(`SELECT fi.material_id, fi.quantity_kg, rm.name, rm.cost_per_kg
        FROM formula_ingredients fi LEFT JOIN raw_materials rm ON rm.id = fi.material_id
        WHERE fi.product_id = ? ORDER BY rm.name`)
      try {
        formula.bind([product.id])
        while (formula.step()) {
          const item = formula.getAsObject()
          product.formula.push({ materialId: item.material_id, quantityKg: Number(item.quantity_kg), materialName: item.name, costPerKg: Number(item.cost_per_kg || 0) })
        }
      } finally { formula.free() }
      return product
    })
  })

  ipcMain.handle('products:save', (_event, product) => {
    if (!product || !String(product.id || '').trim() || !String(product.name || '').trim() || !String(product.brand || '').trim()) {
      throw new Error('Nome, marca e identificador do produto são obrigatórios.')
    }
    const bagWeight = Number(product.bagWeightKg)
    const salePrice = Number(product.salePrice)
    const formula = Array.isArray(product.formula) ? product.formula : []
    if (!Number.isFinite(bagWeight) || bagWeight <= 0 || !Number.isFinite(salePrice) || salePrice < 0) {
      throw new Error('Peso e preço de venda inválidos.')
    }
    if (formula.length === 0 ||
        formula.some((item) => !item.materialId || !Number.isFinite(Number(item.quantityKg)) || Number(item.quantityKg) < 0) ||
        formula.reduce((sum, item) => sum + Number(item.quantityKg || 0), 0) <= 0 ||
        new Set(formula.map((item) => item.materialId)).size !== formula.length) {
      throw new Error('A fórmula precisa ter ingredientes válidos, sem duplicidade, e peso maior que zero.')
    }
    const db = getDatabase()
    db.run('BEGIN TRANSACTION')
    try {
      db.run(`INSERT INTO products (id, name, brand, bag_weight_kg, sale_price)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, brand=excluded.brand,
        bag_weight_kg=excluded.bag_weight_kg, sale_price=excluded.sale_price`,
        [product.id, String(product.name).trim(), String(product.brand).trim(), bagWeight, salePrice])
      db.run('DELETE FROM formula_ingredients WHERE product_id = ?', [product.id])
      for (const item of formula) {
        const qty = Number(item.quantityKg)
        if (qty === 0) continue
        const exists = db.exec('SELECT id FROM raw_materials WHERE id = ?', [item.materialId])
        if (!exists.length || !exists[0].values.length) throw new Error('Ingrediente não encontrado no estoque.')
        db.run('INSERT INTO formula_ingredients (product_id, material_id, quantity_kg) VALUES (?, ?, ?)',
          [product.id, item.materialId, qty])
      }
      db.run('COMMIT')
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
    saveDatabase()
    return { success: true }
  })

  ipcMain.handle('products:delete', (_event, productId) => {
    const db = getDatabase()
    const history = db.exec('SELECT COUNT(*) FROM production_records WHERE product_id = ?', [productId])
    if (Number(history[0]?.values?.[0]?.[0] || 0) > 0) {
      throw new Error('Este produto possui histórico de produção e não pode ser excluído.')
    }
    db.run('BEGIN TRANSACTION')
    try {
      db.run('DELETE FROM formula_ingredients WHERE product_id = ?', [productId])
      db.run('DELETE FROM products WHERE id = ?', [productId])
      db.run('COMMIT')
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
    saveDatabase()
    return { success: true }
  })

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
