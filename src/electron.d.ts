
interface ProductionPeriodRecord {
  number: number
  startTime: string
  endTime: string
  durationMinutes: number
  frequencyHz: number
  bags: number
  totalKg: number
  tonsPerHour: number
  isEstimated?: boolean
}

interface ProductionRecordInput {
  productId: string
  bags: number
  totalKg: number
  ingredientCost: number
  estimatedRevenue: number
  productionDate: string
  notes?: string
  startTime?: string
  endTime?: string
  totalMinutes?: number
  stoppageMinutes?: number
  millingTonsPerHour?: number
  periods: ProductionPeriodRecord[]
}

interface ProductionRecord {
  id: number
  product_id: string
  product_name: string
  bags: number
  total_kg: number
  production_date: string
  start_time: string | null
  end_time: string | null
  total_minutes: number
  periods: Array<{
    period_number: number
    start_time: string
    end_time: string
    duration_minutes: number
    frequency_hz: number
    bags: number
    total_kg: number
    tons_per_hour: number
    is_estimated: number
  }>
}

interface StockMaterial {
  id: string
  name: string
  costPerKg: number
  stockKg: number
  minimumStockKg: number
}

interface StockMovementInput {
  materialId: string
  movementType: 'entrada' | 'saida'
  quantityKg: number
  unitCost?: number
  movementDate: string
  description?: string
}

interface StockMaterialUpdate {
  id: string
  name: string
  costPerKg: number
  minimumStockKg: number
}

interface Window {
  mantiqueira: {
    appName: string
    appVersion: string

    database: {
      getStatus: () => Promise<{
        connected: boolean
        path: string
      }>
    }

    production: {
      save: (record: ProductionRecordInput) => Promise<{
        success: boolean
        id: number
      }>

      list: (filters?: {
        date?: string
      }) => Promise<ProductionRecord[]>
    }

    stock: {
      list: () => Promise<StockMaterial[]>

      move: (movement: StockMovementInput) => Promise<{
        success: boolean
        newStock: number
        newCost: number
      }>

      updateMaterial: (material: StockMaterialUpdate) => Promise<{
        success: boolean
      }>
    }
  }
}
