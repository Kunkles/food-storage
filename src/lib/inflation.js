// Food-inflation / buy-ahead analysis (Milestone 2).
//
// Works off a per-food price history: an array of { date: 'YYYY-MM-DD',
// price: number, qty?: number }. The mechanic: log what you actually pay each
// time you buy a food, and when a price-sensitive staple dips below its usual
// cost, buy ahead (stock up before it climbs). Pure functions, fully testable.

// Price entries sorted oldest → newest by date (stable, non-destructive).
export function sortedPrices(prices = []) {
  return [...prices].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

// Most recent recorded price, or null when there is no history.
export function latestPrice(prices = []) {
  const s = sortedPrices(prices)
  return s.length ? s[s.length - 1].price : null
}

// Percentage change of the latest price vs. the average of the `window`
// entries that came *before* it. Positive = pricier than usual, negative =
// cheaper than usual. Null when there isn't enough history to judge.
export function priceTrendPct(prices = [], window = 3) {
  const s = sortedPrices(prices)
  if (s.length < 2) return null
  const last = s[s.length - 1]
  const prev = s.slice(0, -1).slice(-window)
  if (prev.length === 0) return null
  const avg = prev.reduce((sum, p) => sum + p.price, 0) / prev.length
  if (avg === 0) return null
  return ((last.price - avg) / avg) * 100
}

// A coarse buy-ahead signal:
//   'no-data' — not enough history yet
//   'buy'     — latest price is meaningfully below the recent average (dip)
//   'wait'    — latest price is meaningfully above the recent average (spike)
//   'normal'  — within the threshold band
export function buyAheadSignal(prices = [], threshold = 10) {
  const pct = priceTrendPct(prices)
  if (pct === null) return 'no-data'
  if (pct <= -threshold) return 'buy'
  if (pct >= threshold) return 'wait'
  return 'normal'
}

// Cost per 100,000 kcal across the price history — the "cheap calories" trend.
// Empty when the food has no calories (salt, coffee) or has no prices yet.
export function costPer100kTrend(prices = [], perUnitKcal = 0) {
  if (perUnitKcal <= 0) return []
  return sortedPrices(prices).map((p) => ({
    date: p.date,
    price: p.price,
    value: p.price / (perUnitKcal / 100000),
  }))
}

// Append a price entry and re-sort chronologically (pure, non-destructive).
export function addPriceEntry(existing = [], entry) {
  return [...existing, entry].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

// Add a purchase to the journal (pure). Appends a price entry — replacing any
// existing entry with the same date — and records the latest purchase.
export function addJournalEntry(foodId, stock, { date, price, qty }) {
  const entry = { date, price, qty }
  const current = stock[foodId] || {}
  const prices = addPriceEntry((current.prices || []).filter((p) => p.date !== date), entry)
  return {
    ...stock,
    [foodId]: {
      ...current,
      prices,
      lastPurchased: date,
      lastPurchasePrice: price,
      lastPurchaseQty: qty,
    },
  }
}

// Record that a food was just rotated (eaten through & replaced) on a date
// (pure). Leaves any other stored fields intact.
export function markRotated(foodId, stock, date) {
  const current = stock[foodId] || {}
  return { ...stock, [foodId]: { ...current, lastRotation: date } }
}

// Store an explicit rotation-cadence override (months) for a food (pure).
export function setRotationMonths(foodId, stock, months) {
  const current = stock[foodId] || {}
  return { ...stock, [foodId]: { ...current, rotationMonths: months } }
}
