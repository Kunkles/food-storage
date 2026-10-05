import { describe, it, expect } from 'vitest'
import {
  computeQty,
  planItemFromLibrary,
  defaultPlan,
  itemKcal,
  itemCost,
  itemCostPer100k,
  dailyKcalTarget,
  totalWater,
  planTotals,
  kcalTarget,
  calorieStatus,
  scalePlanToTarget,
  sortByCostPerKcal,
} from '../src/lib/calc.js'
import { makePerson, tierForAge, AGE_TIERS } from '../src/data/ageTiers.js'

describe('age tiers', () => {
  it('maps ages to the right tier', () => {
    expect(tierForAge(0).id).toBe('infant')
    expect(tierForAge(2).id).toBe('toddler')
    expect(tierForAge(6).id).toBe('child')
    expect(tierForAge(11).id).toBe('preteen')
    expect(tierForAge(16).id).toBe('teen')
    expect(tierForAge(35).id).toBe('adult')
    expect(tierForAge(80).id).toBe('senior')
  })

  it('assigns tier-based defaults to a person', () => {
    const p = makePerson({ name: 'Baby', age: 0 })
    expect(p.tier).toBe('infant')
    expect(p.emergencyKcal).toBe(AGE_TIERS.find((t) => t.id === 'infant').emergencyKcal)
  })
})

describe('computeQty', () => {
  it('returns 0 for a zero rate', () => {
    expect(computeQty(2, 14, 0)).toBe(0)
  })
  it('scales by head count and days, rounding to whole units', () => {
    expect(computeQty(2, 14, 0.5)).toBe(14) // 2*14*0.5 = 14
  })
  it('never returns below 1 when rate > 0', () => {
    expect(computeQty(1, 3, 0.02)).toBe(1) // raw 0.06 -> 0 -> clamp to 1
  })
})

describe('per-item math', () => {
  const item = { qty: 10, perUnitKcal: 200, price: 1.5 }
  it('computes kcal and cost', () => {
    expect(itemKcal(item)).toBe(2000)
    expect(itemCost(item)).toBe(15)
  })
  it('computes cost per 100k kcal', () => {
    // $15 buys 2,000 kcal  ->  (100,000/2,000) * $15 = $750 per 100k kcal
    expect(itemCostPer100k(item)).toBeCloseTo(750, 5)
  })
  it('returns Infinity for zero-kcal items', () => {
    expect(itemCostPer100k({ qty: 5, perUnitKcal: 0, price: 2 })).toBe(Infinity)
  })
})

describe('household aggregates', () => {
  const people = [
    makePerson({ name: 'A', age: 30 }), // adult 1200
    makePerson({ name: 'K', age: 6 }), // child 800
  ]
  it('sums age-weighted daily kcal target', () => {
    expect(dailyKcalTarget(people)).toBe(2000)
  })
  it('sums water (drinking + hygiene)', () => {
    // 1.0 + 0.5 = 1.5 gal/day * 14 = 21; hygiene 1.0 * 2 * 14 = 28 -> 49
    expect(totalWater(people, 14, 1.0)).toBeCloseTo(49, 5)
  })
  it('computes total kcal target over the period', () => {
    expect(kcalTarget(people, 14)).toBe(28000)
  })
})

describe('defaultPlan', () => {
  it('produces the starter items with sensible quantities', () => {
    const people = [makePerson({ age: 30 }), makePerson({ age: 30 })]
    const plan = defaultPlan(people, 14)
    expect(plan.length).toBeGreaterThan(0)
    const byId = Object.fromEntries(plan.map((p) => [p.foodId, p]))
    // 2 people * 14 days * 1.0/bar
    expect(byId['protein-bar'].qty).toBe(28)
  })
})

describe('calorieStatus', () => {
  it('is ok at or above target', () => {
    expect(calorieStatus(1000, 1000).status).toBe('ok')
    expect(calorieStatus(1500, 1000).status).toBe('ok')
  })
  it('warns in the 0.7-1.0 band', () => {
    expect(calorieStatus(900, 1000).status).toBe('warn')
    expect(calorieStatus(700, 1000).status).toBe('warn')
  })
  it('flags danger below 0.7', () => {
    expect(calorieStatus(600, 1000).status).toBe('danger')
  })
  it('handles a zero target gracefully', () => {
    expect(calorieStatus(500, 0).status).toBe('ok')
  })
})

describe('scalePlanToTarget', () => {
  it('pulls an over-provisioned plan down toward the target', () => {
    const people = [makePerson({ age: 30 })] // 1200/day * 14 = 16800
    const plan = [
      { id: 'a', foodId: 'a', name: 'X', category: 'noCook', unit: 'can', perUnitKcal: 1000, price: 2, qty: 30 }, // 30,000 kcal
    ]
    const scaled = scalePlanToTarget(plan, people, 14)
    // 16800/30000 = 0.56 -> qty round(30*0.56)=17 -> 17,000 kcal (~ ok)
    const { kcal } = planTotals(scaled)
    expect(kcal).toBeLessThan(30000)
    expect(kcal).toBeGreaterThanOrEqual(16800 * 0.7)
  })
  it('leaves zero-kcal items untouched', () => {
    const people = [makePerson({ age: 30 })]
    const plan = [
      { id: 's', foodId: 's', name: 'Salt', category: 'staple', unit: 'lb', perUnitKcal: 0, price: 2, qty: 7 },
    ]
    const scaled = scalePlanToTarget(plan, people, 14)
    expect(scaled[0].qty).toBe(7)
  })
})

describe('sortByCostPerKcal', () => {
  it('puts cheapest-kcal first and zero-kcal last', () => {
    const cheap = { qty: 10, perUnitKcal: 1000, price: 5 } // 0.5 per 100k
    const pricey = { qty: 10, perUnitKcal: 1000, price: 20 } // 2.0 per 100k
    const salt = { qty: 5, perUnitKcal: 0, price: 2 } // Infinity
    const sorted = sortByCostPerKcal([pricey, salt, cheap])
    expect(sorted[0].price).toBe(5)
    expect(sorted[2].price).toBe(2) // salt
  })
})

describe('planItemFromLibrary', () => {
  it('applies overrides on top of library values', () => {
    const food = { id: 'rice', name: 'Rice', category: 'staple', unit: '1 lb bag', perUnitKcal: 3340, price: 1.4, rate: 0.1, elNinoExposed: true }
    const item = planItemFromLibrary(food, 2, 14, { qty: 99, price: 9.99 })
    expect(item.qty).toBe(99)
    expect(item.price).toBe(9.99)
    expect(item.perUnitKcal).toBe(3340)
    expect(item.elNinoExposed).toBe(true)
  })
})
