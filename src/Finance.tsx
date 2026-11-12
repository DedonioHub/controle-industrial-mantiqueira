
import { useEffect, useMemo, useState } from 'react'
import {
  CircleDollarSign,
  TrendingUp,
  Wallet,
  Calculator,
  Package,
} from 'lucide-react'
import {
  formatCurrency,
  formatNumber,
} from './utils/calculations'

function Finance() {
  const [products, setProducts] = useState<DatabaseProduct[]>([])
  const [rawMaterials, setRawMaterials] = useState<StockMaterial[]>([])
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [productId, setProductId] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      window.mantiqueira.products.list(),
      window.mantiqueira.stock.list(),
      window.mantiqueira.production.list(),
    ]).then(([productData, materialData, productionData]) => {
      if (!active) return
      setProducts(productData)
      setRawMaterials(materialData)
      setProductionRecords(productionData)
      setProductId((current) => productData.some((item) => item.id === current) ? current : (productData[0]?.id ?? ''))
    }).catch((error) => console.error(error)).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const [bags, setBags] = useState('890')
  const [extraCosts, setExtraCosts] = useState('0')

  const product = products.find((item) => item.id === productId)
  const quantity = Math.max(0, Number(bags) || 0)
  const expenses = Math.max(0, Number(extraCosts) || 0)

  const financial = useMemo(() => {
    if (!product) return null

    const formulaWeight = product.formula.reduce((sum, item) => sum + item.quantityKg, 0)
    const formulaCost = product.formula.reduce((sum, item) => {
      const material = rawMaterials.find((raw) => raw.id === item.materialId)
      return sum + item.quantityKg * (material?.costPerKg ?? 0)
    }, 0)

    const ingredientCostPerKg =
      formulaWeight > 0 ? formulaCost / formulaWeight : 0

    const ingredientCostPerBag =
      ingredientCostPerKg * product.bagWeightKg

    const totalIngredientCost = ingredientCostPerBag * quantity
    const revenue = product.salePrice * quantity
    const totalCosts = totalIngredientCost + expenses
    const result = revenue - totalCosts

    return {
      formulaWeight,
      ingredientCostPerBag,
      totalIngredientCost,
      revenue,
      totalCosts,
      result,
      margin: revenue > 0 ? (result / revenue) * 100 : 0,
      costPerKg: ingredientCostPerKg,
    }
  }, [product, quantity, expenses, rawMaterials])

  return (
    <div className="finance-page">
      {loading && <div className="empty-state"><strong>Carregando dados financeiros...</strong></div>}
      <section className="panel finance-form">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GESTÃO FINANCEIRA</span>
            <h2>Simulador de rentabilidade</h2>
          </div>
          <CircleDollarSign size={23} />
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Produto</span>
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.brand} - {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Quantidade de sacos</span>
            <input
              type="number"
              min="0"
              step="1"
              value={bags}
              onChange={(event) => setBags(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Outras despesas da produção (R$)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={extraCosts}
              onChange={(event) => setExtraCosts(event.target.value)}
              placeholder="Energia, mão de obra, embalagem..."
            />
          </label>
        </div>

        <p className="map-note">
          Informe as despesas adicionais referentes ao lote simulado.
          O custo dos ingredientes é calculado automaticamente pela fórmula cadastrada.
        </p>
      </section>

      {financial && product && (
        <>
          <section className="finance-kpis">
            <article className="kpi-card">
              <div className="kpi-top">
                <span>Faturamento potencial</span>
                <TrendingUp size={18} />
              </div>
              <strong>{formatCurrency(financial.revenue)}</strong>
              <p>{formatNumber(quantity, 0)} sacos × {formatCurrency(product.salePrice)}</p>
            </article>

            <article className="kpi-card">
              <div className="kpi-top">
                <span>Custo dos ingredientes</span>
                <Package size={18} />
              </div>
              <strong>{formatCurrency(financial.totalIngredientCost)}</strong>
              <p>{formatCurrency(financial.ingredientCostPerBag)} por saco</p>
            </article>

            <article className="kpi-card">
              <div className="kpi-top">
                <span>Custo total estimado</span>
                <Wallet size={18} />
              </div>
              <strong>{formatCurrency(financial.totalCosts)}</strong>
              <p>Ingredientes + outras despesas</p>
            </article>

            <article className="kpi-card">
              <div className="kpi-top">
                <span>Resultado estimado</span>
                <Calculator size={18} />
              </div>
              <strong>{formatCurrency(financial.result)}</strong>
              <p>Margem: {formatNumber(financial.margin)}%</p>
            </article>
          </section>

          <section className="panel finance-breakdown">
            <div className="section-heading">
              <div>
                <span className="eyebrow">COMPOSIÇÃO FINANCEIRA</span>
                <h2>Resultado da simulação</h2>
              </div>
            </div>

            <div className="finance-line">
              <span>Receita potencial</span>
              <strong>{formatCurrency(financial.revenue)}</strong>
            </div>

            <div className="finance-line">
              <span>Custo de matérias-primas</span>
              <strong>{formatCurrency(financial.totalIngredientCost)}</strong>
            </div>

            <div className="finance-line">
              <span>Outras despesas informadas</span>
              <strong>{formatCurrency(expenses)}</strong>
            </div>

            <div className="finance-line finance-total">
              <span>Resultado estimado</span>
              <strong>{formatCurrency(financial.result)}</strong>
            </div>

            <div className="finance-line">
              <span>Custo dos ingredientes por kg</span>
              <strong>{formatCurrency(financial.costPerKg)}</strong>
            </div>

            <div className="finance-line">
              <span>Peso total da fórmula</span>
              <strong>{formatNumber(financial.formulaWeight)} kg</strong>
            </div>

            <div className="finance-line">
              <span>Matérias-primas cadastradas</span>
              <strong>{rawMaterials.length}</strong>
            </div>
          </section>
        </>
      )}

      <section className="panel finance-breakdown">
        <div className="section-heading"><div><span className="eyebrow">PRODUÇÃO REGISTRADA</span><h2>Histórico financeiro estimado</h2></div></div>
        <div className="finance-line"><span>Apontamentos gravados</span><strong>{productionRecords.length}</strong></div>
        <div className="finance-line"><span>Receita potencial registrada</span><strong>{formatCurrency(productionRecords.reduce((sum, item) => sum + Number(item.estimated_revenue || 0), 0))}</strong></div>
        <div className="finance-line"><span>Custo de ingredientes registrado</span><strong>{formatCurrency(productionRecords.reduce((sum, item) => sum + Number(item.ingredient_cost || 0), 0))}</strong></div>
        <div className="finance-line"><span>Resultado bruto estimado</span><strong>{formatCurrency(productionRecords.reduce((sum, item) => sum + Number(item.estimated_revenue || 0) - Number(item.ingredient_cost || 0), 0))}</strong></div>
      </section>
      <div className="production-warning">
        <strong>Indicadores gerenciais estimados — não é DRE contábil.</strong>
        <p>A simulação usa o cadastro atual de produtos, fórmulas e custos. O histórico soma os valores gravados em cada apontamento, preservando o custo e a receita registrados naquela data. Não inclui impostos, comissões, fretes, perdas ou despesas administrativas que não tenham sido lançadas.</p>
      </div>
    </div>
  )
}

export default Finance
