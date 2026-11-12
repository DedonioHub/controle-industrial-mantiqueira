
const { app } = require('electron')
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')

let db
let databasePath

const initialMaterials = [
  ['milho', 'Milho grão', 1.18, 0, 500],
  ['sorgo', 'Sorgo', 1.06, 0, 300],
  ['soja', 'Soja 46 PB', 2.20, 0, 200],
  ['farelo-trigo', 'Farelo de trigo', 1.30, 0, 300],
  ['hidrolisado', 'Hidrolisado Kemin E 1 B', 3.30, 0, 10],
  ['oleo-frango', 'Óleo de frango', 4.00, 0, 10],
  ['sal', 'Sal comum', 0.60, 0, 10],
  ['antifungico', 'Aditivo antifúngico DRY', 16.37, 0, 2],
  ['antioxidante', 'Aditivo antioxidante DRY', 12.34, 0, 2],
  ['glutamato', 'Glutamato monossódico', 12.99, 0, 1],
]

const initialProducts = [
  ['timao-adulto', 'Timão Adulto 18%', 'Timão', 15, 39],
]

const initialFormula = [
  ['milho', 500],
  ['sorgo', 100],
  ['soja', 100],
  ['farelo-trigo', 250],
  ['hidrolisado', 6],
  ['oleo-frango', 4],
  ['sal', 3],
  ['antifungico', 0.1],
  ['antioxidante', 0.5],
  ['glutamato', 0.1],
]

function addColumnIfMissing(table, column, definition) {
  const columns = db.exec(`PRAGMA table_info(${table})`)

  const exists = columns.length > 0 &&
    columns[0].values.some((row) => row[1] === column)

  if (!exists) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

function createTables() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
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
      bag_weight_kg REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS formula_ingredients (
      product_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity_kg REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (product_id, material_id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (material_id) REFERENCES raw_materials(id)
    );

    CREATE TABLE IF NOT EXISTS production_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      bags INTEGER NOT NULL DEFAULT 0,
      total_kg REAL NOT NULL DEFAULT 0,
      ingredient_cost REAL NOT NULL DEFAULT 0,
      estimated_revenue REAL NOT NULL DEFAULT 0,
      production_date TEXT NOT NULL,
      notes TEXT,
      start_time TEXT,
      end_time TEXT,
      total_minutes INTEGER NOT NULL DEFAULT 0,
      stoppage_minutes INTEGER NOT NULL DEFAULT 0,
      milling_tons_per_hour REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS production_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      production_id INTEGER NOT NULL,
      period_number INTEGER NOT NULL,
      start_time TEXT,
      end_time TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 0,
      frequency_hz REAL NOT NULL DEFAULT 0,
      bags INTEGER NOT NULL DEFAULT 0,
      total_kg REAL NOT NULL DEFAULT 0,
      tons_per_hour REAL NOT NULL DEFAULT 0,
      is_estimated INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (production_id)
        REFERENCES production_records(id) ON DELETE CASCADE
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
}

function updateOldTables() {
  addColumnIfMissing('production_records', 'start_time', 'TEXT')
  addColumnIfMissing('production_records', 'end_time', 'TEXT')
  addColumnIfMissing(
    'production_records',
    'total_minutes',
    'INTEGER NOT NULL DEFAULT 0',
  )
  addColumnIfMissing(
    'production_records',
    'stoppage_minutes',
    'INTEGER NOT NULL DEFAULT 0',
  )
  addColumnIfMissing(
    'production_records',
    'milling_tons_per_hour',
    'REAL NOT NULL DEFAULT 0',
  )
}

function seedInitialData() {
  for (const material of initialMaterials) {
    db.run(
      `INSERT OR IGNORE INTO raw_materials
       (id, name, cost_per_kg, stock_kg, minimum_stock_kg)
       VALUES (?, ?, ?, ?, ?)`,
      material,
    )
  }

  for (const product of initialProducts) {
    db.run(
      `INSERT OR IGNORE INTO products
       (id, name, brand, bag_weight_kg, sale_price)
       VALUES (?, ?, ?, ?, ?)`,
      product,
    )
  }

  const result = db.exec(`
    SELECT COUNT(*) FROM formula_ingredients
    WHERE product_id = 'timao-adulto'
  `)

  const formulaCount = result.length > 0
    ? result[0].values[0][0]
    : 0

  if (formulaCount === 0) {
    for (const ingredient of initialFormula) {
      db.run(
        `INSERT OR IGNORE INTO formula_ingredients
         (product_id, material_id, quantity_kg)
         VALUES (?, ?, ?)`,
        ['timao-adulto', ingredient[0], ingredient[1]],
      )
    }
  }
}

async function initializeDatabase() {
  const dataDirectory = path.join(
    app.getPath('userData'),
    'database',
  )

  fs.mkdirSync(dataDirectory, { recursive: true })

  databasePath = path.join(dataDirectory, 'mantiqueira.db')

  // Localiza o WebAssembly dentro do pacote instalado.
  const SQL = await initSqlJs({
    locateFile: (file) => {
      return path.join(
        path.dirname(require.resolve('sql.js')),
        file,
      )
    },
  })

  // Reabre o banco existente ou cria um novo.
  if (fs.existsSync(databasePath)) {
    const fileBuffer = fs.readFileSync(databasePath)
    db = new SQL.Database(new Uint8Array(fileBuffer))
  } else {
    db = new SQL.Database()
  }

  createTables()
  updateOldTables()
  seedInitialData()

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_production_date
    ON production_records(production_date);

    CREATE INDEX IF NOT EXISTS idx_period_production
    ON production_periods(production_id);

    CREATE INDEX IF NOT EXISTS idx_stock_movement_date
    ON stock_movements(movement_date);
  `)

  saveDatabase()

  return databasePath
}

function getDatabase() {
  if (!db) {
    throw new Error('Banco de dados ainda não foi inicializado.')
  }

  return db
}

function saveDatabase() {
  if (!db || !databasePath) {
    throw new Error('Não foi possível salvar: banco não inicializado.')
  }

  const dataDirectory = path.dirname(databasePath)
  fs.mkdirSync(dataDirectory, { recursive: true })

  const data = db.export()
  fs.writeFileSync(databasePath, Buffer.from(data))
}

module.exports = {
  initializeDatabase,
  getDatabase,
  saveDatabase,
}
