// On-hand inventory math: what's already in the pantry, and how many days it
// would feed the household. Pure functions — no React, no DOM.
import { dailyKcalTarget } from './calc.js'
import { tierForAge } from '../data/ageTiers.js'
import { CHURCH_STORE_PRODUCTS } from '../data/churchStore.js'

let seq = 0
function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `inv-${Date.now()}-${seq++}`
}

// Build inventory items from an order. Each item remembers which order it came
// from (source), so the same order can't be imported twice by accident.
export function itemsFromOrder(order, products = CHURCH_STORE_PRODUCTS) {
  const byId = Object.fromEntries(products.map((p) => [p.id, p]))
  return order.items
    .map(({ productId, qty }) => {
      const product = byId[productId]
      if (!product) return null
      return {
        id: uid(),
        productId,
        name: product.name,
        category: product.category,
        unit: product.unit,
        perUnitKcal: product.perUnitKcal,
        qty,
        source: order.id,
        added: order.date,
      }
    })
    .filter(Boolean)
}

export function hasOrder(inventory, orderId) {
  return inventory.some((it) => it.source === orderId)
}

// Appends an order's items unless that order is already in the inventory.
export function importOrder(inventory, order, products) {
  if (hasOrder(inventory, order.id)) return inventory
  return [...inventory, ...itemsFromOrder(order, products)]
}

export function inventoryKcal(inventory) {
  return inventory.reduce((s, it) => s + (it.qty || 0) * (it.perUnitKcal || 0), 0)
}

// The household's usual (non-emergency) daily calories, from each person's age
// tier. Emergency targets live on the person; normal intake comes from the tier.
export function dailyNormalKcal(people) {
  return people.reduce((s, p) => s + tierForAge(p.age).normalKcal, 0)
}

// How long the stored calories last, two ways:
//   emergency — each person on their (editable) emergency ration
//   normal    — each person eating their usual amount
// Days are fractional; the view rounds for display.
export function daysCovered(inventory, people) {
  const kcal = inventoryKcal(inventory)
  const emergencyPerDay = dailyKcalTarget(people)
  const normalPerDay = dailyNormalKcal(people)
  return {
    kcal,
    emergencyPerDay,
    normalPerDay,
    emergencyDays: emergencyPerDay > 0 ? kcal / emergencyPerDay : 0,
    normalDays: normalPerDay > 0 ? kcal / normalPerDay : 0,
  }
}

// How long stored water lasts at the household's drinking/cooking rate plus
// the optional hygiene allowance (both gallons per person per day).
export function waterDaysCovered(gallons, people, hygieneGalPerPersonDay = 0) {
  const perDay =
    people.reduce((s, p) => s + (p.waterPerDay || 0), 0) +
    people.length * (hygieneGalPerPersonDay || 0)
  return perDay > 0 ? (gallons || 0) / perDay : 0
}
