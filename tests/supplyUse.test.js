import { describe, it, expect } from 'vitest'
import {
  LOOSE, recordWaterUse, recordFuelUse, undoSupplyUse, waterPace, fuelPace, planDaysUsed,
} from '../src/lib/supplyUse.js'
import { DEFAULT_FUEL } from '../src/data/fuel.js'
import { fuelSummary } from '../src/lib/fuel.js'
import { dailyRate, projectRunOut, usagePace } from '../src/lib/usage.js'

const close = (a, b) => expect(a).toBeCloseTo(b, 3)
const people = [{ waterPerDay: 1 }, { waterPerDay: 1 }]

describe('water', () => {
  const water = { containers: { 'jug-5': 2, 'case-24': 1 }, lastFilled: '' }
  it('takes gallons out of a container type and logs them', () => {
    const r = recordWaterUse({ water, loose: 3 }, [], { sourceId: 'jug-5', units: 0.5, date: '2026-11-01' })
    expect(r.water.containers['jug-5']).toBe(1.5)
    expect(r.loose).toBe(3)
    close(r.entry.gallons, 2.5)
    expect(r.log).toHaveLength(1)
  })
  it('takes loose gallons and never goes below zero', () => {
    const r = recordWaterUse({ water, loose: 3 }, [], { sourceId: LOOSE, units: 10, date: '2026-11-01' })
    expect(r.loose).toBe(0)
    expect(r.entry.gallons).toBe(3)
    expect(recordWaterUse({ water, loose: 0 }, [], { sourceId: LOOSE, units: 1, date: '2026-11-01' })).toBeNull()
  })
  it('undo puts it back', () => {
    const r = recordWaterUse({ water, loose: 3 }, [], { sourceId: 'case-24', units: 1, date: '2026-11-01' })
    expect(r.water.containers['case-24']).toBe(0)
    const u = undoSupplyUse({ water: r.water, loose: r.loose, fuel: DEFAULT_FUEL }, r.log, r.entry.id)
    expect(u.water.containers['case-24']).toBe(1)
    expect(u.log).toHaveLength(0)
  })
  it('works out gallons a day', () => {
    const log = [
      { kind: 'water', date: '2026-11-10', gallons: 4 },
      { kind: 'water', date: '2026-11-06', gallons: 6 },
      { kind: 'fuel', date: '2026-11-06', lb: 50 },
    ]
    const p = waterPace(log, '2026-11-10')
    expect(p.days).toBe(5)
    close(p.perDay, 2)
    expect(projectRunOut(20, p, '2026-11-10')).toEqual({ days: 10, date: '2026-11-20' })
  })
})

describe('fuel', () => {
  const fuel = { ...DEFAULT_FUEL, woodStove: 'rocket', containers: { 'propane-20lb': 2, 'butane-8oz': 4 }, wood: { 'wood-bundle': 3 } }
  it('takes gas off in pounds of propane', () => {
    const r = recordFuelUse(fuel, [], { field: 'containers', sourceId: 'propane-20lb', units: 0.25, date: '2026-11-01' })
    expect(r.fuel.containers['propane-20lb']).toBe(1.75)
    close(r.entry.lb, 5)
    close(r.entry.lbEq, 5)
    const b = recordFuelUse(fuel, [], { field: 'containers', sourceId: 'butane-8oz', units: 1, date: '2026-11-01' })
    expect(b.entry.lbEq).toBeLessThan(0.5)
  })
  it('takes wood off its own counts, and undo puts it back', () => {
    const r = recordFuelUse(fuel, [], { field: 'wood', sourceId: 'wood-bundle', units: 1, date: '2026-11-01' })
    expect(r.fuel.wood['wood-bundle']).toBe(2)
    expect(r.entry.lbEq).toBeUndefined()
    expect(r.entry.lb).toBe(20)
    const u = undoSupplyUse({ water: {}, loose: 0, fuel: r.fuel }, r.log, r.entry.id)
    expect(u.fuel.wood['wood-bundle']).toBe(3)
    expect(u.fuel.containers['propane-20lb']).toBe(2)
  })
  it('does nothing for fuel that is not there', () => {
    expect(recordFuelUse(fuel, [], { field: 'charcoal', sourceId: 'briquettes-8lb', units: 1, date: '2026-11-01' })).toBeNull()
  })
  it('compares the pace with the plan', () => {
    const s = fuelSummary(fuel, people, 14)
    // One planned day of gas a day for 2 days → ratio 1, lasts as planned.
    const log = [
      { kind: 'fuel', fuelKind: 'propane', date: '2026-11-09', lb: s.lbPerDay, lbEq: s.lbPerDay },
      { kind: 'fuel', fuelKind: 'propane', date: '2026-11-10', lb: s.lbPerDay, lbEq: s.lbPerDay },
    ]
    const p = fuelPace(log, '2026-11-10', s)
    close(p.ratio, 1)
    close(p.days, s.daysCovered)
    close(p.byKind.gas, s.lbPerDay)
    // Twice the planned wood → wood counts double.
    close(planDaysUsed({ kind: 'fuel', fuelKind: 'wood', lb: s.wood.lbPerDay * 2 }, s), 2)
    // Charcoal with no cooker counts for nothing.
    expect(planDaysUsed({ kind: 'fuel', fuelKind: 'charcoal', lb: 10 }, s)).toBe(0)
    expect(fuelPace([], '2026-11-10', s)).toBeNull()
  })
})

describe('daily rates', () => {
  it('keeps usagePace the same', () => {
    const log = [{ date: '2026-11-10', kcal: 3000 }, { date: '2026-11-09', kcal: 1000 }]
    const p = usagePace(log, '2026-11-10')
    expect(p.kcalPerDay).toBe(2000)
    expect(p.uses).toBe(2)
    expect(dailyRate(log, '2026-11-10', () => 0)).toBeNull()
  })
})
