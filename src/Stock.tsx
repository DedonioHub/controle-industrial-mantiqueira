
import { useMemo, useState } from 'react'
import { Search, Boxes, Pencil, Save, X, AlertTriangle } from 'lucide-react'
import { rawMaterials, type RawMaterial } from './data/initialData'
import { formatCurrency, formatNumber } from './utils/calculations'

function Stock() {
  const [materials, setMaterials] = useState<RawMaterial[]>(
    () => rawMaterials.map((item) => ({ ...item })),
  )
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<RawMaterial | null>(null)

  const filteredMaterials = useMemo(
    () => materials.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()),
    ),
    [materials, search],
  )

  const totalStock = materials.reduce((sum, item) => sum + item.initialStock, 0)

  const editingCount = materials.filter(
    (item) => item.initialStock > 0 && item.initialStock <= item.minimumStock,
  ).length

  function startEditing(material: RawMaterial) {
    setEditingId(material.id)
    setDraft({ ...material })
  }

  function cancelEditing() {
    setEditingId(null)
    setDraft(null)
  }

  function saveEditing() {
    if (!draft) return

    if (
      !draft.name.trim() ||
      draft.costPerKg < 0 ||
      draft.initialStock < 0 ||
      draft.minimumStock < 0
    ) {
      return
    }

    setMaterials((current) =>
      current.map((item) => item.id === draft.id ? { ...draft } : item),
    )

    cancelEditing()
  }

  return (
    <div className="stock-page">
      <section className="stock-summary">
        <article className="kpi-card">
          <div className="kpi-top"><span>Matérias-primas cadastradas</span><Boxes size={18} /></div>
          <strong>{materials.length}</strong>
          <p>Ingredientes disponíveis no cadastro</p>
        </article>

        <article className="kpi-card">
          <div className="kpi-top"><span>Estoque total cadastrado</span><Boxes size={18} /></div>
          <strong>{formatNumber(totalStock)} <small>kg</small></strong>
          <p>Saldo informado no sistema</p>
        </article>

        <article className="kpi-card">
          <div className="kpi-top"><span>Itens no limite</span><AlertTriangle size={18} /></div>
          <strong>{editingCount}</strong>
          <p>Itens com saldo positivo abaixo do mínimo</p>
        </article>
      </section>

      <section className="panel stock-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GESTÃO DE INSUMOS</span>
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

        <div className="table-scroll">
          <table className="consumption-table stock-table">
            <thead>
              <tr>
                <th>Matéria-prima</th>
                <th>Preço/kg</th>
                <th>Saldo (kg)</th>
                <th>Mínimo (kg)</th>
                <th>Situação</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((item) => {
                const isEditing = editingId === item.id
                const isLow = item.initialStock > 0 &&
                  item.initialStock <= item.minimumStock

                return (
                  <tr key={item.id}>
                    <td>
                      {isEditing && draft ? (
                        <input
                          className="table-input"
                          value={draft.name}
                          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                        />
                      ) : item.name}
                    </td>
                    <td>
                      {isEditing && draft ? (
                        <input
                          className="table-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.costPerKg}
                          onChange={(event) => setDraft({ ...draft, costPerKg: Number(event.target.value) })}
                        />
                      ) : formatCurrency(item.costPerKg)}
                    </td>
                    <td>
                      {isEditing && draft ? (
                        <input
                          className="table-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.initialStock}
                          onChange={(event) => setDraft({ ...draft, initialStock: Number(event.target.value) })}
                        />
                      ) : formatNumber(item.initialStock)}
                    </td>
                    <td>
                      {isEditing && draft ? (
                        <input
                          className="table-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.minimumStock}
                          onChange={(event) => setDraft({ ...draft, minimumStock: Number(event.target.value) })}
                        />
                      ) : formatNumber(item.minimumStock)}
                    </td>
                    <td>
                      {item.initialStock === 0 ? (
                        <span className="stock-status stock-empty">Não informado</span>
                      ) : isLow ? (
                        <span className="stock-status stock-low">Estoque baixo</span>
                      ) : (
                        <span className="stock-status stock-ok">Normal</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div className="stock-actions">
                          <button className="save-button" onClick={saveEditing} aria-label="Salvar">
                            <Save size={16} />
                          </button>
                          <button className="cancel-button" onClick={cancelEditing} aria-label="Cancelar">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button className="edit-button" onClick={() => startEditing(item)} aria-label="Editar">
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

        {filteredMaterials.length === 0 && (
          <div className="empty-state">
            <Search size={24} />
            <strong>Nenhuma matéria-prima encontrada.</strong>
          </div>
        )}
      </section>

      <div className="production-warning">
        <strong>Importante: cadastro inicial.</strong>
        <p>As alterações desta tela são temporárias nesta versão. Elas ainda não ficam gravadas após atualizar a página. Vamos implementar o salvamento definitivo no banco de dados e o histórico de movimentações posteriormente.</p>
      </div>
    </div>
  )
}

export default Stock
