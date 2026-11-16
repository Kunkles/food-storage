import { Fragment, useState } from 'react'
import { CHURCH_STORE_ORDERS } from '../data/churchStore.js'
import { daysCovered, hasOrder, waterDaysCovered } from '../lib/inventory.js'
import { fmtKcal, fmtNum } from '../lib/format.js'
import { dietIssues } from '../lib/diets.js'
import DietIssues from '../components/DietIssues.jsx'
import { UseFoodForm, UsageLog } from '../components/UseFood.jsx'
import { projectRunOut, usagePace } from '../lib/usage.js'
import { todayIso } from '../lib/rotation.js'

const fmtDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

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
  people, hygieneWater, inventory, setInventory, usage = [], onUseFood, onUndoUse, waterGallons, onImportOrder, goTo,
}) {
  const [draft, setDraft] = useState({ name: '', unit: '', qty: 1, perUnitKcal: 0 })
  const [using, setUsing] = useState(null) // id of the row whose Use form is open

  const cover = daysCovered(inventory, people)
  const waterDays = waterDaysCovered(waterGallons, people, hygieneWater)
  // How fast it's actually going, from what you've logged.
  const today = todayIso()
  const pace = usagePace(usage, today)
  const runOut = projectRunOut(cover.kcal, pace, today)
  const pctOfRation = pace && cover.emergencyPerDay > 0 ? Math.round((pace.kcalPerDay / cover.emergencyPerDay) * 100) : null
  const foods = inventory.filter((it) => it.category !== 'supply')
  const supplies = inventory.filter((it) => it.category === 'supply')
  // Stored foods that don't fit someone's allergies or diet.
  const issues = dietIssues(foods.filter((it) => it.qty > 0).map((it) => ({ label: it.name, text: it.name })), people)

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
            <div className="k">At the rate you're using it</div>
            {runOut ? (
              <>
                <div className="v">{fmtDays(runOut.days)}</div>
                <div className="s">
                  until about {fmtDate(runOut.date)} · {fmtKcal(pace.kcalPerDay)}/day over the last{' '}
                  {pace.days === 1 ? 'day' : `${pace.days} days`}
                  {pace.days < 7 && ' — rough until you\'ve logged a week or so'}
                </div>
              </>
            ) : (
              <>
                <div className="v">—</div>
                <div className="s">press <strong>Use</strong> on a food when you take some out</div>
              </>
            )}
          </div>
          <div className="stat">
            <div className="k">Stored water</div>
            <div className="v">{fmtDays(waterDays)}</div>
            <div className="s">
              {fmtNum(waterGallons)} gallons ·{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); goTo('water') }}>details</a>
            </div>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          Days covered counts calories only. Most of this needs cooking water and a heat source,
          and stored grains and beans are low in fat — pair them with oil, salt and some protein.
        </p>
      </section>

      <section className="card">
        <h3>Food you've used</h3>
        {usage.length ? (
          <>
            <p className="hint">
              Each time you press <strong>Use</strong> here, or <strong>I made this</strong> on a recipe,
              it comes off the counts below and every projection updates — days covered, water and fuel
              for your stored food, and the run-out date above.
              {pace && pctOfRation !== null && (
                <> Lately you're using {pctOfRation}% of your household's emergency ration a day
                  {pctOfRation < 100 ? ' (the rest is coming from other food)' : ''}.</>
              )}{' '}
              Opening and cooking with a can also counts as rotating it.
            </p>
            <UsageLog usage={usage} onUndo={onUndoUse} />
          </>
        ) : (
          <p className="hint">
            Nothing used yet. When you take food out of storage, press <strong>Use</strong> next to it
            below, or <strong>I made this</strong> on a recipe. It comes off the counts, projections
            update, and you'll see how long the rest lasts at your real pace. Mistakes can be undone
            here.
          </p>
        )}
      </section>

      {issues.length > 0 && (
        <section className="card">
          <h3>Allergies and diets</h3>
          <p className="hint">
            Stored foods that don't suit someone in your household. Their days covered will be
            shorter than the totals above — plan some extra food they can eat.
          </p>
          <DietIssues issues={issues} />
        </section>
      )}

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
              <Fragment key={it.id}>
                <tr className={it.category === 'noCook' ? 'row-nocook' : 'row-staple'}>
                  <td>{it.name}</td>
                  <td>{it.unit}</td>
                  <td>
                    <input className="cellnum" type="number" min="0" step="any" value={Math.round((Number(it.qty) || 0) * 1000) / 1000} onChange={setNum(it.id, 'qty')} />
                  </td>
                  <td>
                    <input className="cellnum" type="number" min="0" step="100" value={it.perUnitKcal} onChange={setNum(it.id, 'perUnitKcal')} />
                  </td>
                  <td>{fmtKcal(it.qty * it.perUnitKcal)}</td>
                  <td className="no-print nowrap">
                    <button
                      className="btn btn-small"
                      disabled={!(Number(it.qty) > 0)}
                      onClick={() => setUsing(using === it.id ? null : it.id)}
                    >
                      Use
                    </button>
                    <button className="btn btn-ghost" onClick={() => onRemove(it.id)} title="Delete this row">✕</button>
                  </td>
                </tr>
                {using === it.id && (
                  <tr className="no-print">
                    <td colSpan="6">
                      <UseFoodForm item={it} onUse={onUseFood} onClose={() => setUsing(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
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
                    <input className="cellnum" type="number" min="0" step="any" value={Math.round((Number(it.qty) || 0) * 1000) / 1000} onChange={setNum(it.id, 'qty')} />
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
