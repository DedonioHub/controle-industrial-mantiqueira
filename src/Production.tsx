

import { useState } from 'react'
import { Package, Calculator, TrendingUp, Wheat } from 'lucide-react'
import { products } from './data/initialData'
import { calculateProduction, formatCurrency, formatNumber } from './utils/calculations'

function Production() {
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [bags, setBags] = useState('890')

  const product = products.find((item) => item.id === productId)
  const quantity = Number(bags)
  const estimate = product && Number.isInteger(quantity) && quantity >= 0
    ? calculateProduction(product, quantity)
    : null

  return (
    <div className="production-page">
      <section className="panel production-form">
        <div className="section-heading">
          <div>
            <span className="eyebrow">REGISTRO INDUSTRIAL</span>
            <h2>Novo apontamento de produção</h2>
          </div>
          <Calculator size={22} />
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Produto fabricado</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)}>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.brand} - {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Quantidade produzida (sacos)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={bags}
              onChange={(event) => setBags(event.target.value)}
              placeholder="Ex.: 890"
            />
          </label>
        </div>

        {product && (
          <div className="product-info">
            <span>Embalagem: <strong>{formatNumber(product.bagWeightKg)} kg</strong></span>
            <span>Preço de venda: <strong>{formatCurrency(product.salePrice)}</strong></span>
            <span>Fórmula: <strong>{formatNumber(product.formula.reduce((sum, item) => sum + item.quantityKg, 0))} kg</strong></span>
          </div>
        )}
      </section>

      {estimate ? (
        <>
          <section className="production-results">
            <article className="kpi-card">
              <div className="kpi-top"><span>Total produzido</span><Package size={18} /></div>
              <strong>{formatNumber(estimate.totalKg / 1000)} <small>ton</small></strong>
              <p>{formatNumber(estimate.bags, 0)} sacos produzidos</p>
            </article>

            <article className="kpi-card">
              <div className="kpi-top"><span>Custo de ingredientes</span><Wheat size={18} /></div>
              <strong>{formatCurrency(estimate.ingredientCost)}</strong>
              <p>Custo proporcional da fórmula</p>
            </article>

            <article className="kpi-card">
              <div className="kpi-top"><span>Faturamento potencial</span><TrendingUp size={18} /></div>
              <strong>{formatCurrency(estimate.estimatedRevenue)}</strong>
              <p>Considerando venda de todos os sacos</p>
            </article>

            <article className="kpi-card">
              <div className="kpi-top"><span>Margem bruta estimada</span><Calculator size={18} /></div>
              <strong>{formatNumber(estimate.grossMarginPercent)} <small>%</small></strong>
              <p>Antes das demais despesas</p>
            </article>
          </section>

          <section className="panel consumption-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">BAIXA PROPORCIONAL SIMULADA</span>
                <h2>Consumo de matérias-primas</h2>
              </div>
              <span className="live-label">SIMULAÇÃO</span>
            </div>

            <div className="table-scroll">
              <table className="consumption-table">
                <thead>
                  <tr>
                    <th>Matéria-prima</th>
                    <th>Consumo (kg)</th>
                    <th>Custo estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.consumption.map((item) => (
                    <tr key={item.materialId}>
                      <td>{item.name}</td>
                      <td>{formatNumber(item.quantityKg)}</td>
                      <td>{formatCurrency(item.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{formatNumber(estimate.consumption.reduce((sum, item) => sum + item.quantityKg, 0))} kg</td>
                    <td>{formatCurrency(estimate.ingredientCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <div className="production-warning">
            <strong>Atenção: simulação, não é um lançamento definitivo.</strong>
            <p>Os valores ainda não alteram o estoque nem ficam salvos no histórico. Vamos implementar o registro definitivo e a baixa de estoque após configurar o banco de dados.</p>
          </div>
        </>
      ) : (
        <section className="panel empty-state">
          <Calculator size={28} />
          <strong>Informe uma quantidade válida de sacos.</strong>
          <span>A quantidade deve ser um número inteiro igual ou maior que zero.</span>
        </section>
      )}
    </div>
  )
}

export default Production
