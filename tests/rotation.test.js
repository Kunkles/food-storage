import { describe, it, expect } from 'vitest'
import {
  monthsBetween,
  addMonths,
  todayIso,
  rotationMonths,
  rotationStatus,
  rotationCalendar,
  defaultRotationMonths,
} from '../src/lib/rotation.js'

const rice = { id: 'rice', name: 'Rice', category: 'staple', unit: '1 lb bag', perUnitKcal: 3340, price: 1.4, elNinoExposed: true }
const soup = { id: 'soup', name: 'Canned soup', category: 'noCook', unit: '10.75 oz can', perUnitKcal: 190, price: 2.5, elNinoExposed: false }
const oats = { id: 'oats', name: 'Rolled oats', category: 'staple', unit: '1 lb bag', perUnitKcal: 3760, price: 3.0, elNinoExposed: true }

describe('date math', () => {
  it('computes whole months between two dates', () => {
    expect(monthsBetween('2026-01-15', '2026-04-15')).toBe(3)
    expect(monthsBetween('2026-11-15', '2027-02-15')).toBe(3)
    expect(monthsBetween('2026-06-01', '2026-06-01')).toBe(0)
  })
  it('adds months, rolling across the year', () => {
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-01')
    expect(addMonths('2026-06-10', 8)).toBe('2027-02-01')
    expect(addMonths('2026-06-10', -8)).toBe('2025-10-01')
  })
  it('returns today as an ISO calendar date', () => {
    expect(/^\d{4}-\d{2}-\d{2}$/.test(todayIso())).toBe(true)
  })
})

describe('default cadence', () => {
  it('rotates staples slower than no-cook goods', () => {
    expect(defaultRotationMonths(rice)).toBe(6)
    expect(defaultRotationMonths(soup)).toBe(3)
    expect(defaultRotationMonths(null)).toBe(3)
  })
  it('rotationMonths honors an explicit override (including 0 = off)', () => {
    expect(rotationMonths(rice, { rotationMonths: 2 })).toBe(2)
    expect(rotationMonths(rice, { rotationMonths: 0 })).toBe(0)
    expect(rotationMonths(rice, undefined)).toBe(6)
  })
})

describe('rotationStatus', () => {
  it('is baseline when never rotated', () => {
    expect(rotationStatus(rice, {}, '2026-10-05').status).toBe('baseline')
  })
  it('is overdue once a full cycle or more has passed', () => {
    // staple: 6-month cadence; last rotated 8 months ago
    expect(rotationStatus(rice, { lastRotation: '2026-02-01' }, '2026-10-05').status).toBe('overdue')
  })
  it('is due-soon within a month of the cycle', () => {
    // 6-month cadence; last rotated 5 months ago
    expect(rotationStatus(rice, { lastRotation: '2026-05-01' }, '2026-10-05').status).toBe('due-soon')
  })
  it('is ok early in the cycle', () => {
    // 6-month cadence; last rotated 2 months ago
    expect(rotationStatus(rice, { lastRotation: '2026-08-01' }, '2026-10-05').status).toBe('ok')
  })
  it('honors a stored cadence override', () => {
    // 2-month cadence; last rotated 3 months ago -> overdue despite being no-cook
    expect(rotationStatus(soup, { lastRotation: '2026-07-01', rotationMonths: 2 }, '2026-10-05').status).toBe('overdue')
  })
})

describe('rotationCalendar', () => {
  it('lists, classifies, and sorts foods by urgency', () => {
    const stock = {
      rice: { lastRotation: '2026-02-01' }, // 8 months > 6 -> overdue
      soup: { lastRotation: '2026-08-01' }, // 2 months < 3 -> ok
      oats: {}, // no entry -> baseline
    }
    const cal = rotationCalendar('2026-10-05', [rice, soup, oats], stock)
    const ids = cal.map((c) => c.foodId)
    // baseline (rank 0), then overdue (1), then ok (3)
    expect(ids).toEqual(['oats', 'rice', 'soup'])
  })
  it('drops foods whose cadence is set to 0', () => {
    const cal = rotationCalendar('2026-10-05', [rice], { rice: { rotationMonths: 0 } })
    expect(cal).toHaveLength(0)
  })
  it('passes through the exposed flag', () => {
    const cal = rotationCalendar('2026-10-05', [rice, soup], {})
    const byId = Object.fromEntries(cal.map((c) => [c.foodId, c]))
    expect(byId.rice.exposed).toBe(true)
    expect(byId.soup.exposed).toBe(false)
  })
})
