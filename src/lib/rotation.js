// Rotation calendar logic (Milestone 2).
//
// A "rotation" is the practice of eating through a stored food and replacing it
// on a fixed cadence. Doing this keeps your store fresh AND keeps you practicing
// the exact foods you'd cook during a disruption. This module is pure date math —
// no React, no DOM — so it is fully unit-testable.
//
// Date strings are ISO calendar dates (YYYY-MM-DD). Month arithmetic uses the
// year + month components only, and "due" dates are pinned to the 1st of the
// month so they stay stable.

// How often a food should be rotated by default, based on its category.
// Canned / shelf goods are worked through within ~3 months; dry staples last
// longer, but a 6-month family rotation keeps them fresh.
export function defaultRotationMonths(food) {
  if (!food || !food.category) return 3
  return food.category === 'staple' ? 6 : 3
}

// Whole months between two ISO dates (ignores the day component).
export function monthsBetween(fromIso, toIso) {
  const [fy, fm] = fromIso.split('-').map(Number)
  const [ty, tm] = toIso.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

// Add n months to an ISO date, returning the 1st of the resulting month.
export function addMonths(iso, n) {
  const [y, m] = iso.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}-01`
}

// A Date as an ISO calendar date (YYYY-MM-DD).
export function todayIso(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// The effective rotation cadence for a food. An explicit stored number wins
// (0 means "intentionally off the rotation schedule"); otherwise fall back to
// the category default.
export function rotationMonths(food, entry) {
  const override = entry && entry.rotationMonths
  if (typeof override === 'number') return override
  return defaultRotationMonths(food)
}

// Classify a single food's rotation state.
//   status:
//     'baseline'  — never rotated yet (prompt the user to set a baseline)
//     'overdue'   — a full cycle or more has passed
//     'due-soon'  — within one month of the cycle
//     'ok'        — early in the cycle
export function rotationStatus(food, entry, nowIso) {
  const months = rotationMonths(food, entry)
  const last = entry ? entry.lastRotation : null
  if (!last) return { status: 'baseline', months, lastRotation: null, nextDue: null, monthsSince: null }
  const since = monthsBetween(last, nowIso)
  const nextDue = addMonths(last, months)
  let status
  if (since >= months) status = 'overdue'
  else if (since >= months - 1) status = 'due-soon'
  else status = 'ok'
  return { status, months, lastRotation: last, nextDue, monthsSince: since }
}

// Build the full rotation calendar: every food that has a rotation cadence,
// classified and sorted by urgency (baseline, then overdue, then due-soon,
// then ok; ties broken alphabetically). Foods with a 0 cadence are dropped.
export function rotationCalendar(nowIso, foods, stock = {}) {
  const rank = { baseline: 0, overdue: 1, 'due-soon': 2, ok: 3 }
  return foods
    .map((food) => {
      const entry = stock[food.id]
      const r = rotationStatus(food, entry, nowIso)
      return {
        foodId: food.id,
        name: food.name,
        unit: food.unit,
        category: food.category,
        exposed: !!food.elNinoExposed,
        ...r,
      }
    })
    .filter((r) => r.months > 0)
    .sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name))
}
