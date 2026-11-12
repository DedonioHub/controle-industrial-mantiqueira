
const { app } = require('electron')
const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')

let db
let databasePath

async function initializeDatabase() {
  const dataDirectory = path.join(app.getPath('userData'), 'database')

  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true })
  }

  databasePath = path.join(dataDirectory, 'mantiqueira.db')

  const SQL = await initSqlJs({
    locateFile: (file) =>
      path.join(__dirname, '../node_modules/sql.js/dist', file),
  })

  if (fs.existsSync(databasePath)) {
    const fileBuffer = fs.readFileSync(databasePath)
    db = new SQL.Database(new Uint8Array(fileBuffer))
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS raw_materials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cost_per_kg REAL NOT NULL DEFAULT 0,
      stock_kg REAL NOT NULL DEFAULT 0,
      minimum_stock_kg REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      bag_weight_kg REAL NOT NULL,
      sale_price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS formula_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity_kg REAL NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (material_id) REFERENCES raw_materials(id)
    );

    CREATE TABLE IF NOT EXISTS production_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      bags INTEGER NOT NULL,
      total_kg REAL NOT NULL,
      ingredient_cost REAL NOT NULL,
      estimated_revenue REAL NOT NULL,
      production_date TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id TEXT NOT NULL,
      movement_type TEXT NOT NULL,
      quantity_kg REAL NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      movement_date TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (material_id) REFERENCES raw_materials(id)
    );
  `)

  saveDatabase()

  return databasePath
}

function saveDatabase() {
  if (!db || !databasePath) {
    throw new Error('Banco de dados não inicializado.')
  }

  const data = db.export()
  fs.writeFileSync(databasePath, Buffer.from(data))
}

function getDatabase() {
  if (!db) {
    throw new Error('Banco de dados ainda não foi inicializado.')
  }

  return db
}

module.exports = {
  initializeDatabase,
  getDatabase,
  saveDatabase,
}
