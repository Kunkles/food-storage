import { useState } from 'react'
import { todayIso } from '../lib/rotation.js'
import { fmtQty } from './UseFood.jsx'

// The "how much did you use?" form for the Water and Fuel tabs.
//   sources — [{ key, label, available, measures: [{ id, label, per }] }]
//             `available` and `per` are in the source's own units (jugs,
//             tanks…): one of a measure is `per` units.
//   summary(units, source) — a line saying what that comes to
//   onUse({ key, units, date, note })
export function SupplyUseForm({ sources, summary, onUse, onClose, notePlaceholder = '' }) {
  const [key, setKey] = useState(sources[0]?.key)
  const source = sources.find((s) => s.key === key) || sources[0]
  const [amount, setAmount] = useState('1')
  const [measureId, setMeasureId] = useState(source?.measures[0]?.id)
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  if (!source) return null
  const m = source.measures.find((x) => x.id === measureId) || source.measures[0]
  const units = (Number(amount) || 0) * m.per
  const tooMuch = units > source.available + 1e-9

  const pickSource = (k) => {
    const next = sources.find((s) => s.key === k)
    setKey(k)
    // Keep the same kind of measure (gallons, lb…) when the new source has it.
    if (!next.measures.some((x) => x.id === measureId)) setMeasureId(next.measures[0].id)
  }
  const submit = (e) => {
    e.preventDefault()
    if (units <= 0) return
    onUse({ key: source.key, units: Math.min(units, source.available), date, note: note.trim() })
    onClose()
  }

  return (
    <form className="use-form" onSubmit={submit}>
      <label className="grow">
        <span>From</span>
        <select value={source.key} onChange={(e) => pickSource(e.target.value)}>
          {sources.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>
      <label className="num">
        <span>Used</span>
        <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </label>
      <label>
        <span>&nbsp;</span>
        <select value={m.id} onChange={(e) => setMeasureId(e.target.value)}>
          {source.measures.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </label>
      <label>
        <span>Date</span>
        <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value || todayIso())} />
      </label>
      <label className="grow">
        <span>For (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={notePlaceholder} />
      </label>
      <button className="btn btn-primary" type="submit" disabled={units <= 0}>Take out</button>
      <button className="btn" type="button" onClick={onClose}>Cancel</button>
      <p className="hint use-form-note">
        {units > 0 && (
          <>
            {summary(Math.min(units, source.available), source)}
            {tooMuch && <> · only {fmtQty(source.available)} there, so that's all that comes off</>}
          </>
        )}
      </p>
    </form>
  )
}

// What's been used, newest first, with Undo.
//   describe(entry) — the Used column
export function SupplyLog({ entries, describe, onUndo, limit = 12 }) {
  const [all, setAll] = useState(false)
  if (!entries.length) return null
  const shown = all ? entries : entries.slice(0, limit)
  return (
    <>
      <table className="grid">
        <thead>
          <tr>
            <th>Date</th>
            <th>From</th>
            <th>Used</th>
            <th>For</th>
            <th className="no-print" />
          </tr>
        </thead>
        <tbody>
          {shown.map((e) => (
            <tr key={e.id}>
              <td className="nowrap">{e.date}</td>
              <td>{e.name}</td>
              <td>{describe(e)}</td>
              <td>{e.note || '—'}</td>
              <td className="no-print">
                <button className="btn btn-small" onClick={() => onUndo(e.id)} title="Put it back on the counts">Undo</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length > limit && (
        <button className="btn btn-small" style={{ marginTop: 8 }} onClick={() => setAll(!all)}>
          {all ? 'Show recent only' : `Show all ${entries.length}`}
        </button>
      )}
    </>
  )
}
