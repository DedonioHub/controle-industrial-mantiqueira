
import { useState } from 'react'
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

const menuItems = [
  { id: 'overview', label: 'Visão geral', icon: Gauge },
  { id: 'production', label: 'Produção', icon: Factory },
  { id: 'stock', label: 'Estoque', icon: Boxes },
  { id: 'products', label: 'Produtos e fórmulas', icon: Wheat },
  { id: 'finance', label: 'Financeiro', icon: CircleDollarSign },
  { id: 'reports', label: 'Relatórios', icon: ChartNoAxesCombined },
]

const machines = [
  { name: 'Silos de matéria-prima', status: 'Operacional', detail: 'Milho e sorgo', value: '2 silos' },
  { name: 'Moinho', status: 'Operacional', detail: 'Moagem contínua', value: 'Ativo' },
  { name: 'Silo pulmão', status: 'Operacional', detail: 'Capacidade: 5 toneladas', value: '3,2 t' },
  { name: 'Extrusora E130', status: 'Operacional', detail: 'Motor: 125 cv', value: '9 Hz' },
  { name: 'Secador e resfriador', status: 'Aguardando', detail: 'Etapa seguinte da extrusão', value: 'Standby' },
  { name: 'Ensacamento', status: 'Aguardando', detail: 'Embalagens de 15 kg', value: 'Standby' },
]

function App() {
  const [activePage, setActivePage] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null)

  const currentPage = menuItems.find((item) => item.id === activePage)?.label ?? 'Visão geral'
  const selected = machines.find((machine) => machine.name === selectedMachine)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Factory size={23} /></div>
          <div>
            <strong>MANTIQUEIRA</strong>
            <span>CONTROLE INDUSTRIAL</span>
          </div>
        </div>

        <div className="topbar-right">
          <span className="system-status"><i /> Sistema operacional</span>
          <button className="icon-button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notificações">
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
              <p>Acompanhe a operação industrial da Mantiqueira em um só lugar.</p>
            </div>
            <div className="date-label">PAINEL INDUSTRIAL <span>•</span> VISÃO EM TEMPO REAL</div>
          </div>

          {activePage === 'overview' ? (
            <>
              <section className="kpi-grid">
                <article className="kpi-card">
                  <div className="kpi-top"><span>Produção do dia</span><Package size={18} /></div>
                  <strong>— <small>sacos</small></strong>
                  <p>Aguardando apontamento</p>
                </article>
                <article className="kpi-card">
                  <div className="kpi-top"><span>Produção em toneladas</span><Activity size={18} /></div>
                  <strong>— <small>ton</small></strong>
                  <p>Calculada pelos registros</p>
                </article>
                <article className="kpi-card">
                  <div className="kpi-top"><span>Silo pulmão</span><Boxes size={18} /></div>
                  <strong>3,2 <small>/ 5 t</small></strong>
                  <p>Valor demonstrativo</p>
                </article>
                <article className="kpi-card">
                  <div className="kpi-top"><span>Frequência extrusora</span><Gauge size={18} /></div>
                  <strong>9 <small>Hz</small></strong>
                  <p>Valor demonstrativo</p>
                </article>
              </section>

              <section className="panel factory-panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">LAYOUT OPERACIONAL</span>
                    <h2>Mapa da fábrica</h2>
                  </div>
                  <span className="live-label"><i /> VISUALIZAÇÃO ILUSTRATIVA</span>
                </div>

                <div className="factory-flow">
                  <div className="flow-column">
                    <span className="flow-caption">MATÉRIA-PRIMA</span>
                    <button className="machine-card" onClick={() => setSelectedMachine('Silos de matéria-prima')}>
                      <Boxes size={24} /><strong>Silos</strong><small>Milho e sorgo</small><em className="status-ok">Operacional</em>
                    </button>
                    <div className="flow-arrow">↓</div>
                    <button className="machine-card" onClick={() => setSelectedMachine('Moinho')}>
                      <Settings size={24} /><strong>Moinho</strong><small>Moagem</small><em className="status-ok">Operacional</em>
                    </button>
                  </div>

                  <div className="flow-column flow-middle">
                    <span className="flow-caption">PROCESSAMENTO</span>
                    <button className="machine-card highlight-machine" onClick={() => setSelectedMachine('Silo pulmão')}>
                      <Boxes size={24} /><strong>Silo pulmão</strong><small>Capacidade 5 t</small><em className="status-ok">3,2 toneladas</em>
                    </button>
                    <div className="flow-arrow">↓</div>
                    <button className="machine-card highlight-machine" onClick={() => setSelectedMachine('Extrusora E130')}>
                      <Factory size={24} /><strong>Extrusora E130</strong><small>Motor 125 cv</small><em className="status-ok">9 Hz</em>
                    </button>
                  </div>

                  <div className="flow-column">
                    <span className="flow-caption">FINALIZAÇÃO</span>
                    <button className="machine-card" onClick={() => setSelectedMachine('Secador e resfriador')}>
                      <Activity size={24} /><strong>Secagem</strong><small>Secador e resfriador</small><em className="status-wait">Aguardando</em>
                    </button>
                    <div className="flow-arrow">↓</div>
                    <button className="machine-card" onClick={() => setSelectedMachine('Ensacamento')}>
                      <Package size={24} /><strong>Ensacamento</strong><small>Embalagens 15 kg</small><em className="status-wait">Aguardando</em>
                    </button>
                  </div>
                </div>
                <p className="map-note">Selecione uma máquina para consultar seus detalhes. Os indicadores atuais são demonstrativos e serão conectados aos registros reais nas próximas etapas.</p>
              </section>

              <section className="bottom-grid">
                <article className="panel">
                  <div className="section-heading"><div><span className="eyebrow">ACOMPANHAMENTO</span><h2>Produção recente</h2></div></div>
                  <div className="empty-state"><ClipboardList size={25} /><strong>Nenhum apontamento registrado</strong><span>Os dados aparecerão aqui após o primeiro registro de produção.</span></div>
                </article>
                <article className="panel">
                  <div className="section-heading"><div><span className="eyebrow">ATENÇÃO</span><h2>Alertas do sistema</h2></div></div>
                  <div className="alert-row"><span className="alert-icon">i</span><div><strong>Painel em configuração</strong><p>Os dados ainda não estão conectados à fábrica.</p></div></div>
                </article>
              </section>
            </>
          ) : (
            <section className="panel module-placeholder">
              <div className="placeholder-icon"><ClipboardList size={30} /></div>
              <h2>{currentPage}</h2>
              <p>Este módulo será desenvolvido e conectado aos demais setores do sistema.</p>
              <span>ESTRUTURA INICIAL</span>
            </section>
          )}
        </main>

        <aside className={`side-menu ${menuOpen ? '' : 'collapsed'}`}>
          <button className="collapse-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Recolher menu">
            {menuOpen ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
          {menuOpen && (
            <>
              <span className="menu-title">NAVEGAÇÃO</span>
              <nav>
                {menuItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
                      <Icon size={18} /><span>{item.label}</span>
                    </button>
                  )
                })}
              </nav>
              <div className="menu-footer"><span className="footer-indicator" /> Ambiente industrial<br /><small>Versão inicial 1.0</small></div>
            </>
          )}
        </aside>
      </div>

      {notificationsOpen && (
        <div className="notification-panel">
          <div className="notification-heading"><strong>Notificações</strong><button onClick={() => setNotificationsOpen(false)} aria-label="Fechar"><X size={18} /></button></div>
          <p>Nenhuma notificação nova.</p>
        </div>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelectedMachine(null)}>
          <div className="machine-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMachine(null)} aria-label="Fechar"><X size={19} /></button>
            <span className="eyebrow">DETALHES DO EQUIPAMENTO</span>
            <h2>{selected.name}</h2>
            <p>{selected.detail}</p>
            <div className="machine-detail"><span>Status</span><strong>{selected.status}</strong></div>
            <div className="machine-detail"><span>Indicador</span><strong>{selected.value}</strong></div>
            <small>Informações demonstrativas. A integração com dados reais será feita nas próximas etapas.</small>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

