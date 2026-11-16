import { describe, it, expect } from 'vitest'
import {
  cookingMinutes,
  cookingBtuPerDay,
  waterBoilBtuPerDay,
  fuelOnHandBtu,
  fuelSummary,
  stoveFor,
  woodLbPerDay,
  woodOnHandBtu,
  solidLbPerDay,
  solidOnHandBtu,
  BTU_PER_GALLON_BOILED,
} from '../src/lib/fuel.js'
import { DEFAULT_FUEL, PROPANE_BTU_PER_LB, BUTANE_BTU_PER_LB, ISOBUTANE_BTU_PER_LB, WOOD_BTU_PER_LB, CHARCOAL_BTU_PER_LB } from '../src/data/fuel.js'
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

describe('butane', () => {
  it('counts butane and isobutane canisters as fuel on hand', () => {
    const s = fuelSummary({ ...DEFAULT_FUEL, containers: { 'propane-20lb': 1, 'butane-8oz': 4, 'isobutane-230g': 2 } }, household(2), 14)
    expect(s.propane).toMatchObject({ count: 1 })
    expect(s.propane.lb).toBeCloseTo(20, 5)
    expect(s.butane.count).toBe(6)
    // 4 × 0.5 lb butane + 2 × 230 g isobutane, in propane-equivalent pounds
    const butaneLb = (4 * 0.5 * BUTANE_BTU_PER_LB + 2 * (230 / 453.6) * ISOBUTANE_BTU_PER_LB) / PROPANE_BTU_PER_LB
    expect(s.butane.lb).toBeCloseTo(butaneLb, 5)
    expect(s.onHandLb).toBeCloseTo(20 + butaneLb, 5)
  })
  it('says what to buy for the stove you use', () => {
    const fuel = { ...DEFAULT_FUEL, stove: 'butane', stoveBtu: 9000 }
    const s = fuelSummary(fuel, household(2), 14)
    // 90 min × 9,000 BTU × 70% = 9,450 BTU a day; an 8 oz canister holds 0.5 × 21,200
    expect(s.containersPerDay).toBeCloseTo(9450 / (0.5 * BUTANE_BTU_PER_LB), 5)
    expect(s.buyLabel).toBe('8 oz butane canister')
    expect(s.buyCount).toBe(Math.ceil((9450 * 14) / (0.5 * BUTANE_BTU_PER_LB)))
    expect(stoveFor({ stove: 'backpacking' }).buyLabel).toBe('230 g isobutane canister')
    expect(stoveFor({}).id).toBe('propane')
  })
  it('buys 20 lb tanks for a propane stove', () => {
    const s = fuelSummary({ ...DEFAULT_FUEL, containers: { 'propane-20lb': 1 } }, household(2), 100)
    expect(s.buyCount).toBe(s.tanks20ToBuy)
  })
})

describe('wood', () => {
  it('burns several pounds a day, more on less efficient stoves', () => {
    // 90 min on a 10,000 BTU stove at 70% = 10,500 BTU of gas; 40% of that in the pot
    const pot = 10500 * 0.4
    const rocket = woodLbPerDay({ ...DEFAULT_FUEL, woodStove: 'rocket' }, household(2))
    const indoor = woodLbPerDay({ ...DEFAULT_FUEL, woodStove: 'indoor' }, household(2))
    expect(rocket).toBeCloseTo(pot / 0.25 / WOOD_BTU_PER_LB, 5) // ≈ 2.6 lb
    expect(indoor).toBeGreaterThan(rocket)
    expect(woodLbPerDay(DEFAULT_FUEL, household(2))).toBe(0)
  })
  it('does not depend on the gas stove', () => {
    const a = woodLbPerDay({ ...DEFAULT_FUEL, woodStove: 'rocket', stoveBtu: 5000 }, household(2))
    const b = woodLbPerDay({ ...DEFAULT_FUEL, woodStove: 'rocket', stoveBtu: 20000 }, household(2))
    expect(a).toBe(b)
  })
  it('adds wood days to gas days, and offers wood for the days short', () => {
    const fuel = { ...DEFAULT_FUEL, woodStove: 'rocket', containers: { 'propane-20lb': 1 }, wood: { 'wood-bundle': 5 } }
    const s = fuelSummary(fuel, household(2), 100)
    const woodDays = 100 / s.wood.lbPerDay
    expect(s.wood.onHandLb).toBe(100)
    expect(s.wood.days).toBeCloseTo(woodDays, 5)
    expect(s.daysCovered).toBeCloseTo(s.gasDays + woodDays, 5)
    expect(s.shortDays).toBeCloseTo(100 - s.daysCovered, 5)
    expect(s.wood.neededLb).toBeCloseTo(s.shortDays * s.wood.lbPerDay, 5)
    expect(s.shortfallLb).toBeCloseTo(s.shortDays * s.lbPerDay, 5)
  })
  it('ignores wood without a wood stove', () => {
    const s = fuelSummary({ ...DEFAULT_FUEL, wood: { 'wood-cord': 1 } }, household(2), 14)
    expect(s.wood.days).toBe(0)
    expect(s.daysCovered).toBe(s.gasDays)
  })
  it('counts pellets by their higher heat', () => {
    expect(woodOnHandBtu({ 'pellets-40lb': 1 })).toBe(40 * 8000)
  })
})

describe('charcoal', () => {
  it('burns a couple of pounds a day in a Dutch oven', () => {
    // 4,200 BTU into the pot at 20% from 9,000 BTU/lb briquettes
    const lb = solidLbPerDay('charcoal', { ...DEFAULT_FUEL, charcoalStove: 'dutch' }, household(2))
    expect(lb).toBeCloseTo((10500 * 0.4) / 0.2 / CHARCOAL_BTU_PER_LB, 5)
    expect(solidLbPerDay('charcoal', { ...DEFAULT_FUEL, charcoalStove: 'grill' }, household(2))).toBeGreaterThan(lb)
    expect(solidLbPerDay('charcoal', DEFAULT_FUEL, household(2))).toBe(0)
  })
  it('counts lump charcoal by its higher heat', () => {
    expect(solidOnHandBtu('charcoal', { 'briquettes-16lb': 1, 'lump-8lb': 1 })).toBe(16 * 9000 + 8 * 12000)
  })
  it('adds charcoal days to gas and wood days', () => {
    const fuel = {
      ...DEFAULT_FUEL,
      containers: { 'propane-20lb': 1 },
      woodStove: 'rocket', wood: { 'wood-bundle': 2 },
      charcoalStove: 'dutch', charcoal: { 'briquettes-16lb': 2 },
    }
    const s = fuelSummary(fuel, household(2), 100)
    expect(s.charcoal.onHandLb).toBe(32)
    expect(s.charcoal.days).toBeCloseTo(32 / s.charcoal.lbPerDay, 5)
    expect(s.daysCovered).toBeCloseTo(s.gasDays + s.wood.days + s.charcoal.days, 5)
    expect(s.charcoal.neededLb).toBeCloseTo(s.shortDays * s.charcoal.lbPerDay, 5)
  })
  it('ignores charcoal without a cooker for it', () => {
    const s = fuelSummary({ ...DEFAULT_FUEL, charcoal: { 'briquettes-20lb': 3 } }, household(2), 14)
    expect(s.charcoal.days).toBe(0)
    expect(s.daysCovered).toBe(s.gasDays)
  })
})
