// Using food from storage: taking it off the On Hand counts, keeping a log you
// can undo, and projecting how long the rest lasts at the pace you're eating
// it. Pure functions — no React, no DOM.
import { CHURCH_STORE_PRODUCTS } from '../data/churchStore.js'

const products = Object.fromEntries(CHURCH_STORE_PRODUCTS.map((p) => [p.id, p]))

let seq = 0
const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `use-${Date.now()}-${seq++}`)

// Counts are kept to 4 decimals so repeated ⅓ cups don't leave 0.0000001
// cans, while a cup out of a 14-cup can still reads back as a cup.
const round3 = (n) => Math.round(n * 10000) / 10000

// ---- reading recipe amounts ----

const FRACTIONS = { '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8 }
const FRACTION_CHARS = Object.keys(FRACTIONS).join('')

// Cups per unit, or pounds per unit for weights.
const UNITS = [
  { re: /^(cups?|c)\b/, cups: 1 },
  { re: /^(tbsps?|tablespoons?|tbs|T)\b/, cups: 1 / 16 },
  { re: /^(tsps?|teaspoons?|t)\b/, cups: 1 / 48 },
  { re: /^(lbs?|pounds?)\b/, lb: 1 },
  { re: /^(oz|ounces?)\b/, lb: 1 / 16 },
  { re: /^(kg|kilograms?)\b/, lb: 2.2046 },
  { re: /^(g|grams?)\b/, lb: 0.0022046 },
]

// "1½", "1 1/2", "1/2", "⅓", "2", "0.5" at the start of the text → [number, rest].
function leadingNumber(text) {
  const mixed = text.match(/^\s*(\d+)\s+(\d+)\/(\d+)/)
  if (mixed) return [Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]), text.slice(mixed[0].length)]
  const frac = text.match(/^\s*(\d+)\/(\d+)/)
  if (frac) return [Number(frac[1]) / Number(frac[2]), text.slice(frac[0].length)]
  const m = text.match(new RegExp(`^\\s*(\\d+(?:\\.\\d+)?)?\\s*([${FRACTION_CHARS}])?`))
  if (!m[1] && !m[2]) return null
  return [(m[1] ? Number(m[1]) : 0) + (m[2] ? FRACTIONS[m[2]] : 0), text.slice(m[0].length)]
}

// One "amount unit" phrase → { cups } or { lb }, or null.
function readPhrase(text) {
  const num = leadingNumber(text)
  if (!num) return null
  let [n, rest] = num
  // Ranges like "6–6½ cups": go with the first number.
  rest = rest.replace(new RegExp(`^\\s*[–-]\\s*\\d*\\s*[${FRACTION_CHARS}]?`), '')
  rest = rest.trim()
  const unit = UNITS.find((u) => u.re.test(rest))
  if (!unit) return null
  if (unit.cups) return { cups: n * unit.cups }
  return { lb: n * unit.lb }
}

// How much a recipe's amount is, in cups or pounds. Returns null when it can't
// tell ("to serve over", "for tortillas", a cooked amount with no dry amount).
//   '⅓ cup'                                  → { cups: 0.333 }
//   '2 tbsp, plus ¼ cup for syrup'           → { cups: 0.375 }
//   '3 cups cooked (about 1¼ cups dry)'      → { cups: 1.25 }
//   '1½ cups (makes about 4½ cups cooked)'   → { cups: 1.5 }
export function readAmount(text) {
  if (!text) return null
  const s = String(text).toLowerCase()
  const dry = s.match(/about ([^)]*?) dry/)
  if (dry) return readPhrase(dry[1])
  const main = s.replace(/\(.*?\)/g, '')
  if (/\bcooked\b/.test(main)) return null
  const parts = main.split(/\bplus\b|\band\b/).map(readPhrase)
  if (!parts[0]) return null
  const found = parts.filter(Boolean)
  if (found.every((p) => p.cups != null)) return { cups: found.reduce((a, p) => a + p.cups, 0) }
  if (found.every((p) => p.lb != null)) return { lb: found.reduce((a, p) => a + p.lb, 0) }
  return found[0]
}

// Cups and pounds in one can or pouch of an On Hand item.
export function unitSize(item) {
  const product = item.productId ? products[item.productId] : null
  const cups = Number(item.cupsPerUnit ?? product?.cupsPerUnit) || null
  const lbMatch = String(item.unit || '').match(/~?\s*(\d+(?:\.\d+)?)\s*lb/)
  const lb = lbMatch ? Number(lbMatch[1]) : null
  return { cups, lb }
}

// A recipe amount as a fraction of the item's can or pouch, or null.
export function unitsForAmount(text, item) {
  const amount = readAmount(text)
  if (!amount) return null
  const size = unitSize(item)
  if (amount.cups != null && size.cups) return round3(amount.cups / size.cups)
  if (amount.lb != null && size.lb) return round3(amount.lb / size.lb)
  return null
}

// Cups the way a recipe writes them: "1½ cups", "⅓ cup", "2 tbsp".
const NICE = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, '']]
export function fmtCups(cups) {
  if (!(cups > 0)) return '0 cups'
  if (cups < 0.25) {
    const tbsp = Math.round(cups * 16 * 2) / 2
    if (tbsp >= 1) return `${String(tbsp).replace('.5', '½')} tbsp`
    return `${Math.max(1, Math.round(cups * 48))} tsp`
  }
  let whole = Math.floor(cups)
  const [frac, mark] = NICE.reduce((best, f) => (Math.abs(cups - whole - f[0]) < Math.abs(cups - whole - best[0]) ? f : best))
  if (Math.abs(cups - whole - frac) > 0.04) return `${Math.round(cups * 100) / 100} cups`
  if (frac === 1) whole += 1
  const text = `${whole || ''}${mark}`
  return `${text} ${whole + (frac === 1 ? 0 : frac) > 1 ? 'cups' : 'cup'}`
}

// ---- taking food out ----

// The On Hand rows a line refers to: one row by itemId, or every row of a
// product. Oldest first, so the cans you've had longest get used first.
function rowsFor(inventory, line) {
  const rows = line.itemId
    ? inventory.filter((it) => it.id === line.itemId)
    : inventory.filter((it) => line.productId && it.productId === line.productId)
  return rows
    .filter((it) => Number(it.qty) > 0)
    .sort((a, b) => String(a.added || '').localeCompare(String(b.added || '')))
}

// Takes what was used off the counts and logs it.
//   lines — [{ itemId | productId, qty }] with qty in the item's unit (cans)
//   note  — what it was for: a recipe name, or blank
// Never takes a count below zero; logs only what was actually there.
// Returns { inventory, log, entries } with the new log entries first.
export function recordUse(inventory, log, lines, { date, note = '', at = new Date().toISOString() } = {}) {
  let next = inventory
  const entries = []
  for (const line of lines) {
    let want = Number(line.qty) || 0
    if (want <= 0) continue
    const parts = []
    for (const row of rowsFor(next, line)) {
      if (want <= 0) break
      const take = round3(Math.min(want, Number(row.qty)))
      if (take <= 0) continue
      parts.push({ itemId: row.id, qty: take })
      want = round3(want - take)
      next = next.map((it) => (it.id === row.id ? { ...it, qty: round3(Number(it.qty) - take) } : it))
    }
    if (!parts.length) continue
    const first = inventory.find((it) => it.id === parts[0].itemId)
    const qty = round3(parts.reduce((s, p) => s + p.qty, 0))
    entries.push({
      id: uid(),
      date,
      at,
      productId: first.productId || null,
      name: first.name,
      unit: first.unit,
      category: first.category,
      qty,
      kcal: Math.round(qty * (Number(first.perUnitKcal) || 0)),
      note,
      parts,
    })
  }
  return { inventory: next, log: [...entries, ...log], entries }
}

// Puts a logged use back on the counts and drops it from the log. If the row
// it came from has been deleted since, it comes back as its own row.
export function undoUse(inventory, log, entryId) {
  const entry = log.find((e) => e.id === entryId)
  if (!entry) return { inventory, log }
  let next = inventory
  for (const part of entry.parts || []) {
    if (next.some((it) => it.id === part.itemId)) {
      next = next.map((it) => (it.id === part.itemId ? { ...it, qty: round3(Number(it.qty) + part.qty) } : it))
    } else {
      const product = entry.productId ? products[entry.productId] : null
      next = [...next, {
        id: part.itemId,
        productId: entry.productId || undefined,
        name: entry.name,
        category: entry.category || product?.category || 'staple',
        unit: entry.unit,
        perUnitKcal: entry.qty ? Math.round(entry.kcal / entry.qty) : product?.perUnitKcal || 0,
        qty: part.qty,
        source: 'restored',
      }]
    }
  }
  return { inventory: next, log: log.filter((e) => e.id !== entryId) }
}

// ---- pace and projections ----

const DAY = 86400000
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY)

// How fast stored calories are being used, from the log over the last
// `windowDays` (counting from the first use in that window, so a week of
// logging isn't averaged over a month). null when nothing has been logged.
export function usagePace(log, today, windowDays = 30) {
  const since = new Date(Date.parse(today) - (windowDays - 1) * DAY).toISOString().slice(0, 10)
  const recent = log.filter((e) => e.date >= since && e.date <= today && e.kcal > 0)
  if (!recent.length) return null
  const first = recent.reduce((m, e) => (e.date < m ? e.date : m), today)
  const days = Math.max(1, daysBetween(first, today) + 1)
  const kcal = recent.reduce((s, e) => s + e.kcal, 0)
  return { kcalPerDay: kcal / days, kcal, days, uses: recent.length }
}

// When the stored calories run out at that pace.
export function projectRunOut(totalKcal, pace, today) {
  if (!pace || pace.kcalPerDay <= 0) return null
  const days = totalKcal / pace.kcalPerDay
  const date = new Date(Date.parse(today) + Math.floor(days) * DAY).toISOString().slice(0, 10)
  return { days, date }
}
