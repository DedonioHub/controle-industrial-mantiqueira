
import { useMemo, useState } from 'react'
import {
  CalendarDays,
  ChartNoAxesCombined,
  Clock,
  Factory,
  Package,
  Search,
  TrendingUp,
} from 'lucide-react'
import { products } from './data/initialData'
import { formatNumber } from './utils/calculations'

interface ProductionRecord {
  id: number
  date: string
  productId: string
  bags: number
  hours: number
  frequency: number
  stoppageHours: number
}

function Reports() {
  const [records] = useState<ProductionRecord[]>([])
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const product = products.find((item) => item.id === record.productId)
      const matchesSearch = product?.name.toLowerCase().includes(search.toLowerCase())

      const matchesProduct =
        productFilter === 'all' || record.productId === productFilter

      const recordDate = new Date(`${record.date}T12:00:00`)
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
  const totalTons = totalBags * 15 / 1000
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
              {products.map((product) => (
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
                const rate = record.hours > 0 ? tons / record.hours : 0

                return (
                  <tr key={record.id}>
                    <td>{new Date(`${record.date}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                    <td>{product?.name ?? 'Produto não encontrado'}</td>
                    <td>{formatNumber(record.bags, 0)}</td>
                    <td>{formatNumber(tons)}</td>
                    <td>{formatNumber(record.hours)}</td>
                    <td>{formatNumber(record.frequency)} Hz</td>
                    <td>{formatNumber(rate)} ton/h</td>
                    <td>{formatNumber(record.stoppageHours)} h</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="empty-state">
            <CalendarDays size={28} />
            <strong>Nenhum registro encontrado.</strong>
            <span>Os apontamentos aparecerão aqui quando o histórico de produção estiver conectado.</span>
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

      <div className="production-warning">
        <strong>Histórico ainda não conectado.</strong>
        <p>Esta tela está preparada para receber os registros reais. Os dados da produção serão salvos permanentemente quando conectarmos o banco de dados. Nenhuma produção fictícia foi inserida.</p>
      </div>
    </div>
  )
}

export default Reports
