
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChartNoAxesCombined,
  Clock,
  Factory,
  Package,
  Search,
  TrendingUp,
} from 'lucide-react'
import { formatNumber } from './utils/calculations'

interface ProductionRecord {
  id: number
  production_date: string
  product_id: string
  product_name?: string
  bags: number
  total_kg: number
  total_minutes: number
  stoppage_minutes: number
  periods?: Array<{ duration_minutes: number; frequency_hz: number }>
}

function Reports() {
  const [records, setRecords] = useState<ProductionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    window.mantiqueira.production.list()
      .then((data) => { if (active) setRecords(data as ProductionRecord[]) })
      .catch((error) => {
        console.error(error)
        if (active) setLoadError('Não foi possível carregar o histórico do banco local.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch = (record.product_name || record.product_id).toLowerCase().includes(search.toLowerCase())

      const matchesProduct =
        productFilter === 'all' || record.product_id === productFilter

      const recordDate = new Date(`${record.production_date}T12:00:00`)
      const now = new Date()
      const daysAgo = Math.floor(
        (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24),
      )

      const matchesPeriod =
        periodFilter === 'all' ||
        (periodFilter === '7' && daysAgo <= 7) ||
        (periodFilter === '30' && daysAgo <= 30)

      return matchesSearch && matchesProduct && matchesPeriod
    })
  }, [records, search, productFilter, periodFilter])

  const totalBags = filteredRecords.reduce((sum, item) => sum + item.bags, 0)
  const totalHours = filteredRecords.reduce((sum, item) => sum + item.hours, 0)
  const totalStoppages = filteredRecords.reduce(
    (sum, item) => sum + item.stoppageHours,
    0,
  )
  const totalTons = filteredRecords.reduce((sum, item) => sum + Number(item.total_kg || 0), 0) / 1000
  const productivity = totalHours > 0 ? totalTons / totalHours : 0

  return (
    <div className="reports-page">
      <section className="reports-kpis">
        <article className="kpi-card">
          <div className="kpi-top"><span>Total produzido</span><Package size={18} /></div>
          <strong>{formatNumber(totalBags, 0)} <small>sacos</small></strong>
          <p>Registros do período selecionado</p>
        </article>

        <article className="kpi-card">
          <div className="kpi-top"><span>Produção total</span><Factory size={18} /></div>
          <strong>{formatNumber(totalTons)} <small>ton</small></strong>
          <p>Considerando embalagens de 15 kg</p>
        </article>

        <article className="kpi-card">
          <div className="kpi-top"><span>Horas trabalhadas</span><Clock size={18} /></div>
          <strong>{formatNumber(totalHours)} <small>h</small></strong>
          <p>Horas registradas nos apontamentos</p>
        </article>

        <article className="kpi-card">
          <div className="kpi-top"><span>Produtividade média</span><TrendingUp size={18} /></div>
          <strong>{formatNumber(productivity)} <small>ton/h</small></strong>
          <p>Produção dividida pelas horas registradas</p>
        </article>
      </section>

      <section className="panel reports-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DESEMPENHO INDUSTRIAL</span>
            <h2>Histórico de produção</h2>
          </div>
          <ChartNoAxesCombined size={22} />
        </div>

        <div className="reports-filters">
          <label className="stock-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar produto..."
            />
          </label>

          <label className="field">
            <span>Produto</span>
            <select
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
            >
              <option value="all">Todos os produtos</option>
              {Array.from(new Map(records.map((record) => [record.product_id, { id: record.product_id, name: record.product_name || record.product_id }])).values()).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Período</span>
            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
            >
              <option value="all">Todo o histórico</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
          </label>
        </div>

        <div className="table-scroll">
          <table className="consumption-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Sacos</th>
                <th>Toneladas</th>
                <th>Horas</th>
                <th>Hz médio</th>
                <th>Produtividade</th>
                <th>Paradas</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const product = products.find(
                  (item) => item.id === record.productId,
                )
                const tons = record.bags * (product?.bagWeightKg ?? 15) / 1000
                const rate = (record.total_minutes || 0) / 60 > 0 ? tons / record.hours : 0

                return (
                  <tr key={record.id}>
                    <td>{new Date(`${record.date}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                    <td>{record.product_name ?? record.product_id}</td>
                    <td>{formatNumber(record.bags, 0)}</td>
                    <td>{formatNumber(tons)}</td>
                    <td>{formatNumber(hours)}</td>
                    <td>{formatNumber(frequency)} Hz</td>
                    <td>{formatNumber(rate)} ton/h</td>
                    <td>{formatNumber((record.stoppage_minutes || 0) / 60)} h</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {loading && <div className="empty-state"><strong>Carregando histórico...</strong></div>}
        {loadError && <div className="stock-message stock-error">{loadError}</div>}
        {!loading && filteredRecords.length === 0 && (
          <div className="empty-state">
            <CalendarDays size={28} />
            <strong>Nenhum registro encontrado.</strong>
            <span>Não há registros para os filtros selecionados.</span>
          </div>
        )}

        <div className="report-footer">
          <span>{filteredRecords.length} apontamentos encontrados</span>
          <strong>{formatNumber(totalBags, 0)} sacos no período</strong>
        </div>
      </section>

      <section className="panel stoppage-summary">
        <div>
          <span className="eyebrow">EFICIÊNCIA OPERACIONAL</span>
          <h2>Resumo de paradas</h2>
          <p>Tempo total de paradas registrado nos apontamentos selecionados.</p>
        </div>
        <strong>{formatNumber(totalStoppages)} <small>horas</small></strong>
      </section>


    </div>
  )
}

export default Reports
