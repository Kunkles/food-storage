import { useState } from 'react'
import { ON_HAND_ROTATION_MONTHS, onHandRotationFoods, rotationCalendar, todayIso } from '../lib/rotation.js'

// Rotation status → colored pill.
function StatusBadge({ status }) {
  const map = {
    baseline: { cls: 'badge-warn', label: 'Set baseline' },
    overdue: { cls: 'badge-danger', label: 'Overdue' },
    'due-soon': { cls: 'badge-warn', label: 'Due soon' },
    ok: { cls: 'badge-ok', label: 'On track' },
  }
  const { cls, label } = map[status] || { cls: '', label: status }
  return <span className={`badge ${cls}`}>{label}</span>
}

// The rotation calendar (Milestone 2). Lists every food on a rotation cadence,
// shows when it was last rotated and when it comes due, and lets you mark it
// rotated (restarts the cycle) or adjust its cadence.
export default function RotationView({ foods, inventory, stock, onMarkRotated, onSetRotation }) {
  const [filter, setFilter] = useState('all')
  const all = rotationCalendar(todayIso(), [...foods, ...onHandRotationFoods(inventory)], stock)
  const rows =
    filter === 'all' ? all
      : filter === 'onhand' ? all.filter((r) => r.onHand)
        : all.filter((r) => !r.onHand && r.category === filter)

  return (
    <>
      <section className="card">
        <div className="card-head">
          <h3>Rotation calendar</h3>
          <div className="toolbar no-print">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All foods</option>
              <option value="staple">Staples</option>
              <option value="noCook">No-cook</option>
              <option value="onhand">On hand</option>
            </select>
          </div>
        </div>
        <p className="hint">
          Eat through each stored food on a set cadence, then mark it when you replace it.
          That keeps your store fresh <em>and</em> keeps you practicing the exact meals you'd
          cook in a disruption. <strong>Mark rotated</strong> sets today as the start of the next
          cycle. (Set a cadence of 0 to take a food off the schedule.)
        </p>
        {filter === 'onhand' && (
          <p className="hint">
            These are the long-term cans and pouches from the On Hand tab. They keep for decades,
            so they start on a {ON_HAND_ROTATION_MONTHS}-month cycle: open one, cook with it, and
            replace it — practice before you need it. Change the cadence to suit you.
          </p>
        )}
        {rows.length === 0 ? (
          <p className="hint">Nothing on the rotation schedule for this filter yet.</p>
        ) : (
          <table className="grid">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Last rotated</th>
                <th>Next due</th>
                <th>Status</th>
                <th>Cadence (mo)</th>
                <th className="no-print" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.foodId} className={r.category === 'noCook' ? 'row-nocook' : 'row-staple'}>
                  <td>
                    {r.exposed && <span className="exposed" title="El Niño / import price-sensitive">⚠</span>}
                    {r.name}
                  </td>
                  <td>{r.onHand && 'on hand · '}{r.category === 'noCook' ? 'no-cook' : 'staple'}</td>
                  <td>{r.lastRotation || <span className="hint">not set</span>}</td>
                  <td>{r.nextDue || '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    <input
                      className="cellnum"
                      type="number"
                      min="0"
                      step="1"
                      value={r.months}
                      onChange={(e) => onSetRotation(r.foodId, Number(e.target.value) || 0)}
                    />
                  </td>
                  <td className="no-print">
                    <button className="btn" onClick={() => onMarkRotated(r.foodId, todayIso())}>
                      {r.status === 'baseline' ? 'Set baseline' : 'Mark rotated'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
