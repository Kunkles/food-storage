import { useState } from 'react'
import { planSummary, itemCost } from '../lib/calc.js'
import { extrasToBuy } from '../lib/recipes.js'
import { addRecipeExtras, clearChecked, listCost, newExtra } from '../lib/shopping.js'
import { fmtMoney, fmtGallons } from '../lib/format.js'

const num = (v) => Math.max(0, Number(v) || 0)

// One table of lines with a check-off box, editable qty and price, and remove.
// Defined outside the view so inputs keep focus while typing.
function Group({ title, hint, items, checked, onCheck, onChange, onRemove, editName }) {
  if (items.length === 0) return null
  return (
    <section className="card">
      <h3>{title}</h3>
      {hint && <p className="hint">{hint}</p>}
      <table className="grid">
        <thead>
          <tr>
            <th style={{ width: 36 }}>Got</th>
            <th>Item</th>
            <th>Size</th>
            <th>Qty</th>
            <th>$/unit</th>
            <th>Est. cost</th>
            <th className="no-print" />
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className={checked[it.id] ? 'row-got' : ''}>
              <td>
                <input type="checkbox" checked={!!checked[it.id]} onChange={() => onCheck(it.id)} aria-label={`Got ${it.name}`} />
              </td>
              <td>
                {editName
                  ? <input value={it.name} onChange={(e) => onChange(it.id, { name: e.target.value })} />
                  : <>{it.elNinoExposed && <span className="exposed" title="Likely to rise in price">⚠</span>}{it.name}</>}
              </td>
              <td>
                {editName
                  ? <input className="cellnum" value={it.unit} placeholder="size" onChange={(e) => onChange(it.id, { unit: e.target.value })} />
                  : it.unit}
              </td>
              <td>
                <input className="cellnum" type="number" min="0" value={it.qty} onChange={(e) => onChange(it.id, { qty: num(e.target.value) })} />
              </td>
              <td>
                <input className="cellnum" type="number" min="0" step="0.01" value={it.price} onChange={(e) => onChange(it.id, { price: num(e.target.value) })} />
              </td>
              <td>{fmtMoney(itemCost(it))}</td>
              <td className="no-print">
                <button className="btn btn-ghost" onClick={() => onRemove(it.id)} aria-label={`Remove ${it.name}`}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

// The shopping list: the plan's foods (edits here change the plan too), plus
// your own items, with boxes to check off as you shop.
export default function ShoppingList({
  people, days, plan, hygieneWater, onItemChange, onRemove, shopping, setShopping, pantry, recipes,
}) {
  const [draft, setDraft] = useState({ name: '', qty: 1, unit: '', price: '' })
  const summary = planSummary(people, days, plan, hygieneWater)
  const noCook = plan.filter((p) => p.category === 'noCook')
  const staples = plan.filter((p) => p.category !== 'noCook')
  const { checked, extras } = shopping
  const cost = listCost(plan, extras, checked)
  const gotCount = [...plan, ...extras].filter((it) => checked[it.id]).length
  const recipeExtras = extrasToBuy(recipes, pantry)

  const onCheck = (id) => setShopping((s) => ({ ...s, checked: { ...s.checked, [id]: !s.checked[id] } }))
  const onExtraChange = (id, patch) =>
    setShopping((s) => ({ ...s, extras: s.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
  const onExtraRemove = (id) => setShopping((s) => ({ ...s, extras: s.extras.filter((e) => e.id !== id) }))
  const onPlanRemove = (id) => {
    const it = plan.find((p) => p.id === id)
    if (window.confirm(`Remove ${it?.name || 'this item'}? It comes off your plan in the Calculator too.`)) onRemove(id)
  }

  const onAdd = (e) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    setShopping((s) => ({ ...s, extras: [...s.extras, newExtra(draft)] }))
    setDraft({ name: '', qty: 1, unit: '', price: '' })
  }

  const groupProps = { checked, onCheck }

  return (
    <>
      <section className="card">
        <h3>Shopping List</h3>
        <p className="hint">
          {summary.headCount} people · {days} days · {fmtGallons(summary.water)} water.
          Change quantities and prices right here, check things off as you shop, and add anything
          else you need.
        </p>
        <div className="stat-grid">
          <div className="stat">
            <div className="k">Total</div>
            <div className="v">{fmtMoney(cost.total)}</div>
            <div className="s">{plan.length + extras.length} items</div>
          </div>
          <div className="stat">
            <div className="k">Still to buy</div>
            <div className="v">{fmtMoney(cost.left)}</div>
            <div className="s">{gotCount} checked off</div>
          </div>
        </div>
        <div className="toolbar no-print" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => window.print()}>Print this list</button>
          {gotCount > 0 && (
            <button className="btn" onClick={() => setShopping(clearChecked)}>Uncheck all</button>
          )}
        </div>
      </section>

      <Group
        title="No-cook / no-power foods" items={noCook} {...groupProps}
        onChange={onItemChange} onRemove={onPlanRemove}
      />
      <Group
        title="Staples (cook & rotate)" items={staples} {...groupProps}
        onChange={onItemChange} onRemove={onPlanRemove}
        hint="Plan foods are shared with the Calculator, so changing them here changes it there too."
      />
      <Group
        title="Your own items" items={extras} {...groupProps} editName
        onChange={onExtraChange} onRemove={onExtraRemove}
      />

      <section className="card no-print">
        <h3>Add an item</h3>
        <form className="journal-form" onSubmit={onAdd}>
          <label className="grow">
            <span>Item</span>
            <input value={draft.name} placeholder="e.g. salt, batteries, propane" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            <span>Size</span>
            <input value={draft.unit} placeholder="optional" style={{ width: 110 }} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
          </label>
          <label className="num">
            <span>Qty</span>
            <input type="number" min="0" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} />
          </label>
          <label className="num">
            <span>$/unit</span>
            <input type="number" min="0" step="0.01" value={draft.price} placeholder="0.00" onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </label>
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
        {recipeExtras.length > 0 && (
          <div className="toolbar" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => setShopping((s) => addRecipeExtras(s, recipeExtras))}>
              Add the recipe extras you don't have ({recipeExtras.length})
            </button>
            <span className="hint">From the Recipes tab: {recipeExtras.slice(0, 4).map((x) => x.name.toLowerCase()).join(', ')}…</span>
          </div>
        )}
      </section>

      <section className="card">
        <h3>Notes</h3>
        <ul className="hint" style={{ lineHeight: 1.7 }}>
          <li>
            Water: store {fmtGallons(summary.water)} total (drinking/cooking + hygiene).
          </li>
          <li>
            Prices are baseline estimates — swap in what you actually pay at your local
            grocery or the Church food store.
          </li>
          <li>
            Check for the <span className="exposed">⚠</span> items when prices are unusually
            low (they are the most likely to rise with climate-driven supply shocks).
          </li>
          <li>Store in a cool, dry, dark place; keep off bare concrete.</li>
        </ul>
      </section>
    </>
  )
}
