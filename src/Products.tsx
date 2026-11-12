
import { useState } from 'react'
import { Plus, Pencil, Save, X, Trash2, Wheat, Package } from 'lucide-react'
import {
  products as initialProducts,
  rawMaterials,
  type Product,
  type FormulaIngredient,
} from './data/initialData'
import { formatCurrency, formatNumber } from './utils/calculations'

function Products() {
  const [productList, setProductList] = useState<Product[]>(
    () => initialProducts.map((product) => ({
      ...product,
      formula: product.formula.map((item) => ({ ...item })),
    })),
  )

  const [selectedId, setSelectedId] = useState(initialProducts[0]?.id ?? '')
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Product | null>(null)

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
    const newProduct: Product = {
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

  function updateIngredient(index: number, field: keyof FormulaIngredient, value: string) {
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

  function saveProduct() {
    if (!draft || !draft.name.trim() || !draft.brand.trim()) return
    if (draft.bagWeightKg <= 0 || draft.salePrice < 0) return
    if (draft.formula.some((item) => item.quantityKg < 0)) return

    if (creating) {
      setProductList((current) => [...current, draft])
    } else {
      setProductList((current) =>
        current.map((item) => item.id === draft.id ? draft : item),
      )
    }

    setSelectedId(draft.id)
    setEditing(false)
    setCreating(false)
    setDraft(null)
  }

  function cancelEditing() {
    setEditing(false)
    setCreating(false)
    setDraft(null)
  }

  function deleteProduct() {
    if (!selectedProduct) return

    const confirmed = window.confirm(
      `Deseja excluir o produto ${selectedProduct.name}?`,
    )

    if (!confirmed) return

    const remaining = productList.filter((item) => item.id !== selectedProduct.id)
    setProductList(remaining)
    setSelectedId(remaining[0]?.id ?? '')
  }

  const activeProduct = editing ? draft : selectedProduct

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
      <section className="panel products-toolbar">
        <div>
          <span className="eyebrow">GESTÃO DE PRODUTOS</span>
          <h2>Produtos e fórmulas</h2>
          <p>Cadastre produtos, preços e composição das receitas industriais.</p>
        </div>
        <button className="add-period-button" onClick={startCreating} type="button">
          <Plus size={16} /> Novo produto
        </button>
      </section>

      <div className="products-layout">
        <section className="panel product-list-panel">
          <span className="eyebrow">CATÁLOGO</span>
          <h2>Produtos cadastrados</h2>

          {productList.map((product) => (
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

          {productList.length === 0 && (
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
                    <button className="save-button" onClick={saveProduct} type="button">
                      <Save size={16} /> Salvar produto
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
                              <td>{formatCurrency(ingredient.quantityKg * (material?.costPerKg ?? 0))}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total da fórmula</td>
                          <td>{formatNumber(formulaWeight, 3)} kg</td>
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

      <div className="production-warning">
        <strong>Cadastro em modo de desenvolvimento.</strong>
        <p>As alterações e novos produtos ainda ficam somente na memória da tela. O salvamento definitivo e o histórico de versões das fórmulas serão conectados ao banco de dados posteriormente.</p>
      </div>
    </div>
  )
}

export default Products
