

import {
  type Product,
  rawMaterials,
  getFormulaWeight,
  getFormulaCost,
} from '../data/initialData'

export interface IngredientConsumption {
  materialId: string
  name: string
  quantityKg: number
  totalCost: number
}

export interface ProductionEstimate {
  bags: number
  totalKg: number
  ingredientCost: number
  estimatedRevenue: number
  grossResult: number
  grossMarginPercent: number
  consumption: IngredientConsumption[]
}

export function calculateProduction(
  product: Product,
  bags: number,
): ProductionEstimate {
  if (!Number.isFinite(bags) || bags < 0 || !Number.isInteger(bags)) {
    throw new Error('Informe uma quantidade válida de sacos.')
  }

  const formulaWeight = getFormulaWeight(product)

  if (formulaWeight <= 0) {
    throw new Error('A fórmula precisa ter peso maior que zero.')
  }

  const totalKg = bags * product.bagWeightKg
  const ingredientCost = (totalKg / formulaWeight) * getFormulaCost(product)
  const estimatedRevenue = bags * product.salePrice
  const grossResult = estimatedRevenue - ingredientCost

  const consumption = product.formula.map((ingredient) => {
    const material = rawMaterials.find(
      (item) => item.id === ingredient.materialId,
    )

    if (!material) {
      throw new Error(`Matéria-prima não encontrada: ${ingredient.materialId}`)
    }

    const quantityKg = (totalKg * ingredient.quantityKg) / formulaWeight

    return {
      materialId: material.id,
      name: material.name,
      quantityKg,
      totalCost: quantityKg * material.costPerKg,
    }
  })

  return {
    bags,
    totalKg,
    ingredientCost,
    estimatedRevenue,
    grossResult,
    grossMarginPercent:
      estimatedRevenue > 0 ? (grossResult / estimatedRevenue) * 100 : 0,
    consumption,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}
export { getFormulaWeight, getFormulaCost }
