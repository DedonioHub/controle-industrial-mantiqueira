
import { useEffect, useState } from 'react'
import {
  Activity,
  Bell,
  Boxes,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Factory,
  Gauge,
  Package,
  Settings,
  Wheat,
  X,
} from 'lucide-react'

import Reports from './Reports'
import Finance from './Finance'
import Products from './Products'
import Stock from './Stock'
import Production from './Production'

const menuItems = [
  { id: 'overview', label: 'Visão geral', icon: Gauge },
  { id: 'production', label: 'Produção', icon: Factory },
  { id: 'stock', label: 'Estoque', icon: Boxes },
  { id: 'products', label: 'Produtos e fórmulas', icon: Wheat },
  { id: 'finance', label: 'Financeiro', icon: CircleDollarSign },
  { id: 'reports', label: 'Relatórios', icon: ChartNoAxesCombined },
]

function getToday() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(date: string) {
  if (!date) return ''
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function App() {
  const [activePage, setActivePage] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [databaseStatus, setDatabaseStatus] = useState('Verificando...')
  const [selectedDate, setSelectedDate] = useState(getToday())
  const [records, setRecords] = useState<ProductionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const currentPage =
    menuItems.find((item) => item.id === activePage)?.label ?? 'Visão geral'

  useEffect(() => {
    window.mantiqueira.database.getStatus()
      .then((status) => {
        setDatabaseStatus(
          status.connected
            ? 'Banco local conectado'
            : 'Banco local desconectado',
        )
      })
      .catch(() => setDatabaseStatus('Banco local desconectado'))
  }, [])

  useEffect(() => {
    let active = true

    async function loadProduction() {
      setLoading(true)
      setLoadError('')

      try {
        const result = await window.mantiqueira.production.list({
          date: selectedDate,
        })

        if (active) setRecords(result)
      } catch (error) {
        console.error(error)
        if (active) {
          setRecords([])
          setLoadError('Não foi possível consultar a produção deste dia.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProduction()

    return () => {
      active = false
    }
  }, [selectedDate])

  const totalBags = records.reduce(
    (sum, record) => sum + Number(record.bags || 0),
    0,
  )

  const totalKg = records.reduce(
    (sum, record) => sum + Number(record.total_kg || 0),
    0,
  )

  const totalTons = totalKg / 1000

  const allPeriods = records.flatMap((record) => record.periods || [])

  const totalPeriodMinutes = allPeriods.reduce(
    (sum, period) => sum + Number(period.duration_minutes || 0),
    0,
  )

  const weightedFrequency = totalPeriodMinutes > 0
    ? allPeriods.reduce(
        (sum, period) =>
          sum +
          Number(period.frequency_hz || 0) *
          Number(period.duration_minutes || 0),
        0,
      ) / totalPeriodMinutes
    : 0

  const latestRecord = records[0] as
    | (ProductionRecord & { milling_tons_per_hour?: number })
    | undefined

  const millingRate = latestRecord
    ? Number(latestRecord.milling_tons_per_hour || 0)
    : 0

  const productivity = totalPeriodMinutes > 0
    ? totalTons / (totalPeriodMinutes / 60)
    : 0

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Factory size={23} />
          </div>
          <div>
            <strong>MANTIQUEIRA</strong>
            <span>CONTROLE INDUSTRIAL</span>
          </div>
        </div>

        <div className="topbar-right">
          <span className="system-status">
            <i />
            {databaseStatus}
          </span>

          <button
            className="icon-button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notificações"
          >
            <Bell size={19} />
            <b className="notification-dot" />
          </button>

          <div className="user-avatar">WM</div>
        </div>
      </header>

      <div className="workspace">
        <main className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">CENTRAL DE OPERAÇÕES</span>
              <h1>{currentPage}</h1>
              <p>
                Acompanhamento da produção e dos processos industriais
                da Mantiqueira.
              </p>
            </div>

            {activePage === 'overview' && (
              <label className="overview-date">
                <span>DATA DO PAINEL</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </label>
            )}
          </div>

          {activePage === 'overview' ? (
            <div className="overview-page">
              <section className="kpi-grid">
                <article className="kpi-card">
                  <div className="kpi-top">
                    <span>Produção do dia</span>
                    <Package size={18} />
                  </div>
                  <strong>
                    {loading ? '...' : totalBags.toLocaleString('pt-BR')}
                    <small> sacos</small>
                  </strong>
                  <p>Apontamentos de {formatDate(selectedDate)}</p>
                </article>

                <article className="kpi-card">
                  <div className="kpi-top">
                    <span>Produção em toneladas</span>
                    <Activity size={18} />
                  </div>
                  <strong>
                    {loading ? '...' : totalTons.toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}
                    <small> ton</small>
                  </strong>
                  <p>Massa total registrada no dia</p>
                </article>

                <article className="kpi-card">
                  <div className="kpi-top">
                    <span>Moagem necessária</span>
                    <Wheat size={18} />
                  </div>
                  <strong>
                    {loading ? '...' : millingRate.toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}
                    <small> ton/h</small>
                  </strong>
                  <p>Conforme último apontamento do dia</p>
                </article>

                <article className="kpi-card">
                  <div className="kpi-top">
                    <span>Frequência média</span>
                    <Gauge size={18} />
                  </div>
                  <strong>
                    {loading ? '...' : weightedFrequency.toLocaleString('pt-BR', {
                      maximumFractionDigits: 1,
                    })}
                    <small> Hz</small>
                  </strong>
                  <p>Extrusora E130 nos períodos registrados</p>
                </article>
              </section>

              <section className="panel factory-panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">ESTRUTURA INDUSTRIAL</span>
                    <h2>Mapa operacional da fábrica</h2>
                  </div>
                  <span className="live-label">
                    <i /> DADOS DO DIA SELECIONADO
                  </span>
                </div>

                <div className="factory-flow overview-flow">
                  <div className="flow-column">
                    <span className="flow-caption">MATÉRIA-PRIMA</span>

                    <button
                      className="machine-card"
                      onClick={() => setActivePage('stock')}
                    >
                      <Boxes size={27} />
                      <strong>Silos de matéria-prima</strong>
                      <small>Milho, sorgo, soja e demais insumos</small>
                      <em className="status-ok">Consultar estoque</em>
                    </button>
                  </div>

                  <div className="flow-column flow-middle">
                    <span className="flow-caption">PROCESSAMENTO</span>

                    <button
                      className="machine-card highlight-machine"
                      onClick={() => setActivePage('production')}
                    >
                      <Settings size={27} />
                      <strong>Moinho</strong>
                      <small>Capacidade necessária registrada</small>
                      <em className="status-ok">
                        {millingRate > 0
                          ? `${millingRate.toLocaleString('pt-BR', {
                              maximumFractionDigits: 2,
                            })} ton/h`
                          : 'Sem apontamento'}
                      </em>
                    </button>

                    <div className="flow-arrow">↓</div>

                    <button
                      className="machine-card highlight-machine"
                      onClick={() => setActivePage('production')}
                    >
                      <Factory size={27} />
                      <strong>Extrusora E130</strong>
                      <small>Motor 125 cv</small>
                      <em className="status-ok">
                        {allPeriods.length > 0
                          ? `${weightedFrequency.toLocaleString('pt-BR', {
                              maximumFractionDigits: 1,
                            })} Hz média`
                          : 'Sem apontamento'}
                      </em>
                    </button>
                  </div>

                  <div className="flow-column">
                    <span className="flow-caption">RESULTADO</span>

                    <button
                      className="machine-card"
                      onClick={() => setActivePage('production')}
                    >
                      <Package size={27} />
                      <strong>Produção final</strong>
                      <small>Sacos registrados no dia</small>
                      <em className="status-ok">
                        {totalBags.toLocaleString('pt-BR')} sacos
                      </em>
                    </button>
                  </div>
                </div>

                <p className="map-note">
                  A visão geral apresenta os registros do dia selecionado.
                  Clique nos equipamentos para acessar o módulo correspondente.
                  O estoque dos silos será conectado ao cadastro e às
                  movimentações do módulo Estoque.
                </p>
              </section>

              <section className="bottom-grid">
                <article className="panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">APONTAMENTOS</span>
                      <h2>Produção do dia</h2>
                    </div>
                    <ClipboardList size={21} />
                  </div>

                  {loadError ? (
                    <div className="empty-state">
                      <strong>{loadError}</strong>
                    </div>
                  ) : loading ? (
                    <div className="empty-state">
                      <strong>Carregando registros...</strong>
                    </div>
                  ) : records.length === 0 ? (
                    <div className="empty-state">
                      <ClipboardList size={25} />
                      <strong>Nenhuma produção registrada</strong>
                      <span>
                        Não há apontamentos em {formatDate(selectedDate)}.
                      </span>
                    </div>
                  ) : (
                    <div className="overview-record-list">
                      {records.map((record) => (
                        <div className="overview-record" key={record.id}>
                          <div>
                            <strong>
                              {record.product_name || record.product_id}
                            </strong>
                            <span>
                              {record.start_time || '--:--'} às{' '}
                              {record.end_time || '--:--'}
                            </span>
                          </div>
                          <div>
                            <strong>
                              {Number(record.bags).toLocaleString('pt-BR')} sacos
                            </strong>
                            <span>
                              {(Number(record.total_kg) / 1000).toLocaleString(
                                'pt-BR',
                                { maximumFractionDigits: 2 },
                              )} ton
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">DESEMPENHO</span>
                      <h2>Resumo operacional</h2>
                    </div>
                    <ChartNoAxesCombined size={21} />
                  </div>

                  <div className="overview-metric">
                    <span>Períodos de extrusão registrados</span>
                    <strong>{allPeriods.length}</strong>
                  </div>

                  <div className="overview-metric">
                    <span>Produtividade média registrada</span>
                    <strong>
                      {productivity.toLocaleString('pt-BR', {
                        maximumFractionDigits: 2,
                      })} ton/h
                    </strong>
                  </div>

                  <div className="overview-metric">
                    <span>Data consultada</span>
                    <strong>{formatDate(selectedDate)}</strong>
                  </div>

                  <button
                    className="overview-action"
                    onClick={() => setActivePage('production')}
                  >
                    Abrir módulo de produção
                    <ChevronRight size={17} />
                  </button>
                </article>
              </section>
            </div>
          ) : activePage === 'production' ? (
            <Production />
          ) : activePage === 'stock' ? (
            <Stock />
          ) : activePage === 'products' ? (
            <Products />
          ) : activePage === 'finance' ? (
            <Finance />
          ) : activePage === 'reports' ? (
            <Reports />
          ) : (
            <section className="panel module-placeholder">
              <div className="placeholder-icon">
                <ClipboardList size={30} />
              </div>
              <h2>{currentPage}</h2>
              <p>
                Este módulo será desenvolvido e conectado aos demais setores
                do sistema.
              </p>
              <span>ESTRUTURA INICIAL</span>
            </section>
          )}
        </main>

        <aside className={`side-menu ${menuOpen ? '' : 'collapsed'}`}>
          <button
            className="collapse-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Recolher menu"
          >
            {menuOpen
              ? <ChevronRight size={17} />
              : <ChevronLeft size={17} />}
          </button>

          {menuOpen && (
            <>
              <span className="menu-title">NAVEGAÇÃO</span>
              <nav>
                {menuItems.map((item) => {
                  const Icon = item.icon

                  return (
                    <button
                      key={item.id}
                      className={`nav-item ${
                        activePage === item.id ? 'active' : ''
                      }`}
                      onClick={() => setActivePage(item.id)}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="menu-footer">
                <span className="footer-indicator" />
                Ambiente industrial
                <br />
                <small>Versão 1.0</small>
              </div>
            </>
          )}
        </aside>
      </div>

      {notificationsOpen && (
        <div className="notification-panel">
          <div className="notification-heading">
            <strong>Notificações</strong>
            <button
              onClick={() => setNotificationsOpen(false)}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
          <p>Nenhuma notificação nova.</p>
        </div>
      )}
    </div>
  )
}

export default App
