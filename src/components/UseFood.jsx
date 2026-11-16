import { useState } from 'react'
import { fmtCups, unitSize } from '../lib/usage.js'
import { todayIso } from '../lib/rotation.js'
import { fmtKcal } from '../lib/format.js'

// A count without trailing zeros: 6, 5.5, 0.333.
export const fmtQty = (n) => String(Math.round((Number(n) || 0) * 1000) / 1000)

// A short unit name for "2 cans", from a unit like "#10 can (~5.6 lb)".
export function shortUnit(unit, qty = 2) {
  const base = String(unit || 'unit').replace(/\(.*?\)/g, '').replace(/^#\d+\s*/, '').trim() || 'unit'
  if (Number(qty) === 1 || /s$/.test(base)) return base
  return /(ch|sh|x)$/.test(base) ? `${base}es` : `${base}s`
}

// How much was used, in cups when the can size is known: "2 cups (0.143 can)".
export function fmtUsed(qty, item) {
  const size = unitSize(item)
  const units = `${fmtQty(qty)} ${shortUnit(item.unit, qty)}`
  if (!size.cups) return units
  const cups = fmtCups(qty * size.cups)
  return Number(qty) >= 1 ? `${units} (${cups})` : `${cups} (${units})`
}

// The inline "how much did you use?" form under an On Hand row.
export function UseFoodForm({ item, onUse, onClose }) {
  const size = unitSize(item)
  const measures = [
    { id: 'unit', label: shortUnit(item.unit), per: 1 },
    ...(size.cups ? [{ id: 'cups', label: 'cups', per: 1 / size.cups }] : []),
    ...(size.lb ? [{ id: 'lb', label: 'lb', per: 1 / size.lb }] : []),
  ]
  const [amount, setAmount] = useState('1')
  const [measure, setMeasure] = useState(measures.length > 1 ? 'cups' : 'unit')
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const m = measures.find((x) => x.id === measure) || measures[0]
  const units = (Number(amount) || 0) * m.per
  const tooMuch = units > Number(item.qty)

  const submit = (e) => {
    e.preventDefault()
    if (units <= 0) return
    onUse([{ itemId: item.id, qty: Math.min(units, Number(item.qty)) }], note.trim(), date)
    onClose()
  }

  return (
    <form className="use-form" onSubmit={submit}>
      <label className="num">
        <span>Used</span>
        <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </label>
      <label>
        <span>&nbsp;</span>
        <select value={measure} onChange={(e) => setMeasure(e.target.value)}>
          {measures.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </label>
      {measure === 'unit' && (
        <div className="chips">
          {[0.25, 0.5, 1].map((q) => (
            <button key={q} type="button" className={Number(amount) === q ? 'chip on' : 'chip'} onClick={() => setAmount(String(q))}>
              {q === 0.25 ? '¼' : q === 0.5 ? '½' : '1'}
            </button>
          ))}
        </div>
      )}
      <label>
        <span>Date</span>
        <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value || todayIso())} />
      </label>
      <label className="grow">
        <span>For (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. bread, sent to a neighbor" />
      </label>
      <button className="btn btn-primary" type="submit" disabled={units <= 0}>Take out</button>
      <button className="btn" type="button" onClick={onClose}>Cancel</button>
      <p className="hint use-form-note">
        {units > 0 && (
          <>
            {measure !== 'unit' && <>That's {fmtQty(units)} of a {shortUnit(item.unit, 1)} · </>}
            {fmtKcal(Math.min(units, Number(item.qty)) * (Number(item.perUnitKcal) || 0))}
            {tooMuch && <> · only {fmtQty(item.qty)} on hand, so that's all that comes off</>}
          </>
        )}
      </p>
    </form>
  )
}

// What's been taken out, newest first, with Undo.
export function UsageLog({ usage, onUndo, limit = 12 }) {
  const [all, setAll] = useState(false)
  const shown = all ? usage : usage.slice(0, limit)
  if (!usage.length) return null
  return (
    <>
      <table className="grid">
        <thead>
          <tr>
            <th>Date</th>
            <th>Item</th>
            <th>Used</th>
            <th>kcal</th>
            <th>For</th>
            <th className="no-print" />
          </tr>
        </thead>
        <tbody>
          {shown.map((e) => (
            <tr key={e.id}>
              <td>{e.date}</td>
              <td>{e.name}</td>
              <td>{fmtUsed(e.qty, e)}</td>
              <td>{fmtKcal(e.kcal)}</td>
              <td>{e.note || '—'}</td>
              <td className="no-print">
                <button className="btn btn-small" onClick={() => onUndo(e.id)} title="Put it back on the counts">Undo</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {usage.length > limit && (
        <button className="btn btn-small" style={{ marginTop: 8 }} onClick={() => setAll(!all)}>
          {all ? 'Show recent only' : `Show all ${usage.length}`}
        </button>
      )}
    </>
  )
}
