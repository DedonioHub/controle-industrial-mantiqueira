
export interface RawMaterial {
  id: string
  name: string
  unit: 'kg'
  costPerKg: number
  initialStock: number
  minimumStock: number
}

export interface FormulaIngredient {
  materialId: string
  quantityKg: number
}

export interface Product {
  id: string
  name: string
  brand: string
  bagWeightKg: number
  salePrice: number
  formula: FormulaIngredient[]
}

export const rawMaterials: RawMaterial[] = [
  { id: 'milho', name: 'Milho grão', unit: 'kg', costPerKg: 1.18, initialStock: 0, minimumStock: 500 },
  { id: 'sorgo', name: 'Sorgo', unit: 'kg', costPerKg: 1.06, initialStock: 0, minimumStock: 300 },
  { id: 'soja', name: 'Soja 46 PB', unit: 'kg', costPerKg: 2.20, initialStock: 0, minimumStock: 200 },
  { id: 'farelo-trigo', name: 'Farelo de trigo', unit: 'kg', costPerKg: 1.30, initialStock: 0, minimumStock: 300 },
  { id: 'hidrolisado', name: 'Hidrolisado Kemin E 1 B', unit: 'kg', costPerKg: 3.30, initialStock: 0, minimumStock: 10 },
  { id: 'oleo-frango', name: 'Óleo de frango', unit: 'kg', costPerKg: 4.00, initialStock: 0, minimumStock: 10 },
  { id: 'sal', name: 'Sal comum', unit: 'kg', costPerKg: 0.60, initialStock: 0, minimumStock: 10 },
  { id: 'antifungico', name: 'Aditivo antifúngico DRY', unit: 'kg', costPerKg: 16.37, initialStock: 0, minimumStock: 2 },
  { id: 'antioxidante', name: 'Aditivo antioxidante DRY', unit: 'kg', costPerKg: 12.34, initialStock: 0, minimumStock: 2 },
  { id: 'glutamato', name: 'Glutamato monossódico', unit: 'kg', costPerKg: 12.99, initialStock: 0, minimumStock: 1 },
]

export const products: Product[] = [
  {
    id: 'timao-adulto',
    name: 'Timão Adulto 18%',
    brand: 'Timão',
    bagWeightKg: 15,
    salePrice: 39,
    formula: [
      { materialId: 'milho', quantityKg: 500 },
      { materialId: 'sorgo', quantityKg: 100 },
      { materialId: 'soja', quantityKg: 100 },
      { materialId: 'farelo-trigo', quantityKg: 250 },
      { materialId: 'hidrolisado', quantityKg: 6 },
      { materialId: 'oleo-frango', quantityKg: 4 },
      { materialId: 'sal', quantityKg: 3 },
      { materialId: 'antifungico', quantityKg: 0.1 },
      { materialId: 'antioxidante', quantityKg: 0.5 },
      { materialId: 'glutamato', quantityKg: 0.1 },
    ],
  },
]

export function getFormulaWeight(product: Product): number {
  return product.formula.reduce((total, item) => total + item.quantityKg, 0)
}

export function getFormulaCost(product: Product): number {
  return product.formula.reduce((total, item) => {
    const material = rawMaterials.find((raw) => raw.id === item.materialId)
    return total + item.quantityKg * (material?.costPerKg ?? 0)
  }, 0)
}

export function getCostPerKg(product: Product): number {
  return getFormulaCost(product) / getFormulaWeight(product)
}

export function getCostPerBag(product: Product): number {
  return getCostPerKg(product) * product.bagWeightKg
}
