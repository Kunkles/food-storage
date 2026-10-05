import { useState } from 'react'

// The editable food library. Add custom foods, tweak per-unit kcal / price,
// and flag which staples are El Niño price-exposed. Changes here do NOT rewrite
// an existing plan — "Add from library" copies current values at add time.
let seq = 0
function newFood() {
  return {
    id: `custom-${Date.now()}-${seq++}`,
    name: 'New food',
    category: 'noCook',
    unit: '1 unit',
    perUnitKcal: 100,
    price: 1,
    rate: 0.1,
    elNinoExposed: false,
  }
}

export default function LibraryTable({ library, onChange }) {
  const [filter, setFilter] = useState('all')

  const update = (id, patch) =>
    onChange(library.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  const add = () => onChange([...library, newFood()])
  const remove = (id) => onChange(library.filter((f) => f.id !== id))

  const setNum = (id, field) => (e) => update(id, { [field]: Number(e.target.value) || 0 })

  const visible =
    filter === 'all' ? library : library.filter((f) => f.category === filter)

  return (
    <section className="card">
      <div className="card-head">
        <h3>Food library</h3>
        <div className="toolbar no-print">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="noCook">No-cook</option>
            <option value="staple">Staples</option>
          </select>
          <button className="btn" onClick={add}>+ Add food</button>
        </div>
      </div>
      <p className="hint">
        <span className="exposed">⚠</span> = El Niño / import price-sensitive (grains, sugar, oil, coffee, cocoa,
        eggs, rice). Prices and kcal are your editable baseline — enter what you actually paid.
      </p>
      <table className="grid">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Unit</th>
            <th>kcal/unit</th>
            <th>Price</th>
            <th>Rate/p/d</th>
            <th>Exposed</th>
            <th className="no-print" />
          </tr>
        </thead>
        <tbody>
          {visible.map((f) => (
            <tr key={f.id} className={f.category === 'noCook' ? 'row-nocook' : 'row-staple'}>
              <td>
                <input type="text" value={f.name} onChange={(e) => update(f.id, { name: e.target.value })} />
              </td>
              <td>
                <select value={f.category} onChange={(e) => update(f.id, { category: e.target.value })}>
                  <option value="noCook">No-cook</option>
                  <option value="staple">Staple</option>
                </select>
              </td>
              <td>
                <input type="text" value={f.unit} onChange={(e) => update(f.id, { unit: e.target.value })} />
              </td>
              <td>
                <input className="cellnum" type="number" min="0" step="10" value={f.perUnitKcal} onChange={setNum(f.id, 'perUnitKcal')} />
              </td>
              <td>
                <input className="cellnum" type="number" min="0" step="0.05" value={f.price} onChange={setNum(f.id, 'price')} />
              </td>
              <td>
                <input className="cellnum" type="number" min="0" step="0.01" value={f.rate} onChange={setNum(f.id, 'rate')} />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={!!f.elNinoExposed}
                  onChange={(e) => update(f.id, { elNinoExposed: e.target.checked })}
                />
              </td>
              <td className="no-print">
                <button className="btn btn-ghost" onClick={() => remove(f.id)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
