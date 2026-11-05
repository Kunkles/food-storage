import { describe, it, expect } from 'vitest'
import { extrasToBuy, onHandIds, recipeStatus } from '../src/lib/recipes.js'
import { MEALS, PANTRY_EXTRAS, RECIPES } from '../src/data/recipes.js'
import { CHURCH_STORE_ORDERS, CHURCH_STORE_PRODUCTS } from '../src/data/churchStore.js'
import { itemsFromOrder } from '../src/lib/inventory.js'

const order = CHURCH_STORE_ORDERS[0]
const inventory = itemsFromOrder(order)

describe('recipe data', () => {
  it('only uses foods and extras that exist', () => {
    const products = new Set(CHURCH_STORE_PRODUCTS.map((p) => p.id))
    const extras = new Set(PANTRY_EXTRAS.map((e) => e.id))
    const meals = new Set(MEALS.map((m) => m.id))
    for (const r of RECIPES) {
      expect(meals.has(r.meal), r.id).toBe(true)
      for (const s of r.storage) expect(products.has(s.id), `${r.id}: ${s.id}`).toBe(true)
      for (const e of r.extras) expect(extras.has(e.id), `${r.id}: ${e.id}`).toBe(true)
      expect(r.steps.length, r.id).toBeGreaterThan(0)
    }
  })
  it('has unique ids', () => {
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length)
  })
  it('uses only foods from the order', () => {
    const ordered = new Set(order.items.map((i) => i.productId))
    for (const r of RECIPES) for (const s of r.storage) expect(ordered.has(s.id), `${r.id}: ${s.id}`).toBe(true)
  })
})

describe('what you can make', () => {
  it('finds storage foods with a quantity', () => {
    const ids = onHandIds([...inventory, { productId: 'cs-sugar', qty: 0 }, { name: 'custom', qty: 3 }])
    expect(ids.has('cs-white-rice')).toBe(true)
    expect(ids.size).toBe(order.items.length)
  })
  it('is ready only with the required extras ticked', () => {
    const oats = RECIPES.find((r) => r.id === 'apple-cinnamon-oatmeal')
    const onHand = onHandIds(inventory)
    expect(recipeStatus(oats, onHand, {}).ready).toBe(false)
    expect(recipeStatus(oats, onHand, {}).missingExtras.map((e) => e.id)).toEqual(['salt', 'cinnamon'])
    // brown sugar is optional
    expect(recipeStatus(oats, onHand, { salt: true, cinnamon: true }).ready).toBe(true)
  })
  it('is not ready when a storage food is missing', () => {
    const oats = RECIPES.find((r) => r.id === 'apple-cinnamon-oatmeal')
    const s = recipeStatus(oats, new Set(), { salt: true, cinnamon: true })
    expect(s.ready).toBe(false)
    expect(s.missingStorage).toHaveLength(4)
  })
})

describe('extras to buy', () => {
  it('ranks unticked required extras by how many recipes use them', () => {
    const list = extrasToBuy(RECIPES)
    expect(list[0].id).toBe('salt')
    expect(list.every((x, i) => i === 0 || list[i - 1].recipesUsing >= x.recipesUsing)).toBe(true)
  })
  it('leaves out what you have', () => {
    expect(extrasToBuy(RECIPES, { salt: true }).some((x) => x.id === 'salt')).toBe(false)
  })
})
