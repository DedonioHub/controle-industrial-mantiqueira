
import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, X, Trash2, Wheat, Package, Layers3, BadgeDollarSign, Scale, Search, RefreshCw } from 'lucide-react'
import { formatCurrency, formatNumber } from './utils/calculations'

function Products() {
  const [productList, setProductList] = useState<DatabaseProduct[]>([])
  const [rawMaterials, setRawMaterials] = useState<StockMaterial[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [products, materials] = await Promise.all([
        window.mantiqueira.products.list(),
        window.mantiqueira.stock.list(),
      ])
      setProductList(products)
      setRawMaterials(materials)
      setSelectedId((current) => products.some((item) => item.id === current) ? current : (products[0]?.id ?? ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar produtos e matérias-primas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<DatabaseProduct | null>(null)

  const selectedProduct = productList.find((item) => item.id === selectedId)

  function startEditing() {
    if (!selectedProduct) return
    setDraft({
      ...selectedProduct,
      formula: selectedProduct.formula.map((item) => ({ ...item })),
    })
    setEditing(true)
    setCreating(false)
  }

  function startCreating() {
    const newProduct: DatabaseProduct = {
      id: `produto-${Date.now()}`,
      name: '',
      brand: '',
      bagWeightKg: 15,
      salePrice: 0,
      formula: [],
    }

    setDraft(newProduct)
    setEditing(true)
    setCreating(true)
  }

  function updateIngredient(index: number, field: keyof ProductFormulaItem, value: string) {
    if (!draft) return

    const updatedFormula = [...draft.formula]
    updatedFormula[index] = {
      ...updatedFormula[index],
      [field]: field === 'quantityKg' ? Number(value) : value,
    }

    setDraft({ ...draft, formula: updatedFormula })
  }

  function addIngredient() {
    if (!draft || rawMaterials.length === 0) return

    const available = rawMaterials.find(
      (material) => !draft.formula.some((item) => item.materialId === material.id),
    )

    if (!available) return

    setDraft({
      ...draft,
      formula: [
        ...draft.formula,
        { materialId: available.id, quantityKg: 0 },
      ],
    })
  }

  function removeIngredient(index: number) {
    if (!draft) return
    setDraft({
      ...draft,
      formula: draft.formula.filter((_, itemIndex) => itemIndex !== index),
    })
  }

  async function saveProduct() {
    if (!draft || !draft.name.trim() || !draft.brand.trim()) return
    if (draft.bagWeightKg <= 0 || draft.salePrice < 0) return
    if (draft.formula.some((item) => item.quantityKg < 0)) return
    try {
      setSaving(true)
      setError('')
      await window.mantiqueira.products.save(draft)
      await loadData()
      setSelectedId(draft.id)
      setEditing(false)
      setCreating(false)
      setDraft(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto.')
    } finally {
      setSaving(false)
    }
  }

  function cancelEditing() {
    setEditing(false)
    setCreating(false)
    setDraft(null)
  }

  async function deleteProduct() {
    if (!selectedProduct) return

    const confirmed = window.confirm(
      `Deseja excluir o produto ${selectedProduct.name}?`,
    )

    if (!confirmed) return

    try {
      setError('')
      await window.mantiqueira.products.delete(selectedProduct.id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir o produto.')
    }
  }

  const activeProduct = editing ? draft : selectedProduct
  const visibleProducts = productList.filter((item) =>
    `${item.name} ${item.brand}`.toLowerCase().includes(search.toLowerCase()),
  )
  const formulaCount = productList.filter((item) => item.formula.reduce((sum, ingredient) => sum + Number(ingredient.quantityKg || 0), 0) > 0).length
  const averageBagPrice = productList.length > 0 ? productList.reduce((sum, item) => sum + item.salePrice, 0) / productList.length : 0

  const formulaWeight = activeProduct
    ? activeProduct.formula.reduce((sum, item) => sum + item.quantityKg, 0)
    : 0

  const formulaCost = activeProduct
    ? activeProduct.formula.reduce((sum, item) => {
        const material = rawMaterials.find((raw) => raw.id === item.materialId)
        return sum + item.quantityKg * (material?.costPerKg ?? 0)
      }, 0)
    : 0

  return (
    <div className="products-page">
      {error && <div className="stock-message stock-error">{error}</div>}
      {loading && <div className="empty-state"><strong>Carregando cadastro do banco local...</strong></div>}
      <section className="products-hero">
        <div><span className="eyebrow">PORTFÓLIO INDUSTRIAL</span><h2>Gestão de produtos e receitas</h2><p>Centralize embalagens, preços de venda e composição técnica de cada produto.</p></div>
        <button className="add-period-button" onClick={startCreating} type="button"><Plus size={16} /> Novo produto</button>
      </section>
      <section className="products-metrics">
        <article className="kpi-card"><div className="kpi-top"><span>Produtos cadastrados</span><Package size={18}/></div><strong>{productList.length}</strong><p>Itens no catálogo</p></article>
        <article className="kpi-card"><div className="kpi-top"><span>Fórmulas configuradas</span><Layers3 size={18}/></div><strong>{formulaCount}</strong><p>Composição com ingredientes</p></article>
        <article className="kpi-card"><div className="kpi-top"><span>Preço médio por saco</span><BadgeDollarSign size={18}/></div><strong>{formatCurrency(averageBagPrice)}</strong><p>Média dos preços cadastrados</p></article>
        <article className="kpi-card"><div className="kpi-top"><span>Matérias-primas</span><Wheat size={18}/></div><strong>{rawMaterials.length}</strong><p>Ingredientes disponíveis no estoque</p></article>
      </section>
      <section className="panel products-toolbar">
        <div>
          <span className="eyebrow">CATÁLOGO E FICHA TÉCNICA</span>
          <h2>Catálogo de produtos</h2>
          <p>Selecione um produto para consultar ou editar sua ficha técnica.</p>
        </div>
        <button className="add-period-button" onClick={startCreating} type="button">
          <Plus size={16} /> Novo produto
        </button>
      </section>

      <div className="products-layout">
        <section className="panel product-list-panel">
          <span className="eyebrow">CATÁLOGO</span>
          <h2>Produtos cadastrados</h2>

          <label className="products-search"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto ou marca..."/></label>
          {visibleProducts.map((product) => (
            <button
              key={product.id}
              className={`product-select ${selectedId === product.id && !creating ? 'selected' : ''}`}
              onClick={() => {
                setSelectedId(product.id)
                cancelEditing()
              }}
              type="button"
            >
              <Package size={19} />
              <span>
                <strong>{product.name}</strong>
                <small>{product.brand} • {formatNumber(product.bagWeightKg)} kg</small>
              </span>
            </button>
          ))}

          {visibleProducts.length === 0 && (
            <p className="product-empty">Nenhum produto cadastrado.</p>
          )}
        </section>

        <section className="panel formula-panel">
          {activeProduct ? (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{creating ? 'NOVO CADASTRO' : 'FICHA TÉCNICA'}</span>
                  <h2>{editing ? 'Editar produto' : activeProduct.name}</h2>
                </div>
                <Wheat size={22} />
              </div>

              {editing ? (
                <>
                  <div className="form-grid">
                    <label className="field">
                      <span>Nome do produto</span>
                      <input
                        value={activeProduct.name}
                        onChange={(event) => setDraft({ ...activeProduct, name: event.target.value })}
                        placeholder="Ex.: Mantiqueira Adulto 19%"
                      />
                    </label>

                    <label className="field">
                      <span>Marca</span>
                      <input
                        value={activeProduct.brand}
                        onChange={(event) => setDraft({ ...activeProduct, brand: event.target.value })}
                        placeholder="Ex.: Mantiqueira"
                      />
                    </label>

                    <label className="field">
                      <span>Peso do saco (kg)</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.1"
                        value={activeProduct.bagWeightKg}
                        onChange={(event) => setDraft({ ...activeProduct, bagWeightKg: Number(event.target.value) })}
                      />
                    </label>

                    <label className="field">
                      <span>Preço de venda por saco (R$)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={activeProduct.salePrice}
                        onChange={(event) => setDraft({ ...activeProduct, salePrice: Number(event.target.value) })}
                      />
                    </label>
                  </div>

                  <div className="formula-title">
                    <h3>Composição da fórmula</h3>
                    <button className="add-period-button" onClick={addIngredient} type="button">
                      <Plus size={15} /> Ingrediente
                    </button>
                  </div>

                  {activeProduct.formula.map((ingredient, index) => (
                    <div className="ingredient-edit-row" key={`${ingredient.materialId}-${index}`}>
                      <select
                        value={ingredient.materialId}
                        onChange={(event) => updateIngredient(index, 'materialId', event.target.value)}
                      >
                        {rawMaterials.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={ingredient.quantityKg}
                        onChange={(event) => updateIngredient(index, 'quantityKg', event.target.value)}
                        placeholder="Quantidade em kg"
                      />

                      <button
                        className="period-delete"
                        onClick={() => removeIngredient(index)}
                        type="button"
                        aria-label="Remover ingrediente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <div className="edit-actions">
                    <button className="save-button" onClick={saveProduct} type="button" disabled={saving}>
                      <Save size={16} /> {saving ? 'Salvando...' : 'Salvar produto'}
                    </button>
                    <button className="cancel-button" onClick={cancelEditing} type="button">
                      <X size={16} /> Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="product-info">
                    <span>Marca: <strong>{activeProduct.brand}</strong></span>
                    <span>Embalagem: <strong>{formatNumber(activeProduct.bagWeightKg)} kg</strong></span>
                    <span>Venda por saco: <strong>{formatCurrency(activeProduct.salePrice)}</strong></span>
                  </div>

                  <div className="product-detail-kpis">
                    <div><span>Peso da fórmula</span><strong>{formatNumber(formulaWeight, 3)} kg</strong></div>
                    <div><span>Custo total do lote de referência</span><strong>{formatCurrency(formulaCost)}</strong></div>
                    <div><span>Ingredientes</span><strong>{activeProduct.formula.length}</strong></div>
                  </div>
                  <div className="formula-title">
                    <h3>Ingredientes da fórmula</h3>
                    <button className="edit-button" onClick={startEditing} type="button" aria-label="Editar produto">
                      <Pencil size={16} />
                    </button>
                  </div>

                  <div className="table-scroll">
                    <table className="consumption-table">
                      <thead>
                        <tr>
                          <th>Ingrediente</th>
                          <th>Quantidade (kg)</th>
                          <th>Participação</th>
                          <th>Custo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeProduct.formula.map((ingredient, index) => {
                          const material = rawMaterials.find(
                            (item) => item.id === ingredient.materialId,
                          )

                          return (
                            <tr key={`${ingredient.materialId}-${index}`}>
                              <td>{material?.name ?? 'Não encontrado'}</td>
                              <td>{formatNumber(ingredient.quantityKg, 3)}</td>
                              <td>{formulaWeight > 0 ? formatNumber(ingredient.quantityKg / formulaWeight * 100) : '0,00'}%</td>
                              <td>{formatCurrency(ingredient.quantityKg * (material?.costPerKg ?? 0))}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total da fórmula</td>
                          <td>{formatNumber(formulaWeight, 3)} kg</td>
                          <td>100%</td>
                          <td>{formatCurrency(formulaCost)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="formula-actions">
                    <div>
                      <span>Custo estimado por saco</span>
                      <strong>
                        {formatCurrency(
                          formulaWeight > 0
                            ? (formulaCost / formulaWeight) * activeProduct.bagWeightKg
                            : 0,
                        )}
                      </strong>
                    </div>
                    <button className="cancel-button" onClick={deleteProduct} type="button">
                      <Trash2 size={16} /> Excluir produto
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Package size={28} />
              <strong>Selecione ou cadastre um produto.</strong>
            </div>
          )}
        </section>
      </div>

      <div className="production-warning"><strong>Dados persistidos no computador.</strong><p>Os cadastros e as fórmulas são gravados no banco local. O custo técnico usa os custos médios atuais do Estoque. Produtos com histórico de produção não podem ser excluídos, para preservar a rastreabilidade.</p></div>
    </div>
  )
}

export default Products
