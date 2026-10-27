import { describe, it, expect } from 'vitest'
import {
  itemsFromOrder,
  hasOrder,
  importOrder,
  inventoryKcal,
  dailyNormalKcal,
  daysCovered,
  waterDaysCovered,
} from '../src/lib/inventory.js'
import { CHURCH_STORE_PRODUCTS, CHURCH_STORE_ORDERS } from '../src/data/churchStore.js'
import { makePerson } from '../src/data/ageTiers.js'

const products = [
  { id: 'rice', name: 'White rice', category: 'staple', unit: '#10 can', perUnitKcal: 9000 },
  { id: 'absorber', name: 'Oxygen absorbers', category: 'supply', unit: 'pack', perUnitKcal: 0 },
]
const order = {
  id: 'order-1',
  date: '2026-10-27',
  items: [
    { productId: 'rice', qty: 6 },
    { productId: 'absorber', qty: 2 },
    { productId: 'missing', qty: 1 },
  ],
}

describe('importing an order', () => {
  it('builds one item per known product, tagged with the order', () => {
    const items = itemsFromOrder(order, products)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ name: 'White rice', qty: 6, perUnitKcal: 9000, source: 'order-1' })
  })
  it('adds the order once and ignores a second import', () => {
    const once = importOrder([], order, products)
    expect(hasOrder(once, 'order-1')).toBe(true)
    expect(importOrder(once, order, products)).toBe(once)
  })
})

describe('days covered', () => {
  const adult = makePerson({ name: 'A', age: 35 }) // 1200 emergency, 2200 normal
  const child = makePerson({ name: 'C', age: 6 }) // 800 emergency, 1300 normal
  const inv = itemsFromOrder(order, products) // 54,000 kcal; absorbers add nothing

  it('totals calories, skipping zero-calorie supplies', () => {
    expect(inventoryKcal(inv)).toBe(54000)
  })
  it('uses each age tier for normal intake', () => {
    expect(dailyNormalKcal([adult, child])).toBe(3500)
  })
  it('divides stored calories by the household daily need', () => {
    const c = daysCovered(inv, [adult, child])
    expect(c.emergencyDays).toBeCloseTo(54000 / 2000, 5)
    expect(c.normalDays).toBeCloseTo(54000 / 3500, 5)
  })
  it('returns 0 days with nobody in the household', () => {
    expect(daysCovered(inv, []).emergencyDays).toBe(0)
  })
  it('counts water days with the hygiene allowance', () => {
    // adult 1.0 + child 0.5 drinking, plus 2 people × 1 hygiene = 3.5 gal/day
    expect(waterDaysCovered(35, [adult, child], 1)).toBeCloseTo(10, 5)
    expect(waterDaysCovered(35, [], 1)).toBe(0)
  })
})

describe('Church store data', () => {
  it('every order line points at a known product', () => {
    const ids = new Set(CHURCH_STORE_PRODUCTS.map((p) => p.id))
    for (const o of CHURCH_STORE_ORDERS) {
      for (const line of o.items) expect(ids.has(line.productId)).toBe(true)
    }
  })
  it('the Oct 27 order has 17 food cases plus 36 milk pouches', () => {
    const items = itemsFromOrder(CHURCH_STORE_ORDERS[0])
    const cans = items.filter((it) => it.unit.startsWith('#10 can')).reduce((s, it) => s + it.qty, 0)
    const pouches = items.find((it) => it.name === 'Nonfat dry milk').qty
    expect(cans).toBe(17 * 6)
    expect(pouches).toBe(36)
  })
})
