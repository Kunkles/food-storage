import { describe, it, expect } from 'vitest'
import {
  sortedPrices,
  latestPrice,
  priceTrendPct,
  buyAheadSignal,
  costPer100kTrend,
  addPriceEntry,
  addJournalEntry,
  markRotated,
} from '../src/lib/inflation.js'

describe('price history helpers', () => {
  it('returns the most recent price chronologically', () => {
    const prices = [
      { date: '2026-08-01', price: 1.4 },
      { date: '2026-09-01', price: 1.6 },
      { date: '2026-10-01', price: 1.5 },
    ]
    expect(latestPrice(prices)).toBe(1.5)
    expect(latestPrice([])).toBe(null)
  })
  it('sorts prices oldest to newest without mutating the input', () => {
    const input = [{ date: '2026-09-01', price: 2 }, { date: '2026-01-01', price: 1 }]
    const s = sortedPrices(input)
    expect(s.map((p) => p.date)).toEqual(['2026-01-01', '2026-09-01'])
    expect(input[0].date).toBe('2026-09-01') // original order preserved
  })
})

describe('priceTrendPct', () => {
  it('is null with a single entry', () => {
    expect(priceTrendPct([{ date: '2026-10-01', price: 1.5 }])).toBe(null)
  })
  it('is null with no entries', () => {
    expect(priceTrendPct([])).toBe(null)
  })
  it('compares the latest price to the previous average', () => {
    // previous avg = (1.4 + 1.6) / 2 = 1.5; latest = 1.5 -> 0%
    const prices = [
      { date: '2026-08-01', price: 1.4 },
      { date: '2026-09-01', price: 1.6 },
      { date: '2026-10-01', price: 1.5 },
    ]
    expect(priceTrendPct(prices, 2)).toBeCloseTo(0, 5)
  })
  it('reports a negative (cheaper) trend on a dip', () => {
    const prices = [
      { date: '2026-08-01', price: 2.0 },
      { date: '2026-09-01', price: 2.0 },
      { date: '2026-10-01', price: 1.5 }, // 25% below the 2.0 average
    ]
    expect(priceTrendPct(prices, 2)).toBeCloseTo(-25, 5)
  })
  it('reports a positive (pricier) trend on a spike', () => {
    const prices = [
      { date: '2026-08-01', price: 2.0 },
      { date: '2026-09-01', price: 2.0 },
      { date: '2026-10-01', price: 2.6 }, // 30% above the 2.0 average
    ]
    expect(priceTrendPct(prices, 2)).toBeCloseTo(30, 5)
  })
})

describe('buyAheadSignal', () => {
  it('says buy on a meaningful dip', () => {
    const prices = [
      { date: '2026-08-01', price: 2.0 },
      { date: '2026-09-01', price: 2.0 },
      { date: '2026-10-01', price: 1.5 },
    ]
    expect(buyAheadSignal(prices, 10)).toBe('buy')
  })
  it('says wait on a meaningful spike', () => {
    const prices = [
      { date: '2026-08-01', price: 2.0 },
      { date: '2026-09-01', price: 2.0 },
      { date: '2026-10-01', price: 2.6 },
    ]
    expect(buyAheadSignal(prices, 10)).toBe('wait')
  })
  it('says normal when near the recent average', () => {
    const prices = [
      { date: '2026-08-01', price: 2.0 },
      { date: '2026-09-01', price: 2.0 },
      { date: '2026-10-01', price: 2.05 }, // ~2.5% — inside the 10% band
    ]
    expect(buyAheadSignal(prices, 10)).toBe('normal')
  })
  it('says no-data without enough history', () => {
    expect(buyAheadSignal([], 10)).toBe('no-data')
    expect(buyAheadSignal([{ date: '2026-10-01', price: 2 }], 10)).toBe('no-data')
  })
  it('respects a custom threshold', () => {
    const prices = [
      { date: '2026-08-01', price: 2.0 },
      { date: '2026-09-01', price: 2.0 },
      { date: '2026-10-01', price: 1.9 }, // -5% -> buy only if threshold <= 5
    ]
    expect(buyAheadSignal(prices, 5)).toBe('buy')
    expect(buyAheadSignal(prices, 10)).toBe('normal')
  })
})

describe('costPer100kTrend', () => {
  it('maps each price to its cost per 100k kcal, oldest first', () => {
    const prices = [
      { date: '2026-10-01', price: 1.4 },
      { date: '2026-09-01', price: 2.8 },
    ]
    const trend = costPer100kTrend(prices, 1000) // perUnitKcal 1000 -> value = price * 100
    expect(trend[0].date).toBe('2026-09-01')
    expect(trend[0].value).toBeCloseTo(280, 5)
    expect(trend[1].value).toBeCloseTo(140, 5)
  })
  it('returns empty for zero-kcal foods', () => {
    expect(costPer100kTrend([{ date: '2026-10-01', price: 2 }], 0)).toEqual([])
  })
})

describe('journal mutations (pure)', () => {
  it('adds a purchase, replacing a same-date entry', () => {
    let stock = {}
    stock = addJournalEntry('rice', stock, { date: '2026-10-01', price: 1.4, qty: 5 })
    stock = addJournalEntry('rice', stock, { date: '2026-10-01', price: 1.2, qty: 3 })
    expect(stock.rice.prices).toHaveLength(1)
    expect(stock.rice.prices[0].price).toBe(1.2)
    expect(stock.rice.lastPurchasePrice).toBe(1.2)
    expect(stock.rice.lastPurchaseQty).toBe(3)
    expect(stock.rice.lastPurchased).toBe('2026-10-01')
  })
  it('keeps distinct-date entries and accumulates them in order', () => {
    let stock = {}
    stock = addJournalEntry('rice', stock, { date: '2026-09-01', price: 1.6, qty: 2 })
    stock = addJournalEntry('rice', stock, { date: '2026-08-01', price: 1.5, qty: 2 })
    expect(stock.rice.prices.map((p) => p.date)).toEqual(['2026-08-01', '2026-09-01'])
  })
  it('leaves other foods untouched', () => {
    const stock = { oats: { prices: [{ date: '2026-08-01', price: 3 }] } }
    const out = addJournalEntry('rice', stock, { date: '2026-10-01', price: 1.4, qty: 1 })
    expect(out.oats.prices).toHaveLength(1)
    expect(out.rice.prices).toHaveLength(1)
  })
  it('records a rotation date without clobbering prices', () => {
    const out = markRotated('rice', { rice: { prices: [{ date: '2026-08-01', price: 1.4 }] } }, '2026-10-05')
    expect(out.rice.lastRotation).toBe('2026-10-05')
    expect(out.rice.prices).toHaveLength(1)
  })
  it('addPriceEntry appends and sorts', () => {
    const out = addPriceEntry([{ date: '2026-09-01', price: 2 }], { date: '2026-01-01', price: 1 })
    expect(out.map((p) => p.date)).toEqual(['2026-01-01', '2026-09-01'])
  })
})
