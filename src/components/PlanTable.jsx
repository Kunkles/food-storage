import { itemKcal, itemCost, itemCostPer100k, sortByCostPerKcal } from '../lib/calc.js'
import { fmtMoney, fmtKcal } from '../lib/format.js'

// The editable plan. Rows are inline-editable (qty / price / kcal-per-unit).
// "Add from library" appends a plan item sized to the household + days.
export default function PlanTable({
  plan,
  library,
  onItemChange,
  onRemove,
  onAdd,
  onScale,
  sortMode,
  onToggleSort,
}) {
  const addedFoodIds = new Set(plan.map((p) => p.foodId))
  const available = library.filter((f) => !addedFoodIds.has(f.id))
  const rows = sortMode === 'kcal' ? sortByCostPerKcal(plan) : plan

  const setNum = (id, field) => (e) =>
    onItemChange(id, { [field]: Number(e.target.value) || 0 })

  return (
    <section className="card">
      <div className="card-head">
        <h3>Plan</h3>
        <div className="toolbar no-print">
          <select
            id="add-food"
            defaultValue=""
            onChange={(e) => {
              const food = library.find((f) => f.id === e.target.value)
              if (food) onAdd(food)
              e.target.value = ''
            }}
          >
            <option value="">+ Add from library…</option>
            {available.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.category === 'noCook' ? 'no-cook' : 'staple'})
              </option>
            ))}
          </select>
          <button className="btn" onClick={onToggleSort} title="Sort cheapest-calories first">
            Sort: {sortMode === 'kcal' ? 'A–Z' : 'cheapest kcal'}
          </button>
          <button className="btn btn-primary" onClick={onScale} title="Rescale quantities to exactly meet the calorie target">
            Scale to target
          </button>
        </div>
      </div>
      <p className="hint">
        Quantities are whole units and round up for a safety margin — use{' '}
        <strong>Scale to target</strong> to dial the total back to your exact calorie need, or edit any number.
      </p>
      <table className="grid">
        <thead>
          <tr>
            <th>Item</th>
            <th>Unit</th>
            <th>Qty</th>
            <th>Price</th>
            <th>kcal/unit</th>
            <th>Total kcal</th>
            <th>Cost</th>
            <th>$/100k kcal</th>
            <th className="no-print" />
          </tr>
        </thead>
        <tbody>
          {rows.map((it) => (
            <tr key={it.id} className={it.category === 'noCook' ? 'row-nocook' : 'row-staple'}>
              <td>
                {it.elNinoExposed && <span className="exposed" title="El Niño / import price-sensitive">⚠</span>}
                {it.name}
              </td>
              <td>{it.unit}</td>
              <td>
                <input className="cellnum" type="number" min="0" value={it.qty} onChange={setNum(it.id, 'qty')} />
              </td>
              <td>
                <input className="cellnum" type="number" min="0" step="0.05" value={it.price} onChange={setNum(it.id, 'price')} />
              </td>
              <td>
                <input className="cellnum" type="number" min="0" step="10" value={it.perUnitKcal} onChange={setNum(it.id, 'perUnitKcal')} />
              </td>
              <td>{fmtKcal(itemKcal(it))}</td>
              <td>{fmtMoney(itemCost(it))}</td>
              <td>{itemCostPer100k(it) === Infinity ? '—' : `$${itemCostPer100k(it).toFixed(2)}`}</td>
              <td className="no-print">
                <button className="btn btn-ghost" onClick={() => onRemove(it.id)}>✕</button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan="9" className="hint">No items yet — add some from the library.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
