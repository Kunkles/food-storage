import { describe, it, expect } from 'vitest'
import { DEFAULT_SHOPPING, addRecipeExtras, clearChecked, listCost, newExtra } from '../src/lib/shopping.js'

describe('shopping list', () => {
  it('makes your own items with clean values', () => {
    const e = newExtra({ name: '  Salt ', qty: '2', unit: ' 26 oz ', price: '1.25' })
    expect(e).toMatchObject({ name: 'Salt', qty: 2, unit: '26 oz', price: 1.25 })
    expect(e.id).toBeTruthy()
  })

  it('adds recipe extras once, matching names regardless of case', () => {
    const start = { ...DEFAULT_SHOPPING, extras: [newExtra({ name: 'salt' })] }
    const toBuy = [{ id: 'salt', name: 'Salt' }, { id: 'yeast', name: 'Yeast' }]
    const once = addRecipeExtras(start, toBuy)
    expect(once.extras.map((e) => e.name)).toEqual(['salt', 'Yeast'])
    expect(addRecipeExtras(once, toBuy)).toBe(once)
  })

  it('totals the cost and what is left to buy', () => {
    const plan = [{ id: 'a', qty: 2, price: 10 }, { id: 'b', qty: 1, price: 5 }]
    const extras = [{ id: 'c', qty: 3, price: 1 }]
    expect(listCost(plan, extras, {})).toEqual({ total: 28, left: 28 })
    expect(listCost(plan, extras, { a: true, c: true })).toEqual({ total: 28, left: 5 })
  })

  it('unchecks everything', () => {
    expect(clearChecked({ ...DEFAULT_SHOPPING, checked: { a: true } }).checked).toEqual({})
  })
})
