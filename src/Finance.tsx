
import { useEffect, useMemo, useState } from 'react'
import {
  CircleDollarSign,
  TrendingUp,
  Wallet,
  Calculator,
  Package,
  CalendarDays,
  Search,
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
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [historySearch, setHistorySearch] = useState('')

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
  const [bags, setBags] = useState('0')
  const [extraCosts, setExtraCosts] = useState('0')

  const product = products.find((item) => item.id === productId)
  const quantity = Math.max(0, Number(bags) || 0)
  const expenses = Math.max(0, Number(extraCosts) || 0)

  const filteredProduction = useMemo(() => productionRecords.filter((record) => {
    const date = record.production_date || ''
    const name = (record.product_name || record.product_id).toLowerCase()
    return (!fromDate || date >= fromDate) &&
      (!toDate || date <= toDate) &&
      name.includes(historySearch.toLowerCase())
  }), [productionRecords, fromDate, toDate, historySearch])

  const recordedRevenue = filteredProduction.reduce((sum, item) => sum + Number(item.estimated_revenue || 0), 0)
  const recordedCost = filteredProduction.reduce((sum, item) => sum + Number(item.ingredient_cost || 0), 0)
  const recordedBags = filteredProduction.reduce((sum, item) => sum + Number(item.bags || 0), 0)

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
      <section className="finance-hero">
        <div><span className="eyebrow">GESTÃO E RENTABILIDADE</span><h2>Financeiro industrial</h2><p>Compare a rentabilidade estimada dos produtos e acompanhe os valores registrados nos apontamentos de produção.</p></div>
        <div className="finance-hero-mark"><CircleDollarSign size={30}/><span>CONTROLE GERENCIAL</span></div>
      </section>
      <section className="panel finance-form">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GESTÃO FINANCEIRA</span>
            <h2>Simulador de lote</h2>
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
            <span>Quantidade de sacos para simular</span>
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

      <section className="panel finance-history">
        <div className="section-heading"><div><span className="eyebrow">DADOS DO BANCO LOCAL</span><h2>Resultado dos apontamentos</h2><p className="section-description">Valores históricos gravados no momento de cada produção, sem recalcular custos antigos.</p></div><CalendarDays size={22}/></div>
        <div className="finance-history-filters">
          <label className="field"><span>De</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)}/></label>
          <label className="field"><span>Até</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)}/></label>
          <label className="products-search"><Search size={16}/><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Filtrar por produto..."/></label>
        </div>
        <div className="finance-history-kpis">
          <div><span>Apontamentos</span><strong>{filteredProduction.length}</strong></div>
          <div><span>Sacos produzidos</span><strong>{formatNumber(recordedBags, 0)}</strong></div>
          <div><span>Receita estimada</span><strong>{formatCurrency(recordedRevenue)}</strong></div>
          <div><span>Custo de ingredientes</span><strong>{formatCurrency(recordedCost)}</strong></div>
          <div><span>Resultado bruto estimado</span><strong>{formatCurrency(recordedRevenue - recordedCost)}</strong></div>
        </div>
        <div className="table-scroll"><table className="consumption-table finance-table"><thead><tr><th>Data</th><th>Produto</th><th>Sacos</th><th>Receita estimada</th><th>Custo ingredientes</th><th>Resultado</th></tr></thead><tbody>
          {filteredProduction.map((record) => {
            const revenue = Number(record.estimated_revenue || 0)
            const cost = Number(record.ingredient_cost || 0)
            return <tr key={record.id}><td>{record.production_date ? new Date(record.production_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td><td>{record.product_name || record.product_id}</td><td>{formatNumber(record.bags, 0)}</td><td>{formatCurrency(revenue)}</td><td>{formatCurrency(cost)}</td><td>{formatCurrency(revenue - cost)}</td></tr>
          })}
        </tbody></table></div>
        {filteredProduction.length === 0 && <div className="empty-state"><Package size={25}/><strong>Nenhum apontamento nesse filtro.</strong><span>Registros de produção aparecerão aqui depois de salvos.</span></div>}
      </section>
      <div className="production-warning">
        <strong>Leitura gerencial — não substitui a DRE contábil.</strong>
        <p>A simulação usa o cadastro atual de produtos, fórmulas e custos. O histórico soma os valores gravados em cada apontamento, preservando o custo e a receita registrados naquela data. Não inclui impostos, comissões, fretes, perdas ou despesas administrativas que não tenham sido lançadas.</p>
      </div>
    </div>
  )
}

export default Finance
