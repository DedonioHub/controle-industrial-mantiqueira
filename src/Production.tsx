
import { useState } from 'react'
import {
  Package,
  Calculator,
  TrendingUp,
  Wheat,
  Plus,
  Trash2,
  Gauge,
} from 'lucide-react'
import { products } from './data/initialData'
import {
  calculateProduction,
  formatCurrency,
  formatNumber,
} from './utils/calculations'

interface ProductionPeriod {
  id: number
  frequency: string
  hours: string
  bags: string
}

function Production() {
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [bags, setBags] = useState('890')
  const [periods, setPeriods] = useState<ProductionPeriod[]>([
    { id: 1, frequency: '9', hours: '7.5', bags: '' },
    { id: 2, frequency: '6', hours: '5', bags: '' },
  ])
  const [startSilo, setStartSilo] = useState('0')
  const [endSilo, setEndSilo] = useState('0')
  const [stoppageHours, setStoppageHours] = useState('0')
  const [millingContinuous, setMillingContinuous] = useState(true)

  const product = products.find((item) => item.id === productId)
  const quantity = Number(bags)

  const estimate =
    product && Number.isInteger(quantity) && quantity >= 0
      ? calculateProduction(product, quantity)
      : null

  const totalHours = periods.reduce(
    (sum, period) => sum + Math.max(0, Number(period.hours) || 0),
    0,
  )

  const weightedFrequency = totalHours > 0
    ? periods.reduce(
        (sum, period) =>
          sum + (Number(period.frequency) || 0) * (Number(period.hours) || 0),
        0,
      ) / totalHours
    : 0

  const productionHours = Math.max(
    0,
    totalHours - Math.max(0, Number(stoppageHours) || 0),
  )

  const productivity =
    estimate && productionHours > 0
      ? estimate.totalKg / 1000 / productionHours
      : 0

  const measuredBags = periods.reduce(
    (sum, period) => sum + (period.bags.trim() ? Number(period.bags) || 0 : 0),
    0,
  )

  const hasMeasuredBags = periods.some((period) => period.bags.trim() !== '')

  function updatePeriod(
    id: number,
    field: keyof ProductionPeriod,
    value: string,
  ) {
    setPeriods((current) =>
      current.map((period) =>
        period.id === id ? { ...period, [field]: value } : period,
      ),
    )
  }

  function addPeriod() {
    setPeriods((current) => [
      ...current,
      {
        id: Math.max(0, ...current.map((period) => period.id)) + 1,
        frequency: '9',
        hours: '',
        bags: '',
      },
    ])
  }

  function removePeriod(id: number) {
    setPeriods((current) => current.filter((period) => period.id !== id))
  }

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
            <span>Total produzido (sacos)</span>
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

      <section className="panel production-form">
        <div className="section-heading">
          <div>
            <span className="eyebrow">EXTRUSORA E130</span>
            <h2>Períodos de operação</h2>
          </div>
          <Gauge size={22} />
        </div>

        <p className="section-description">
          Separe o dia em períodos conforme a frequência utilizada na extrusora.
        </p>

        {periods.map((period, index) => (
          <div className="period-row" key={period.id}>
            <div className="period-title">PERÍODO {index + 1}</div>

            <label className="field">
              <span>Frequência (Hz)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={period.frequency}
                onChange={(event) =>
                  updatePeriod(period.id, 'frequency', event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Duração (horas)</span>
              <input
                type="number"
                min="0"
                step="0.25"
                value={period.hours}
                onChange={(event) =>
                  updatePeriod(period.id, 'hours', event.target.value)
                }
                placeholder="Ex.: 7.5"
              />
            </label>

            <label className="field">
              <span>Sacos neste período</span>
              <input
                type="number"
                min="0"
                step="1"
                value={period.bags}
                onChange={(event) =>
                  updatePeriod(period.id, 'bags', event.target.value)
                }
                placeholder="Opcional"
              />
            </label>

            <button
              className="period-delete"
              onClick={() => removePeriod(period.id)}
              aria-label="Excluir período"
              type="button"
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}

        <button className="add-period-button" onClick={addPeriod} type="button">
          <Plus size={16} /> Adicionar período
        </button>

        <div className="period-summary">
          <div>
            <span>Horas registradas</span>
            <strong>{formatNumber(totalHours)} h</strong>
          </div>
          <div>
            <span>Frequência média ponderada</span>
            <strong>{formatNumber(weightedFrequency)} Hz</strong>
          </div>
          <div>
            <span>Horas descontando paradas</span>
            <strong>{formatNumber(productionHours)} h</strong>
          </div>
          <div>
            <span>Produtividade estimada</span>
            <strong>{formatNumber(productivity)} ton/h</strong>
          </div>
        </div>

        <p className="map-note">
          A produtividade considera o total de sacos informado dividido pelas
          horas líquidas. Os sacos por período são opcionais, mas devem ser
          preenchidos para conhecer a produção real em cada frequência.
        </p>

        {hasMeasuredBags && (
          <div className="period-validation">
            {measuredBags === quantity
              ? 'A soma dos sacos dos períodos confere com o total produzido.'
              : `Atenção: os períodos somam ${formatNumber(measuredBags, 0)} sacos, mas o total informado é ${formatNumber(quantity, 0)}.`}
          </div>
        )}
      </section>

      <section className="panel production-form">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CONTROLE DE PROCESSO</span>
            <h2>Silo pulmão e moagem</h2>
          </div>
          <Wheat size={22} />
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Silo no início (toneladas)</span>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={startSilo}
              onChange={(event) => setStartSilo(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Silo no final (toneladas)</span>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={endSilo}
              onChange={(event) => setEndSilo(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Paradas (horas)</span>
            <input
              type="number"
              min="0"
              step="0.25"
              value={stoppageHours}
              onChange={(event) => setStoppageHours(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Moagem contínua?</span>
            <select
              value={millingContinuous ? 'yes' : 'no'}
              onChange={(event) => setMillingContinuous(event.target.value === 'yes')}
            >
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </select>
          </label>
        </div>

        <div className="product-info">
          <span>Silo inicial: <strong>{formatNumber(Number(startSilo) || 0)} t</strong></span>
          <span>Silo final: <strong>{formatNumber(Number(endSilo) || 0)} t</strong></span>
          <span>Moagem: <strong>{millingContinuous ? 'Contínua' : 'Intermitente'}</strong></span>
        </div>
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
              <p>Venda potencial de todos os sacos</p>
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
            <p>Os valores ainda não alteram o estoque nem ficam salvos no histórico. Isso será implementado com o banco de dados.</p>
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
