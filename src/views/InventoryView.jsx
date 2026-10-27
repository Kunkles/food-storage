import { useState } from 'react'
import { CHURCH_STORE_ORDERS } from '../data/churchStore.js'
import { daysCovered, hasOrder, waterDaysCovered } from '../lib/inventory.js'
import { fmtKcal, fmtNum } from '../lib/format.js'

// Days as a whole number, with months alongside once it runs past ~2 months.
function fmtDays(d) {
  const days = Math.floor(d)
  if (days < 60) return `${days} days`
  return `${fmtNum(days)} days (≈ ${(d / 30.4).toFixed(1)} months)`
}

// What's already in the pantry and how long it lasts the household.
// Separate from the Plan: the plan is what you intend to buy, this is what you
// already have.
export default function InventoryView({
  people, hygieneWater, inventory, setInventory, waterOnHand, setWaterOnHand, onImportOrder,
}) {
  const [draft, setDraft] = useState({ name: '', unit: '', qty: 1, perUnitKcal: 0 })

  const cover = daysCovered(inventory, people)
  const waterDays = waterDaysCovered(waterOnHand, people, hygieneWater)
  const foods = inventory.filter((it) => it.category !== 'supply')
  const supplies = inventory.filter((it) => it.category === 'supply')

  const setNum = (id, field) => (e) =>
    setInventory((inv) => inv.map((it) => (it.id === id ? { ...it, [field]: Number(e.target.value) || 0 } : it)))
  const onRemove = (id) => setInventory((inv) => inv.filter((it) => it.id !== id))

  const onAddCustom = (e) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    setInventory((inv) => [
      ...inv,
      {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: draft.name.trim(),
        category: Number(draft.perUnitKcal) > 0 ? 'staple' : 'supply',
        unit: draft.unit.trim() || 'unit',
        qty: Number(draft.qty) || 0,
        perUnitKcal: Number(draft.perUnitKcal) || 0,
        source: 'manual',
      },
    ])
    setDraft({ name: '', unit: '', qty: 1, perUnitKcal: 0 })
  }

  return (
    <>
      <section className="card">
        <h3>On hand</h3>
        <p className="hint">
          Food you already have stored, and how long it would feed the {people.length}{' '}
          {people.length === 1 ? 'person' : 'people'} in your household. Calories are estimates —
          check your can labels and edit kcal/unit to match.
        </p>
        <div className="stat-grid">
          <div className="stat">
            <div className="k">Stored calories</div>
            <div className="v">{fmtNum(cover.kcal / 1000)}k</div>
            <div className="s">{fmtKcal(cover.kcal)}</div>
          </div>
          <div className="stat">
            <div className="k">Emergency rations</div>
            <div className="v">{fmtDays(cover.emergencyDays)}</div>
            <div className="s">at {fmtKcal(cover.emergencyPerDay)}/day for the household</div>
          </div>
          <div className="stat">
            <div className="k">Normal eating</div>
            <div className="v">{fmtDays(cover.normalDays)}</div>
            <div className="s">at {fmtKcal(cover.normalPerDay)}/day for the household</div>
          </div>
          <div className="stat">
            <div className="k">Stored water</div>
            <div className="v">{fmtDays(waterDays)}</div>
            <div className="s">
              gallons on hand:
              <input
                type="number" min="0" step="1" value={waterOnHand}
                onChange={(e) => setWaterOnHand(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          Days covered counts calories only. Most of this needs cooking water and a heat source,
          and stored grains and beans are low in fat — pair them with oil, salt and some protein.
        </p>
      </section>

      <section className="card no-print">
        <h3>Import an order</h3>
        <div className="toolbar" style={{ marginTop: 8 }}>
          {CHURCH_STORE_ORDERS.map((order) => {
            const done = hasOrder(inventory, order.id)
            return (
              <button
                key={order.id}
                className={done ? 'btn' : 'btn btn-primary'}
                disabled={done}
                onClick={() => onImportOrder(order)}
              >
                {done ? `✓ ${order.label} added` : `Add ${order.label}`}
              </button>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h3>Food</h3>
        <table className="grid">
          <thead>
            <tr>
              <th>Item</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>kcal/unit</th>
              <th>Total kcal</th>
              <th className="no-print" />
            </tr>
          </thead>
          <tbody>
            {foods.map((it) => (
              <tr key={it.id} className={it.category === 'noCook' ? 'row-nocook' : 'row-staple'}>
                <td>{it.name}</td>
                <td>{it.unit}</td>
                <td>
                  <input className="cellnum" type="number" min="0" value={it.qty} onChange={setNum(it.id, 'qty')} />
                </td>
                <td>
                  <input className="cellnum" type="number" min="0" step="100" value={it.perUnitKcal} onChange={setNum(it.id, 'perUnitKcal')} />
                </td>
                <td>{fmtKcal(it.qty * it.perUnitKcal)}</td>
                <td className="no-print">
                  <button className="btn btn-ghost" onClick={() => onRemove(it.id)}>✕</button>
                </td>
              </tr>
            ))}
            {foods.length === 0 && (
              <tr>
                <td colSpan="6" className="hint">Nothing on hand yet — import an order or add an item below.</td>
              </tr>
            )}
          </tbody>
        </table>

        <form className="journal-form no-print" onSubmit={onAddCustom}>
          <label className="grow">
            <span>Item</span>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Canned chicken" />
          </label>
          <label>
            <span>Unit</span>
            <input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="12.5 oz can" />
          </label>
          <label className="num">
            <span>Qty</span>
            <input type="number" min="0" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} />
          </label>
          <label className="num">
            <span>kcal/unit</span>
            <input type="number" min="0" value={draft.perUnitKcal} onChange={(e) => setDraft({ ...draft, perUnitKcal: e.target.value })} />
          </label>
          <button className="btn" type="submit">+ Add</button>
        </form>
      </section>

      {supplies.length > 0 && (
        <section className="card">
          <h3>Supplies</h3>
          <table className="grid">
            <thead>
              <tr>
                <th>Item</th>
                <th>Unit</th>
                <th>Qty</th>
                <th className="no-print" />
              </tr>
            </thead>
            <tbody>
              {supplies.map((it) => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td>{it.unit}</td>
                  <td>
                    <input className="cellnum" type="number" min="0" value={it.qty} onChange={setNum(it.id, 'qty')} />
                  </td>
                  <td className="no-print">
                    <button className="btn btn-ghost" onClick={() => onRemove(it.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}
