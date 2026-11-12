
const { app } = require('electron')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

let db

function initializeDatabase() {
  const dataDirectory = path.join(app.getPath('userData'), 'database')

  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true })
  }

  const databasePath = path.join(dataDirectory, 'mantiqueira.db')

  db = new Database(databasePath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

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

  return databasePath
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
}
