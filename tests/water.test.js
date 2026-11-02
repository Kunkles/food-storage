import { describe, it, expect } from 'vitest'
import {
  bleachFor,
  containerGallons,
  hasRefillable,
  nextRefill,
  waterSummary,
} from '../src/lib/water.js'
import { DEFAULT_WATER } from '../src/data/water.js'
import { makePerson } from '../src/data/ageTiers.js'

const household = (n) => Array.from({ length: n }, (_, i) => makePerson({ name: `A${i}`, age: 35 }))

describe('water on hand', () => {
  it('adds up the containers', () => {
    // 2 × 5 gal + 1 × 55 gal barrel + 2 cases of 24 bottles (3.17 gal each)
    const gal = containerGallons({ 'jug-5': 2, 'barrel-55': 1, 'case-24': 2 })
    expect(gal).toBeCloseTo(10 + 55 + 6.3375, 4)
  })
  it('ignores containers it does not know', () => {
    expect(containerGallons({ bogus: 3 })).toBe(0)
  })
  it('knows when there are refillable containers', () => {
    expect(hasRefillable({ 'case-24': 4 })).toBe(false)
    expect(hasRefillable({ 'jug-5': 1 })).toBe(true)
  })
})

describe('refill reminder', () => {
  it('is six months after the fill date', () => {
    const d = nextRefill('2026-05-15')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(10) // November
    expect(d.getDate()).toBe(15)
  })
  it('is null without a date', () => {
    expect(nextRefill('')).toBeNull()
  })
})

describe('bleach', () => {
  it('uses 8 drops a gallon for 6% and 6 for 8.25%', () => {
    expect(bleachFor(1, '6').drops).toBe(8)
    expect(bleachFor(1, '8.25').drops).toBe(6)
  })
  it('matches the EPA table in teaspoons', () => {
    expect(bleachFor(8, '6').tsp).toBeCloseTo(0.625) // EPA: 2/3 tsp
    expect(bleachFor(8, '8.25').tsp).toBe(0.5)
  })
})

describe('water summary', () => {
  it('covers drinking plus washing, and what to buy', () => {
    const s = waterSummary({
      water: { ...DEFAULT_WATER, containers: { 'jug-5': 2 } },
      looseGallons: 2,
      people: household(2),
      hygieneWater: 1,
      days: 14,
    })
    expect(s.perDay).toBe(4) // 2 × 1 gal drinking + 2 × 1 gal washing
    expect(s.onHand).toBe(12)
    expect(s.daysCovered).toBe(3)
    expect(s.needed).toBe(56)
    expect(s.shortfall).toBe(44)
    expect(s.jugs5ToBuy).toBe(9)
    expect(s.casesToBuy).toBe(14) // 44 / 3.17
  })
  it('needs nothing more when covered', () => {
    const s = waterSummary({
      water: { ...DEFAULT_WATER, containers: { 'barrel-55': 2 } },
      people: household(2),
      days: 14,
    })
    expect(s.shortfall).toBe(0)
    expect(s.casesToBuy).toBe(0)
    expect(s.jugs5ToBuy).toBe(0)
  })
})
