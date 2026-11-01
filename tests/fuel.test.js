import { describe, it, expect } from 'vitest'
import {
  cookingMinutes,
  cookingBtuPerDay,
  waterBoilBtuPerDay,
  fuelOnHandBtu,
  fuelSummary,
  BTU_PER_GALLON_BOILED,
} from '../src/lib/fuel.js'
import { DEFAULT_FUEL, PROPANE_BTU_PER_LB } from '../src/data/fuel.js'
import { makePerson } from '../src/data/ageTiers.js'

const household = (n) => Array.from({ length: n }, (_, i) => makePerson({ name: `A${i}`, age: 35 }))

describe('cooking time', () => {
  it("uses the style's minutes for up to four people", () => {
    expect(cookingMinutes({ ...DEFAULT_FUEL, style: 'simmer' }, 3)).toBe(180)
    expect(cookingMinutes({ ...DEFAULT_FUEL, style: 'boil' }, 1)).toBe(45)
  })
  it('scales up past four people, to the nearest 5 minutes', () => {
    expect(cookingMinutes({ ...DEFAULT_FUEL, style: 'pressure' }, 6)).toBe(135)
  })
  it("prefers the user's own minutes", () => {
    expect(cookingMinutes({ ...DEFAULT_FUEL, minutesPerDay: 45 }, 8)).toBe(45)
  })
})

describe('fuel use', () => {
  it('burns stove BTU × hours × flame', () => {
    // 90 min × 10,000 BTU/hr × 70% = 10,500 BTU
    expect(cookingBtuPerDay(DEFAULT_FUEL, 2)).toBe(10500)
  })
  it('boils each gallon the household drinks', () => {
    expect(waterBoilBtuPerDay(household(2))).toBe(2 * BTU_PER_GALLON_BOILED)
  })
  it('adds up fuel on hand across container sizes', () => {
    const btu = fuelOnHandBtu({ 'propane-20lb': 2, 'propane-1lb': 4, 'propane-5lb': 0.5 })
    expect(btu).toBeCloseTo((40 + 4 + 2.5) * PROPANE_BTU_PER_LB, 5)
  })
})

describe('fuelSummary', () => {
  it('works out days covered and tanks to buy', () => {
    const fuel = { ...DEFAULT_FUEL, containers: { 'propane-20lb': 1 } }
    const s = fuelSummary(fuel, household(2), 100, 200)
    const lbPerDay = 10500 / PROPANE_BTU_PER_LB
    expect(s.lbPerDay).toBeCloseTo(lbPerDay, 5)
    expect(s.daysCovered).toBeCloseTo(20 / lbPerDay, 5) // one 20 lb tank ≈ 41 days
    expect(s.neededLb).toBeCloseTo(lbPerDay * 100, 5)
    expect(s.tanks20ToBuy).toBe(Math.ceil((lbPerDay * 100 - 20) / 20))
    expect(s.neededLbForFood).toBeCloseTo(lbPerDay * 200, 5)
  })
  it('needs nothing more when the fuel on hand covers the plan', () => {
    const s = fuelSummary({ ...DEFAULT_FUEL, containers: { 'propane-100lb': 1 } }, household(2), 14)
    expect(s.shortfallLb).toBe(0)
    expect(s.tanks20ToBuy).toBe(0)
  })
  it('adds water boiling when asked', () => {
    const plain = fuelSummary(DEFAULT_FUEL, household(2), 14)
    const boiling = fuelSummary({ ...DEFAULT_FUEL, boilWater: true }, household(2), 14)
    expect(boiling.btuPerDay - plain.btuPerDay).toBe(2 * BTU_PER_GALLON_BOILED)
  })
})
