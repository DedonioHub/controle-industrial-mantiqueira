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
@@ -17,6 +47,46 @@ function addColumnIfMissing(table, column, definition) {
  }
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

  const formulaExists = db.exec(
    `SELECT COUNT(*) FROM formula_ingredients
     WHERE product_id = 'timao-adulto'`,
  )

  const formulaCount = formulaExists.length > 0
    ? formulaExists[0].values[0][0]
    : 0

  if (formulaCount === 0) {
    for (const ingredient of initialFormula) {
      db.run(
        `INSERT INTO formula_ingredients
         (product_id, material_id, quantity_kg)
         VALUES (?, ?, ?)`,
        ['timao-adulto', ingredient[0], ingredient[1]],
      )
    }
  }
}

async function initializeDatabase() {
  const dataDirectory = path.join(app.getPath('userData'), 'database')

@@ -110,13 +180,14 @@ async function initializeDatabase() {
    );
  `)

  // Atualiza registros antigos sem apagar dados.
  addColumnIfMissing('production_records', 'start_time', 'TEXT')
  addColumnIfMissing('production_records', 'end_time', 'TEXT')
  addColumnIfMissing('production_records', 'total_minutes', 'INTEGER DEFAULT 0')
  addColumnIfMissing('production_records', 'stoppage_minutes', 'INTEGER DEFAULT 0')
  addColumnIfMissing('production_records', 'milling_tons_per_hour', 'REAL DEFAULT 0')

  seedInitialData()

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_production_date
    ON production_records(production_date);
