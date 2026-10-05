// Pure planning math. No React, no DOM — fully unit-testable.
import { FOOD_DATABASE, DEFAULT_PLAN_FOOD_IDS } from '../data/foodDatabase.js'

// Quantity model: how many of a unit a household needs.
//   qty = head count × days × rate (units per person per day)
// Rounding: at least 1 unit (you can't buy 0 of something), whole units.
// This deliberately rounds UP — a safety margin. "Scale to Target" (below)
// lets a user pull the total back to the exact calorie need.
export function computeQty(headCount, days, rate) {
  if (rate <= 0) return 0
  const raw = headCount * days * rate
  return Math.max(1, Math.round(raw))
}

// Build a plan item object from a library entry + household size + days.
export function planItemFromLibrary(food, headCount, days, overrides = {}) {
  return {
    id: `plan-${food.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    foodId: food.id,
    name: food.name,
    category: food.category,
    unit: food.unit,
    perUnitKcal: food.perUnitKcal,
    price: food.price,
    elNinoExposed: food.elNinoExposed,
    qty: computeQty(headCount, days, food.rate),
    ...overrides,
  }
}

// The default starter plan for a given household.
export function defaultPlan(people, days) {
  const headCount = people.length || 1
  const foodById = Object.fromEntries(FOOD_DATABASE.map((f) => [f.id, f]))
  return DEFAULT_PLAN_FOOD_IDS.map((id) => {
    const food = foodById[id]
    if (!food) return null
    return planItemFromLibrary(food, headCount, days)
  }).filter(Boolean)
}

// ---- Per-item math ----
export function itemKcal(item) {
  return item.qty * item.perUnitKcal
}
export function itemCost(item) {
  return item.qty * item.price
}
// Cost per 100,000 kcal — the "cheap calories" ranking signal.
// Infinity when the item has no calories (salt, coffee) so it sorts last.
export function itemCostPer100k(item) {
  const k = itemKcal(item)
  return k > 0 ? itemCost(item) / (k / 100000) : Infinity
}

// ---- Household aggregates ----
// Sum of each person's emergency kcal target (age-aware).
export function dailyKcalTarget(people) {
  return people.reduce((s, p) => s + (p.emergencyKcal || 0), 0)
}
// Total gallons over the whole period: drinking/cooking + optional hygiene.
export function totalWater(people, days, hygieneGalPerPersonDay = 0) {
  const drink = people.reduce((s, p) => s + (p.waterPerDay || 0), 0) * days
  const hygiene = people.length * (hygieneGalPerPersonDay || 0) * days
  return drink + hygiene
}

// Whole-plan totals.
export function planTotals(plan) {
  return plan.reduce(
    (acc, it) => {
      acc.kcal += itemKcal(it)
      acc.cost += itemCost(it)
      return acc
    },
    { kcal: 0, cost: 0 }
  )
}

// Total kcal the plan must supply = daily target × days.
export function kcalTarget(people, days) {
  return dailyKcalTarget(people) * days
}

// How well the plan covers the target. Returns a ratio and a status:
//   'ok'      >= 1.0  (meets/exceeds target)
//   'warn'    0.7 – 1.0 (a bit short — a thin margin)
//   'danger'  < 0.7   (meaningfully under-provisioned)
export function calorieStatus(planKcal, targetKcal) {
  if (targetKcal <= 0) return { ratio: null, status: 'ok' }
  const ratio = planKcal / targetKcal
  const status = ratio >= 1 ? 'ok' : ratio >= 0.7 ? 'warn' : 'danger'
  return { ratio, status }
}

// Rescale every plan item's quantity so the plan hits the calorie target.
// Items with no calories (salt, coffee) are left at their current quantity.
// Approximate: rounds to whole units (min 1 for caloric items).
export function scalePlanToTarget(plan, people, days) {
  const target = kcalTarget(people, days)
  const { kcal } = planTotals(plan)
  if (kcal <= 0 || target <= 0) return plan
  const ratio = target / kcal
  return plan.map((it) => {
    if ((it.perUnitKcal || 0) <= 0) return it
    return { ...it, qty: Math.max(1, Math.round(it.qty * ratio)) }
  })
}

// One-stop summary used by the views: everything a dashboard row needs.
// Pass the full state-ish pieces; returns numbers ready for display.
export function planSummary(people, days, plan, hygieneGalPerPersonDay = 0) {
  const headCount = people.length
  const target = kcalTarget(people, days)
  const { kcal, cost } = planTotals(plan)
  const { ratio, status } = calorieStatus(kcal, target)
  const water = totalWater(people, days, hygieneGalPerPersonDay)
  const personDays = headCount * days
  return {
    headCount,
    target,
    kcal,
    cost,
    ratio,
    status,
    water,
    costPerPersonDay: personDays > 0 ? cost / personDays : 0,
    kcalPerDollar: cost > 0 ? kcal / cost : 0,
  }
}

// Sort a copy by cost per 100k kcal, cheapest first (Infinity sinks to bottom).
export function sortByCostPerKcal(plan) {
  return [...plan].sort((a, b) => {
    const ca = itemCostPer100k(a)
    const cb = itemCostPer100k(b)
    if (ca === Infinity && cb === Infinity) return 0
    if (ca === Infinity) return 1
    if (cb === Infinity) return -1
    return ca - cb
  })
}
