import { useState } from 'react'
import { readAmount, unitSize } from '../lib/usage.js'
import { todayIso } from '../lib/rotation.js'
import { fmtQty, fmtUsed, shortUnit } from './UseFood.jsx'

const BATCHES = [0.5, 1, 2, 3]
const round2 = (n) => Math.round(n * 100) / 100

// "I made this": takes a recipe's storage foods off the On Hand counts.
// Amounts are worked out from the recipe and can be changed before confirming.
export default function MadeThis({ recipe, status, inventory, onUseFood, onUndoUse }) {
  const [open, setOpen] = useState(false)
  const [batches, setBatches] = useState(1)
  const [date, setDate] = useState(todayIso())
  const [edits, setEdits] = useState({}) // productId → { amount, on }
  const [done, setDone] = useState(null) // the log entries just made

  // One row per storage food in the recipe, sized in cups when we know the can size.
  const rows = status.storage.map((s) => {
    const item = inventory.find((it) => it.productId === s.id && Number(it.qty) > 0)
    const onHand = inventory.filter((it) => it.productId === s.id).reduce((t, it) => t + (Number(it.qty) || 0), 0)
    const size = item ? unitSize(item) : { cups: null }
    const measure = size.cups ? 'cups' : 'unit'
    // The recipe's amount for one batch, in the row's measure (cups or cans).
    const read = item ? readAmount(s.amount) : null
    let perBatch = null
    if (read?.cups != null && measure === 'cups') perBatch = read.cups
    if (read?.lb != null && size.lb) perBatch = measure === 'cups' ? (read.lb / size.lb) * size.cups : read.lb / size.lb
    const suggested = perBatch == null ? '' : round2(perBatch * batches)
    const edit = edits[s.id] || {}
    const amount = edit.amount ?? suggested
    const on = edit.on ?? (!!item && !s.optional && perBatch != null)
    const units = (Number(amount) || 0) / (measure === 'cups' ? size.cups : 1)
    return { s, item, onHand, measure, amount, on, units, guessed: perBatch != null }
  })
  const lines = rows.filter((r) => r.item && r.on && r.units > 0).map((r) => ({ productId: r.s.id, qty: r.units }))

  const setRow = (id, patch) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }))
  const reset = () => { setEdits({}); setBatches(1); setDate(todayIso()) }

  const confirm = () => {
    const entries = onUseFood(lines, recipe.name, date)
    setDone(entries)
    setOpen(false)
    reset()
  }
  const undo = () => {
    onUndoUse(done.map((e) => e.id))
    setDone(null)
  }

  if (done) {
    return (
      <div className="made-this done">
        <span>
          Took out {done.map((e) => `${fmtUsed(e.qty, e)} ${e.name.toLowerCase()}`).join(', ')}.
        </span>
        <button className="btn btn-small" onClick={undo}>Undo</button>
        <button className="btn btn-small" onClick={() => setDone(null)}>OK</button>
      </div>
    )
  }
  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)} disabled={!status.storage.some((s) => inventory.some((it) => it.productId === s.id && Number(it.qty) > 0))}>
        I made this
      </button>
    )
  }

  return (
    <div className="made-this">
      <p className="hint" style={{ marginTop: 0 }}>
        Take what you used off your On Hand counts. Amounts come from the recipe — change any that
        were different.
      </p>
      <div className="toolbar">
        <span>Batches:</span>
        <div className="chips" style={{ margin: 0 }}>
          {BATCHES.map((b) => (
            <button key={b} type="button" className={batches === b ? 'chip on' : 'chip'}
              onClick={() => { setBatches(b); setEdits((e) => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, { on: v.on }]))) }}>
              {b === 0.5 ? '½' : b}×
            </button>
          ))}
        </div>
        <label className="check" style={{ margin: 0 }}>
          Date <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value || todayIso())} />
        </label>
      </div>
      <table className="grid">
        <tbody>
          {rows.map((r) => (
            <tr key={r.s.id} className={r.item ? '' : 'muted'}>
              <td>
                <label className="check" style={{ margin: 0 }}>
                  <input type="checkbox" checked={r.on} disabled={!r.item} onChange={(e) => setRow(r.s.id, { on: e.target.checked })} />
                  {r.s.name}
                </label>
              </td>
              <td className="hint">{r.s.amount}{r.s.optional ? ' (optional)' : ''}</td>
              <td className="nowrap">
                {r.item ? (
                  <>
                    <input className="cellnum" type="number" min="0" step="any" value={r.amount}
                      placeholder="how much?" onChange={(e) => setRow(r.s.id, { amount: e.target.value, on: true })} />{' '}
                    {r.measure === 'cups' ? 'cups' : shortUnit(r.item.unit)}
                  </>
                ) : 'not on hand'}
              </td>
              <td className="hint">
                {r.item && r.on && r.units > 0 && (
                  <>{fmtQty(r.units)} of {fmtQty(r.onHand)} {shortUnit(r.item.unit, r.onHand)}</>
                )}
                {r.item && !r.guessed && !(r.units > 0) && 'enter the amount'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="toolbar" style={{ marginTop: 8 }}>
        <button className="btn btn-primary" onClick={confirm} disabled={!lines.length}>Take it out of storage</button>
        <button className="btn" onClick={() => { setOpen(false); reset() }}>Cancel</button>
      </div>
    </div>
  )
}
