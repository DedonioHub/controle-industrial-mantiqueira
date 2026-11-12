
import { useEffect, useMemo, useState } from 'react'
import {
  Package,
  Calculator,
  TrendingUp,
  Wheat,
  Plus,
  Trash2,
  Gauge,
  Save,
  CalendarDays,
  Clock,
  History,
  RefreshCw,
} from 'lucide-react'

import { formatCurrency, formatNumber } from './utils/calculations'

interface Period {
  id: number
  frequency: string
  startTime: string
  endTime: string
}

function localDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function timeToMinutes(time: string) {
  if (!time || !time.includes(':')) return 0
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function durationBetween(start: string, end: string) {
  let duration = timeToMinutes(end) - timeToMinutes(start)
  if (duration < 0) duration += 1440
  return duration
}

function minutesToHours(minutes: number) {
  return minutes / 60
}

function distributeBags(totalBags: number, weights: number[]) {
  const totalWeight = weights.reduce((sum, value) => sum + value, 0)

  if (totalWeight <= 0) return weights.map(() => 0)

  const exact = weights.map((weight) => totalBags * weight / totalWeight)
  const rounded = exact.map(Math.floor)
  let remaining = totalBags - rounded.reduce((sum, value) => sum + value, 0)

  const order = exact
    .map((value, index) => ({
      index,
      remainder: value - rounded[index],
    }))
    .sort((a, b) => b.remainder - a.remainder)

  for (let i = 0; i < remaining; i++) {
    rounded[order[i].index] += 1
  }

  return rounded
}

function Production() {
  const [products, setProducts] = useState<DatabaseProduct[]>([])
  const [rawMaterials, setRawMaterials] = useState<StockMaterial[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [productId, setProductId] = useState('')
  const [productionDate, setProductionDate] = useState(localDate())
  const [bags, setBags] = useState('890')
  const [startTime, setStartTime] = useState('07:30')
  const [endTime, setEndTime] = useState('20:00')
  const [stoppageMinutes, setStoppageMinutes] = useState('0')
  const [notes, setNotes] = useState('')

  const [periods, setPeriods] = useState<Period[]>([
    { id: 1, frequency: '9', startTime: '07:30', endTime: '15:00' },
    { id: 2, frequency: '6', startTime: '15:00', endTime: '20:00' },
  ])

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [historyDate, setHistoryDate] = useState(localDate())
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([window.mantiqueira.products.list(), window.mantiqueira.stock.list()])
      .then(([productData, materialData]) => {
        if (!active) return
        setProducts(productData)
        setRawMaterials(materialData)
        setProductId((current) => productData.some((item) => item.id === current) ? current : (productData[0]?.id ?? ''))
      })
      .catch((error) => {
        console.error(error)
        if (active) setMessage('Não foi possível carregar produtos e fórmulas do banco local.')
      })
      .finally(() => { if (active) setCatalogLoading(false) })
    return () => { active = false }
  }, [])

  const product = products.find((item) => item.id === productId)
  const quantity = Number(bags)

  const totalMinutes = durationBetween(startTime, endTime)
  const stoppedMinutes = Math.max(0, Number(stoppageMinutes) || 0)
  const netMinutes = Math.max(0, totalMinutes - stoppedMinutes)

  const periodData = useMemo(() => {
    return periods.map((period) => {
      const durationMinutes = durationBetween(
        period.startTime,
        period.endTime,
      )
      const frequencyHz = Math.max(0, Number(period.frequency) || 0)

      return {
        ...period,
        durationMinutes,
        frequencyHz,
        weight: durationMinutes * frequencyHz,
      }
    })
  }, [periods])

  const estimatedBags = distributeBags(
    Number.isInteger(quantity) && quantity >= 0 ? quantity : 0,
    periodData.map((period) => period.weight),
  )

  const totalKg = product && Number.isInteger(quantity) && quantity >= 0
    ? quantity * product.bagWeightKg
    : 0

  const formulaWeight = product
    ? product.formula.reduce((sum, item) => sum + item.quantityKg, 0)
    : 0

  const formulaCost = product
    ? product.formula.reduce((sum, item) => {
        const material = rawMaterials.find(
          (raw) => raw.id === item.materialId,
        )
        return sum + item.quantityKg * (material?.costPerKg ?? 0)
      }, 0)
    : 0

  const costPerKg = formulaWeight > 0 ? formulaCost / formulaWeight : 0
  const ingredientCost = totalKg * costPerKg
  const estimatedRevenue = product ? quantity * product.salePrice : 0
  const grossResult = estimatedRevenue - ingredientCost
  const grossMargin = estimatedRevenue > 0
    ? grossResult / estimatedRevenue * 100
    : 0

  const productionHours = minutesToHours(netMinutes)
  const productivity = productionHours > 0
    ? totalKg / 1000 / productionHours
    : 0

  const millingHours = periodData.length > 0
    ? minutesToHours(periodData[0].durationMinutes)
    : 0

  const millingTonsPerHour = millingHours > 0
    ? totalKg / 1000 / millingHours
    : 0

  const periodsValid = periodData.length > 0 &&
    periodData.every((period) =>
      period.durationMinutes > 0 && period.frequencyHz > 0,
    )

  const periodMinutes = periodData.reduce(
    (sum, period) => sum + period.durationMinutes,
    0,
  )

  const timeValid = totalMinutes > 0 &&
    stoppedMinutes < totalMinutes &&
    periodMinutes <= totalMinutes

  const quantityValid = Number.isInteger(quantity) && quantity > 0

  function updatePeriod(
    id: number,
    field: keyof Period,
    value: string,
  ) {
    setPeriods((current) =>
      current.map((period) =>
        period.id === id ? { ...period, [field]: value } : period,
      ),
    )
  }

  function addPeriod() {
    const lastPeriod = periods[periods.length - 1]

    setPeriods((current) => [
      ...current,
      {
        id: Math.max(0, ...current.map((period) => period.id)) + 1,
        frequency: lastPeriod?.frequency || '9',
        startTime: lastPeriod?.endTime || '20:00',
        endTime: lastPeriod?.endTime || '20:00',
      },
    ])
  }

  function removePeriod(id: number) {
    setPeriods((current) => current.filter((period) => period.id !== id))
  }

  async function loadHistory(date = historyDate) {
    setLoadingHistory(true)

    try {
      const records = await window.mantiqueira.production.list({ date })
      setHistory(records)
    } catch (error) {
      console.error(error)
      setMessage('Não foi possível carregar o histórico.')
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  async function saveProduction() {
    setMessage('')

    if (!product) {
      setMessage('Selecione um produto.')
      return
    }

    if (!productionDate || !quantityValid) {
      setMessage('Informe uma data e uma quantidade válida de sacos.')
      return
    }

    if (!timeValid || !periodsValid) {
      setMessage('Confira os horários, paradas e períodos da extrusora.')
      return
    }

    const allocatedBags = distributeBags(
      quantity,
      periodData.map((period) => period.weight),
    )

    const periodRecords = periodData.map((period, index) => {
      const periodBags = allocatedBags[index]
      const periodKg = periodBags * product.bagWeightKg
      const hours = minutesToHours(period.durationMinutes)

      return {
        number: index + 1,
        startTime: period.startTime,
        endTime: period.endTime,
        durationMinutes: period.durationMinutes,
        frequencyHz: period.frequencyHz,
        bags: periodBags,
        totalKg: periodKg,
        tonsPerHour: hours > 0 ? periodKg / 1000 / hours : 0,
        isEstimated: true,
      }
    })

    setSaving(true)

    try {
      const result = await window.mantiqueira.production.save({
        productId,
        bags: quantity,
        totalKg,
        ingredientCost,
        estimatedRevenue,
        productionDate,
        notes,
        startTime,
        endTime,
        totalMinutes,
        stoppageMinutes: stoppedMinutes,
        millingTonsPerHour,
        periods: periodRecords,
      })

      if (result.success) {
        setMessage(`Produção salva com sucesso! Registro nº ${result.id}.`)
        await loadHistory(productionDate)
        setHistoryDate(productionDate)
      } else {
        setMessage('Não foi possível salvar a produção.')
      }
    } catch (error) {
      console.error(error)
      setMessage(
        error instanceof Error
          ? `Erro ao salvar: ${error.message}`
          : 'Erro ao salvar a produção.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="production-page">

      <section className="panel production-form">
        <div className="section-heading">
          <div>
            <span className="eyebrow">REGISTRO INDUSTRIAL</span>
            <h2>Novo apontamento de produção</h2>
            <p className="section-description">
              Registre a produção diária da fábrica.
            </p>
          </div>
          <Calculator size={24} />
        </div>

        {catalogLoading && <div className="empty-state"><strong>Carregando produtos...</strong></div>}
        <div className="form-grid">
          <label className="field">
            <span>Data da produção</span>
            <input
              type="date"
              value={productionDate}
              onChange={(event) => setProductionDate(event.target.value)}
            />
          </label>

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
              min="1"
              step="1"
              value={bags}
              onChange={(event) => setBags(event.target.value)}
              placeholder="Ex.: 890"
            />
          </label>

          <label className="field">
            <span>Horário de início</span>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Horário de término</span>
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Paradas (minutos)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={stoppageMinutes}
              onChange={(event) => setStoppageMinutes(event.target.value)}
            />
          </label>
        </div>

        {product && (
          <div className="product-info">
            <span>Embalagem: <strong>{formatNumber(product.bagWeightKg)} kg</strong></span>
            <span>Preço de venda: <strong>{formatCurrency(product.salePrice)}</strong></span>
            <span>Fórmula: <strong>{formatNumber(formulaWeight)} kg</strong></span>
          </div>
        )}

        <label className="field production-notes">
          <span>Observações do turno</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Registre ocorrências, ajustes ou observações..."
            rows={3}
          />
        </label>
      </section>

      <section className="panel production-form">
        <div className="section-heading">
          <div>
            <span className="eyebrow">EXTRUSORA E130</span>
            <h2>Períodos de operação</h2>
            <p className="section-description">
              Informe os horários e a frequência utilizada em cada período.
            </p>
          </div>
          <Gauge size={24} />
        </div>

        <div className="period-list">
          {periodData.map((period, index) => (
            <div className="period-row" key={period.id}>
              <div className="period-title">PERÍODO {index + 1}</div>

              <label className="field">
                <span>Frequência (Hz)</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={period.frequency}
                  onChange={(event) =>
                    updatePeriod(period.id, 'frequency', event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Início</span>
                <input
                  type="time"
                  value={period.startTime}
                  onChange={(event) =>
                    updatePeriod(period.id, 'startTime', event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Término</span>
                <input
                  type="time"
                  value={period.endTime}
                  onChange={(event) =>
                    updatePeriod(period.id, 'endTime', event.target.value)
                  }
                />
              </label>

              <div className="period-metric">
                <span>Duração</span>
                <strong>{formatNumber(period.durationMinutes / 60)} h</strong>
              </div>

              <div className="period-metric">
                <span>Sacos estimados</span>
                <strong>{formatNumber(estimatedBags[index], 0)}</strong>
              </div>

              <div className="period-metric">
                <span>Produção estimada</span>
                <strong>
                  {formatNumber(
                    estimatedBags[index] * (product?.bagWeightKg || 0) / 1000,
                  )} ton
                </strong>
              </div>

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
        </div>

        <button className="add-period-button" onClick={addPeriod} type="button">
          <Plus size={17} /> Adicionar período
        </button>

        <div className="period-summary">
          <div>
            <span>Tempo total</span>
            <strong>{formatNumber(totalMinutes / 60)} h</strong>
          </div>
          <div>
            <span>Tempo líquido</span>
            <strong>{formatNumber(netMinutes / 60)} h</strong>
          </div>
          <div>
            <span>Frequência média</span>
            <strong>
              {formatNumber(
                periodData.reduce((sum, period) => sum + period.weight, 0) /
                Math.max(1, periodMinutes),
              )} Hz
            </strong>
          </div>
          <div>
            <span>Produtividade média</span>
            <strong>{formatNumber(productivity)} ton/h</strong>
          </div>
        </div>

        <div className="period-validation">
          <strong>Distribuição estimada dos sacos</strong>
          <p>
            A distribuição considera a frequência e a duração de cada período.
            É uma estimativa matemática, não uma medição individual da produção.
          </p>
          {periodMinutes > totalMinutes && (
            <p className="production-error">
              A soma dos períodos ultrapassa o tempo total da produção.
            </p>
          )}
        </div>
      </section>

      <section className="panel production-form">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PROCESSO DE MOAGEM</span>
            <h2>Necessidade estimada do moinho</h2>
            <p className="section-description">
              Estimativa da vazão média necessária, considerando a massa total do lote e a duração do primeiro período informado.
            </p>
          </div>
          <Wheat size={24} />
        </div>

        <div className="period-summary">
          <div>
            <span>Base do cálculo</span>
            <strong>Massa total do lote</strong>
          </div>
          <div>
            <span>Produção total em massa</span>
            <strong>{formatNumber(totalKg)} kg</strong>
          </div>
          <div>
            <span>Tempo do primeiro período</span>
            <strong>{formatNumber(millingHours)} h</strong>
          </div>
          <div>
            <span>Capacidade necessária do moinho</span>
            <strong>{formatNumber(millingTonsPerHour)} ton/h</strong>
          </div>
        </div>

        <p className="map-note">
          Este valor é uma estimativa de vazão necessária, não uma medição real da capacidade do moinho. O sistema não presume saldo inicial de silo nem desconta matéria-prima automaticamente.
        </p>
      </section>

      <section className="production-results">
        <article className="kpi-card">
          <div className="kpi-top">
            <span>Total produzido</span>
            <Package size={19} />
          </div>
          <strong>{formatNumber(totalKg / 1000)} <small>ton</small></strong>
          <p>{formatNumber(quantity || 0, 0)} sacos produzidos</p>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <span>Custo de ingredientes</span>
            <Wheat size={19} />
          </div>
          <strong>{formatCurrency(ingredientCost)}</strong>
          <p>Custo proporcional da fórmula</p>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <span>Faturamento potencial</span>
            <TrendingUp size={19} />
          </div>
          <strong>{formatCurrency(estimatedRevenue)}</strong>
          <p>Venda potencial de todos os sacos</p>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <span>Margem bruta estimada</span>
            <Calculator size={19} />
          </div>
          <strong>{formatNumber(grossMargin)} <small>%</small></strong>
          <p>Resultado: {formatCurrency(grossResult)}</p>
        </article>
      </section>

      <section className="panel production-form">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FINALIZAÇÃO</span>
            <h2>Salvar apontamento</h2>
            <p className="section-description">
              O registro será armazenado no banco local do computador.
            </p>
          </div>
          <Save size={24} />
        </div>

        <button
          className="add-period-button production-save-button"
          type="button"
          onClick={saveProduction}
          disabled={saving || catalogLoading || !product || !quantityValid || !timeValid || !periodsValid}
        >
          {saving ? <RefreshCw size={18} /> : <Save size={18} />}
          {saving ? 'Salvando produção...' : 'Salvar produção no histórico'}
        </button>

        {message && (
          <div className="period-validation">
            {message}
          </div>
        )}
      </section>

      <section className="panel production-form">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CONSULTA DE REGISTROS</span>
            <h2>Histórico de produção</h2>
            <p className="section-description">
              Consulte os apontamentos gravados por dia.
            </p>
          </div>
          <History size={24} />
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Data para consulta</span>
            <input
              type="date"
              value={historyDate}
              onChange={(event) => setHistoryDate(event.target.value)}
            />
          </label>

          <div className="field history-action">
            <span>Consultar registros</span>
            <button
              className="add-period-button"
              type="button"
              onClick={() => loadHistory()}
              disabled={loadingHistory}
            >
              <CalendarDays size={17} />
              {loadingHistory ? 'Consultando...' : 'Buscar dia'}
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="empty-state">
            <Clock size={25} />
            <strong>Nenhuma produção encontrada nesta data.</strong>
            <span>Quando houver lançamentos, eles aparecerão aqui.</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="consumption-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Sacos</th>
                  <th>Toneladas</th>
                  <th>Horário</th>
                  <th>Períodos</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id}>
                    <td>{record.product_name || record.product_id}</td>
                    <td>{formatNumber(record.bags, 0)}</td>
                    <td>{formatNumber(record.total_kg / 1000)}</td>
                    <td>
                      {record.start_time || '--:--'} às {record.end_time || '--:--'}
                    </td>
                    <td>{record.periods?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  )
}

export default Production
