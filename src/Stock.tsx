
import { useEffect, useMemo, useState } from 'react'
import {
  Search, Boxes, Pencil, Save, X, AlertTriangle,
  ArrowDownToLine, ArrowUpFromLine, RefreshCw,
  Package, Wallet, History,
} from 'lucide-react'
import { formatCurrency, formatNumber } from './utils/calculations'

function Stock() {
  const [materials, setMaterials] = useState<StockMaterial[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<StockMaterialUpdate | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<StockMaterial | null>(null)
  const [movementType, setMovementType] = useState<'entrada' | 'saida'>('entrada')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [movementDate, setMovementDate] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadMaterials() {
    try {
      setError('')
      const data = await window.mantiqueira.stock.list()
      setMaterials(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estoque.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMaterials()
  }, [])

  const filteredMaterials = useMemo(
    () => materials.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()),
    ),
    [materials, search],
  )

  const totalStock = materials.reduce((sum, item) => sum + item.stockKg, 0)

  const totalValue = materials.reduce(
    (sum, item) => sum + item.stockKg * item.costPerKg,
    0,
  )

  const lowStockCount = materials.filter(
    (item) => item.stockKg <= item.minimumStockKg,
  ).length

  function startEditing(material: StockMaterial) {
    setEditingId(material.id)
    setDraft({
      id: material.id,
      name: material.name,
      costPerKg: material.costPerKg,
      minimumStockKg: material.minimumStockKg,
    })
    setError('')
    setSuccess('')
  }

  function cancelEditing() {
    setEditingId(null)
    setDraft(null)
  }

  async function saveEditing() {
    if (!draft || saving) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await window.mantiqueira.stock.updateMaterial(draft)

      await loadMaterials()
      setSuccess('Cadastro atualizado com sucesso.')
      cancelEditing()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cadastro.')
    } finally {
      setSaving(false)
    }
  }

  function openMovement(material: StockMaterial, type: 'entrada' | 'saida') {
    setSelectedMaterial(material)
    setMovementType(type)
    setQuantity('')
    setUnitCost(material.costPerKg.toString())
    setMovementDate(new Date().toISOString().slice(0, 10))
    setDescription('')
    setError('')
    setSuccess('')
  }

  async function saveMovement() {
    if (!selectedMaterial || saving) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await window.mantiqueira.stock.move({
        materialId: selectedMaterial.id,
        movementType,
        quantityKg: Number(quantity),
        unitCost: Number(unitCost),
        movementDate,
        description,
      })

      await loadMaterials()

      setSuccess(
        `${movementType === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso.`,
      )
      setSelectedMaterial(null)
      setQuantity('')
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar movimentação.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stock-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CONTROLE DE INSUMOS</span>
          <h1>Estoque</h1>
          <p>Acompanhe saldos, custos e movimentações de matérias-primas.</p>
        </div>

        <button className="stock-refresh" onClick={loadMaterials} disabled={loading}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      <section className="stock-summary">
        <article className="kpi-card">
          <div className="kpi-top">
            <span>Matérias-primas</span>
            <Boxes size={18} />
          </div>
          <strong>{materials.length}</strong>
          <p>Itens cadastrados no banco de dados</p>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <span>Estoque total</span>
            <Package size={18} />
          </div>
          <strong>{formatNumber(totalStock)} <small>kg</small></strong>
          <p>Saldo atual de todas as matérias-primas</p>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <span>Valor estimado em estoque</span>
            <Wallet size={18} />
          </div>
          <strong>{formatCurrency(totalValue)}</strong>
          <p>Calculado pelo custo médio atual</p>
        </article>

        <article className="kpi-card">
          <div className="kpi-top">
            <span>Estoque no limite</span>
            <AlertTriangle size={18} />
          </div>
          <strong>{lowStockCount}</strong>
          <p>Itens abaixo ou iguais ao estoque mínimo</p>
        </article>
      </section>

      {error && <div className="stock-message stock-error">{error}</div>}
      {success && <div className="stock-message stock-success">{success}</div>}

      <section className="panel stock-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CADASTRO E SALDOS</span>
            <h2>Matérias-primas</h2>
          </div>
          <Boxes size={22} />
        </div>

        <label className="stock-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar matéria-prima..."
          />
        </label>

        {loading ? (
          <div className="empty-state">
            <RefreshCw size={24} />
            <strong>Carregando estoque...</strong>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="consumption-table stock-table">
              <thead>
                <tr>
                  <th>Matéria-prima</th>
                  <th>Custo/kg</th>
                  <th>Saldo atual</th>
                  <th>Estoque mínimo</th>
                  <th>Situação</th>
                  <th>Movimentar</th>
                  <th>Editar</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((item) => {
                  const isEditing = editingId === item.id
                  const isLow = item.stockKg <= item.minimumStockKg

                  return (
                    <tr key={item.id}>
                      <td>
                        {isEditing && draft ? (
                          <input
                            className="table-input"
                            value={draft.name}
                            onChange={(event) =>
                              setDraft({ ...draft, name: event.target.value })
                            }
                          />
                        ) : (
                          <strong>{item.name}</strong>
                        )}
                      </td>

                      <td>
                        {isEditing && draft ? (
                          <input
                            className="table-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.costPerKg}
                            onChange={(event) =>
                              setDraft({ ...draft, costPerKg: Number(event.target.value) })
                            }
                          />
                        ) : (
                          formatCurrency(item.costPerKg)
                        )}
                      </td>

                      <td>
                        <strong>{formatNumber(item.stockKg)} kg</strong>
                      </td>

                      <td>
                        {isEditing && draft ? (
                          <input
                            className="table-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.minimumStockKg}
                            onChange={(event) =>
                              setDraft({ ...draft, minimumStockKg: Number(event.target.value) })
                            }
                          />
                        ) : (
                          `${formatNumber(item.minimumStockKg)} kg`
                        )}
                      </td>

                      <td>
                        {isLow ? (
                          <span className="stock-status stock-low">
                            {item.stockKg === 0 ? 'Sem estoque' : 'Estoque baixo'}
                          </span>
                        ) : (
                          <span className="stock-status stock-ok">Normal</span>
                        )}
                      </td>

                      <td>
                        <div className="stock-actions">
                          <button
                            className="stock-entry-button"
                            onClick={() => openMovement(item, 'entrada')}
                            disabled={isEditing}
                            title="Registrar entrada"
                          >
                            <ArrowDownToLine size={15} />
                          </button>
                          <button
                            className="stock-exit-button"
                            onClick={() => openMovement(item, 'saida')}
                            disabled={isEditing}
                            title="Registrar saída"
                          >
                            <ArrowUpFromLine size={15} />
                          </button>
                        </div>
                      </td>

                      <td>
                        {isEditing && draft ? (
                          <div className="stock-actions">
                            <button
                              className="save-button"
                              onClick={saveEditing}
                              disabled={saving}
                              title="Salvar"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              className="cancel-button"
                              onClick={cancelEditing}
                              disabled={saving}
                              title="Cancelar"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="edit-button"
                            onClick={() => startEditing(item)}
                            title="Editar cadastro"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredMaterials.length === 0 && (
          <div className="empty-state">
            <Search size={24} />
            <strong>Nenhuma matéria-prima encontrada.</strong>
          </div>
        )}
      </section>

      {selectedMaterial && (
        <div className="stock-modal-backdrop">
          <section className="stock-modal">
            <button
              className="stock-modal-close"
              onClick={() => setSelectedMaterial(null)}
              title="Fechar"
            >
              <X size={19} />
            </button>

            <span className="eyebrow">MOVIMENTAÇÃO DE ESTOQUE</span>
            <h2>{selectedMaterial.name}</h2>
            <p className="stock-modal-balance">
              Saldo disponível: <strong>{formatNumber(selectedMaterial.stockKg)} kg</strong>
            </p>

            <div className="stock-movement-tabs">
              <button
                className={movementType === 'entrada' ? 'active' : ''}
                onClick={() => setMovementType('entrada')}
              >
                <ArrowDownToLine size={16} />
                Entrada
              </button>
              <button
                className={movementType === 'saida' ? 'active' : ''}
                onClick={() => setMovementType('saida')}
              >
                <ArrowUpFromLine size={16} />
                Saída
              </button>
            </div>

            <label className="stock-field">
              <span>Quantidade em kg</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="Ex.: 1000"
              />
            </label>

            {movementType === 'entrada' && (
              <label className="stock-field">
                <span>Custo de compra por kg (R$)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                  placeholder="Ex.: 1,50"
                />
              </label>
            )}

            <label className="stock-field">
              <span>Data da movimentação</span>
              <input
                type="date"
                value={movementDate}
                onChange={(event) => setMovementDate(event.target.value)}
              />
            </label>

            <label className="stock-field">
              <span>Descrição / observação</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex.: Compra de fornecedor"
              />
            </label>

            <button
              className="stock-submit-button"
              onClick={saveMovement}
              disabled={saving || !quantity || Number(quantity) <= 0}
            >
              {saving ? 'Salvando...' : 'Confirmar movimentação'}
            </button>
          </section>
        </div>
      )}

      <section className="panel stock-info-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CONTROLE</span>
            <h2>Regras do estoque</h2>
          </div>
          <History size={21} />
        </div>

        <div className="stock-info-row">
          <span>Entradas</span>
          <strong>Aumentam o saldo e atualizam o custo médio.</strong>
        </div>
        <div className="stock-info-row">
          <span>Saídas</span>
          <strong>Reduzem o saldo e não permitem estoque negativo.</strong>
        </div>
        <div className="stock-info-row">
          <span>Alterações</span>
          <strong>Preços e estoque mínimo ficam gravados no banco de dados.</strong>
        </div>
      </section>
    </div>
  )
}

export default Stock
