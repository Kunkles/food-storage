import { useState } from 'react'
import { todayIso } from '../lib/rotation.js'
import {
  latestPrice,
  priceTrendPct,
  buyAheadSignal,
  costPer100kTrend,
} from '../lib/inflation.js'
import { fmtMoney } from '../lib/format.js'

// Buy-ahead signal → colored pill.
function SignalBadge({ signal }) {
  const map = {
    buy: { cls: 'badge badge-ok', label: 'Buy ahead (dip)' },
    wait: { cls: 'badge badge-warn', label: 'Pricey — wait' },
    normal: { cls: 'badge', label: 'Normal' },
    'no-data': { cls: 'badge badge-muted', label: 'No history' },
  }
  const { cls, label } = map[signal] || map['no-data']
  return <span className={cls}>{label}</span>
}

// Signed percentage with a color cue (green when cheaper than usual).
function TrendPct({ pct }) {
  if (pct === null) return <span className="hint">—</span>
  const up = pct > 0
  const text = `${up ? '+' : ''}${Math.round(pct)}%`
  return <span className={up ? 'trend-up' : 'trend-down'}>{text}</span>
}

// Price Journal (Milestone 2) — the core of the food-inflation hedge.
// Log what you actually pay each time you buy a food; get buy-ahead signals
// when a price-sensitive staple dips below its usual cost, plus the
// cost-per-100k-calorie for each.
export default function JournalView({ foods, stock, onLogPrice }) {
  const [sel, setSel] = useState('')
  const [date, setDate] = useState(todayIso())
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('')

  const selFood = foods.find((f) => f.id === sel)

  const submit = (e) => {
    e.preventDefault()
    if (!selFood || !Number(price) || Number(price) <= 0) return
    onLogPrice(selFood.id, { date: date || todayIso(), price: Number(price), qty: Number(qty) || 1 })
    setPrice('')
    setQty('')
    setSel('')
  }

  // Build one row per food, then show: every food with history (sorted by
  // buy-ahead signal), plus exposed foods that have none yet (a prompt to
  // start logging the important ones).
  const rows = foods.map((f) => {
    const entry = stock[f.id] || {}
    const prices = entry.prices || []
    const trend = costPer100kTrend(prices, f.perUnitKcal)
    return {
      foodId: f.id,
      name: f.name,
      exposed: !!f.elNinoExposed,
      perUnitKcal: f.perUnitKcal,
      count: prices.length,
      last: latestPrice(prices),
      pct: priceTrendPct(prices, 3),
      signal: buyAheadSignal(prices, 10),
      lastCp100k: trend.length ? trend[trend.length - 1].value : null,
      lastPurchased: entry.lastPurchased,
    }
  })
  const rank = { buy: 0, wait: 1, normal: 2, 'no-data': 3 }
  const display = [...rows.filter((r) => r.count > 0), ...rows.filter((r) => r.count === 0 && r.exposed)].sort(
    (a, b) => rank[a.signal] - rank[b.signal] || b.exposed - a.exposed || a.name.localeCompare(b.name)
  )

  return (
    <>
      <section className="card">
        <div className="card-head"><h3>Log a price</h3></div>
        <p className="hint">
          The heart of the inflation hedge: each time you buy a food, log what you actually
          paid. When a price-sensitive staple dips below its usual cost, you'll get a{' '}
          <strong>buy-ahead</strong> signal — stock up before it climbs.
        </p>
        <form className="journal-form" onSubmit={submit}>
          <label>
            <span>Food</span>
            <select
              value={sel}
              onChange={(e) => {
                setSel(e.target.value)
                const f = foods.find((x) => x.id === e.target.value)
                if (f && !price) setPrice(String(f.price || ''))
              }}
            >
              <option value="">Choose a food…</option>
              {foods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}{f.elNinoExposed ? ' ⚠' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="num"><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="num"><span>Price / unit ($)</span><input className="cellnum" type="number" step="0.05" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label className="num"><span>Qty</span><input className="cellnum" type="number" step="1" min="1" placeholder="1" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
          <button className="btn btn-primary" type="submit" disabled={!selFood || !Number(price)}>Log price</button>
        </form>
      </section>

      <section className="card">
        <h3>Price history &amp; buy-ahead signals</h3>
        <p className="hint">
          Sorted by opportunity (dips first). <span className="exposed">⚠</span> = most exposed to
          commodity / climate price swings. “vs. usual” compares your latest price to the recent
          average of what you've paid.
        </p>
        {display.length === 0 ? (
          <p className="hint">No prices logged yet. Log your first receipt above to start building your price history.</p>
        ) : (
          <table className="grid">
            <thead>
              <tr>
                <th>Item</th>
                <th>Last price</th>
                <th>vs. usual</th>
                <th>Signal</th>
                <th>$/100k kcal</th>
                <th>Last logged</th>
              </tr>
            </thead>
            <tbody>
              {display.map((r) => (
                <tr key={r.foodId}>
                  <td>{r.exposed && <span className="exposed" title="El Niño / import price-sensitive">⚠</span>}{r.name}</td>
                  <td>{r.last != null ? fmtMoney(r.last) : '—'}</td>
                  <td><TrendPct pct={r.pct} /></td>
                  <td><SignalBadge signal={r.signal} /></td>
                  <td>{r.lastCp100k != null ? fmtMoney(r.lastCp100k) : '—'}</td>
                  <td>{r.lastPurchased || `${r.count} entr${r.count === 1 ? 'y' : 'ies'}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
