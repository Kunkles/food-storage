import { describe, it, expect } from 'vitest'
import { readAmount, unitsForAmount, recordUse, undoUse, usagePace, projectRunOut } from '../src/lib/usage.js'

const close = (a, b) => expect(a).toBeCloseTo(b, 3)

describe('reading recipe amounts', () => {
  it('reads cups, spoons, fractions and ranges', () => {
    close(readAmount('⅓ cup').cups, 1 / 3)
    close(readAmount('1½ cups dry').cups, 1.5)
    close(readAmount('1 1/2 cups').cups, 1.5)
    close(readAmount('1/2 cup').cups, 0.5)
    close(readAmount('2 tbsp').cups, 2 / 16)
    close(readAmount('1 tsp').cups, 1 / 48)
    close(readAmount('6–6½ cups').cups, 6)
    close(readAmount('½ cup, broken up').cups, 0.5)
    close(readAmount('2 tbsp, plus ¼ cup for syrup').cups, 0.125 + 0.25)
  })
  it('uses the dry amount, not the cooked one', () => {
    close(readAmount('3 cups cooked (about 1¼ cups dry)').cups, 1.25)
    close(readAmount('1½ cups (makes about 4½ cups cooked)').cups, 1.5)
    expect(readAmount('1 cup cooked')).toBeNull()
  })
  it('reads weights', () => {
    close(readAmount('2 lb').lb, 2)
    close(readAmount('8 oz').lb, 0.5)
    close(readAmount('500g').lb, 1.1023)
  })
  it("gives up on things it can't measure", () => {
    expect(readAmount('to serve over')).toBeNull()
    expect(readAmount('for tortillas (see Skillet flatbread)')).toBeNull()
    expect(readAmount('')).toBeNull()
  })
  it('turns an amount into part of a can', () => {
    const rice = { productId: 'cs-white-rice', unit: '#10 can (~5.7 lb)' }
    close(unitsForAmount('1 cup', rice), 1 / 13)
    close(unitsForAmount('5.7 lb', rice), 1)
    const custom = { unit: 'jar' }
    expect(unitsForAmount('1 cup', custom)).toBeNull()
  })
})

const inv = () => [
  { id: 'a', productId: 'cs-white-rice', name: 'White rice', unit: '#10 can', perUnitKcal: 9300, qty: 2, added: '2026-10-27' },
  { id: 'b', productId: 'cs-white-rice', name: 'White rice', unit: '#10 can', perUnitKcal: 9300, qty: 6, added: '2025-01-01' },
  { id: 'c', name: 'Canned chicken', unit: 'can', perUnitKcal: 300, qty: 4, category: 'staple' },
]

describe('using food', () => {
  it('takes from the oldest cans first and logs it', () => {
    const r = recordUse(inv(), [], [{ productId: 'cs-white-rice', qty: 6.5 }], { date: '2026-11-16', note: 'Rice and beans' })
    expect(r.inventory.find((i) => i.id === 'b').qty).toBe(0)
    expect(r.inventory.find((i) => i.id === 'a').qty).toBe(1.5)
    expect(r.log).toHaveLength(1)
    expect(r.log[0]).toMatchObject({ name: 'White rice', qty: 6.5, kcal: 60450, note: 'Rice and beans', date: '2026-11-16' })
  })
  it("never goes below zero and logs only what was there", () => {
    const r = recordUse(inv(), [], [{ itemId: 'c', qty: 10 }], { date: '2026-11-16' })
    expect(r.inventory.find((i) => i.id === 'c').qty).toBe(0)
    expect(r.log[0].qty).toBe(4)
  })
  it('undo puts it back', () => {
    const used = recordUse(inv(), [], [{ productId: 'cs-white-rice', qty: 6.5 }], { date: '2026-11-16' })
    const back = undoUse(used.inventory, used.log, used.log[0].id)
    expect(back.inventory.find((i) => i.id === 'a').qty).toBe(2)
    expect(back.inventory.find((i) => i.id === 'b').qty).toBe(6)
    expect(back.log).toHaveLength(0)
  })
  it('undo brings back a row that was deleted since', () => {
    const used = recordUse(inv(), [], [{ itemId: 'c', qty: 1 }], { date: '2026-11-16' })
    const gone = used.inventory.filter((i) => i.id !== 'c')
    const back = undoUse(gone, used.log, used.log[0].id)
    expect(back.inventory.find((i) => i.id === 'c')).toMatchObject({ name: 'Canned chicken', qty: 1, perUnitKcal: 300 })
  })
  it("doesn't drift with repeated thirds", () => {
    let r = { inventory: [{ id: 'x', name: 'Oats', qty: 1, perUnitKcal: 4500 }], log: [] }
    for (let i = 0; i < 3; i++) r = recordUse(r.inventory, r.log, [{ itemId: 'x', qty: 0.333 }], { date: '2026-11-16' })
    expect(r.inventory[0].qty).toBe(0.001)
  })
})

describe('pace and projections', () => {
  const log = [
    { date: '2026-11-10', kcal: 4000 },
    { date: '2026-11-13', kcal: 3000 },
    { date: '2026-11-16', kcal: 7000 },
    { date: '2026-09-01', kcal: 99999 }, // outside the 30-day window
  ]
  it('averages from the first use in the window', () => {
    const pace = usagePace(log, '2026-11-16')
    expect(pace.days).toBe(7)
    expect(pace.kcalPerDay).toBe(2000)
    expect(pace.uses).toBe(3)
  })
  it('is null with nothing logged', () => {
    expect(usagePace([], '2026-11-16')).toBeNull()
  })
  it('projects the run-out date', () => {
    expect(projectRunOut(20000, { kcalPerDay: 2000 }, '2026-11-16')).toEqual({ days: 10, date: '2026-11-26' })
    expect(projectRunOut(20000, null, '2026-11-16')).toBeNull()
  })
})

import { fmtCups } from '../src/lib/usage.js'
describe('writing cups', () => {
  it('uses kitchen fractions and spoons', () => {
    expect(fmtCups(1)).toBe('1 cup')
    expect(fmtCups(0.9996)).toBe('1 cup')
    expect(fmtCups(1 / 3)).toBe('⅓ cup')
    expect(fmtCups(1.5)).toBe('1½ cups')
    expect(fmtCups(2)).toBe('2 cups')
    expect(fmtCups(0.125)).toBe('2 tbsp')
    expect(fmtCups(1 / 48)).toBe('1 tsp')
    expect(fmtCups(13)).toBe('13 cups')
  })
})
