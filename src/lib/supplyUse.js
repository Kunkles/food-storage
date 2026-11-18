// Using stored water and cooking fuel: taking it off the counts on the Water
// and Fuel tabs, keeping a log you can undo, and how fast it's going. Pure
// functions — no React, no DOM. Food has its own log (usage.js); water and
// fuel share this one, told apart by `kind`.
import { WATER_CONTAINERS } from '../data/water.js'
import { FUEL_CONTAINERS, PROPANE_BTU_PER_LB, SOLID_FUELS } from '../data/fuel.js'
import { dailyRate } from './usage.js'

export const LOG_LIMIT = 1000

let seq = 0
const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `supply-${Date.now()}-${seq++}`)
const round4 = (n) => Math.round(n * 10000) / 10000

// ---- water ----

// Where water can come from: each container type, plus loose gallons.
export const LOOSE = 'loose'
export function waterSource(sourceId) {
  if (sourceId === LOOSE) return { id: LOOSE, name: 'Other water', gallons: 1 }
  return WATER_CONTAINERS.find((t) => t.id === sourceId) || null
}

// Takes `units` of one container type (or loose gallons) off the counts.
// Never goes below zero; logs only what was there. Returns
// { water, loose, log, entry }, or null when there was nothing to take.
export function recordWaterUse({ water, loose = 0 }, log, { sourceId, units, date, note = '', at = new Date().toISOString() }) {
  const type = waterSource(sourceId)
  if (!type) return null
  const have = sourceId === LOOSE ? Number(loose) || 0 : Number(water.containers?.[sourceId]) || 0
  const take = round4(Math.min(Number(units) || 0, have))
  if (!(take > 0)) return null
  const left = round4(have - take)
  const entry = {
    id: uid(), kind: 'water', date, at, sourceId, name: type.name,
    units: take, gallons: round4(take * type.gallons), note,
  }
  return {
    water: sourceId === LOOSE ? water : { ...water, containers: { ...water.containers, [sourceId]: left } },
    loose: sourceId === LOOSE ? left : loose,
    log: [entry, ...log].slice(0, LOG_LIMIT),
    entry,
  }
}

// ---- fuel ----

// Every kind of fuel container or amount, with where its count is saved:
// { field, type, fuelKind } — field is 'containers' for gas, or the wood /
// charcoal / kerosene field.
export const FUEL_SOURCES = [
  ...FUEL_CONTAINERS.map((type) => ({ field: 'containers', type, fuelKind: type.fuel })),
  ...SOLID_FUELS.flatMap((def) => def.amounts.map((type) => ({ field: def.field, type, fuelKind: def.kind }))),
]
export const fuelSource = (field, sourceId) =>
  FUEL_SOURCES.find((s) => s.field === field && s.type.id === sourceId) || null
export const isGas = (fuelKind) => fuelKind === 'propane' || fuelKind === 'butane'

// Takes `units` of one container or amount off the Fuel tab's counts.
// Returns { fuel, log, entry }, or null when there was nothing to take.
//   lb   — pounds of that fuel used
//   lbEq — for gas, the same as pounds of propane (what the Fuel tab counts in)
export function recordFuelUse(fuel, log, { field, sourceId, units, date, note = '', at = new Date().toISOString() }) {
  const src = fuelSource(field, sourceId)
  if (!src) return null
  const have = Number(fuel[field]?.[sourceId]) || 0
  const take = round4(Math.min(Number(units) || 0, have))
  if (!(take > 0)) return null
  const lb = take * src.type.lb
  const entry = {
    id: uid(), kind: 'fuel', date, at, field, sourceId, fuelKind: src.fuelKind, name: src.type.name,
    units: take, lb: round4(lb), note,
    ...(isGas(src.fuelKind) ? { lbEq: round4((lb * src.type.btuPerLb) / PROPANE_BTU_PER_LB) } : {}),
  }
  return {
    fuel: { ...fuel, [field]: { ...fuel[field], [sourceId]: round4(have - take) } },
    log: [entry, ...log].slice(0, LOG_LIMIT),
    entry,
  }
}

// ---- undo ----

// Puts a logged use back on the counts and drops it from the log.
//   state — { water, loose, fuel }; returns the same with `log`.
export function undoSupplyUse(state, log, entryId) {
  const entry = log.find((e) => e.id === entryId)
  const next = { ...state, log: log.filter((e) => e.id !== entryId) }
  if (!entry) return { ...state, log }
  const add = (counts, id) => ({ ...counts, [id]: round4((Number(counts?.[id]) || 0) + entry.units) })
  if (entry.kind === 'water') {
    if (entry.sourceId === LOOSE) next.loose = round4((Number(state.loose) || 0) + entry.units)
    else next.water = { ...state.water, containers: add(state.water.containers, entry.sourceId) }
  } else if (entry.kind === 'fuel') {
    next.fuel = { ...state.fuel, [entry.field]: add(state.fuel[entry.field], entry.sourceId) }
  }
  return next
}

// ---- pace ----

// Gallons a day over the last 30 days, or null.
export function waterPace(log, today, windowDays = 30) {
  return dailyRate(log.filter((e) => e.kind === 'water'), today, (e) => e.gallons, windowDays)
}

// How much of the Fuel tab's planned days each use stands for: gas pounds over
// the planned gas pounds a day, wood pounds over the planned wood pounds a
// day, and so on. A fuel with no cooker picked counts for nothing.
//   s — fuelSummary()
export function planDaysUsed(entry, s) {
  if (entry.kind !== 'fuel') return 0
  if (isGas(entry.fuelKind)) return s.lbPerDay > 0 ? (entry.lbEq || 0) / s.lbPerDay : 0
  const perDay = s[entry.fuelKind]?.lbPerDay
  return perDay > 0 ? (entry.lb || 0) / perDay : 0
}

// How fast fuel is going compared with the plan, and what that means for how
// long the rest lasts. null until something's been logged.
//   ratio     — planned days of fuel burned per calendar day (1 = as planned)
//   days      — how long what's on hand lasts at that pace
//   byKind    — { gas | wood | charcoal | kerosene: lb a day actually used }
export function fuelPace(log, today, s, windowDays = 30) {
  const fuelLog = log.filter((e) => e.kind === 'fuel')
  const rate = dailyRate(fuelLog, today, (e) => planDaysUsed(e, s), windowDays)
  const byKind = {}
  for (const kind of ['gas', ...SOLID_FUELS.map((d) => d.kind)]) {
    const r = dailyRate(
      fuelLog.filter((e) => (kind === 'gas' ? isGas(e.fuelKind) : e.fuelKind === kind)),
      today, (e) => (kind === 'gas' ? e.lbEq : e.lb), windowDays,
    )
    if (r) byKind[kind] = r.perDay
  }
  if (!rate) return Object.keys(byKind).length ? { ratio: null, days: null, byKind, uses: fuelLog.length } : null
  return { ratio: rate.perDay, days: s.daysCovered / rate.perDay, byKind, logDays: rate.days, uses: rate.uses }
}
