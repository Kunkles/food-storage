// Recipe availability: which storage foods are on hand, which pantry extras
// you've ticked as having, and which recipes you can make now. Pure functions —
// no React, no DOM.
import { CHURCH_STORE_PRODUCTS } from '../data/churchStore.js'
import { PANTRY_EXTRAS } from '../data/recipes.js'

const productNames = Object.fromEntries(CHURCH_STORE_PRODUCTS.map((p) => [p.id, p.name]))
const extraNames = Object.fromEntries(PANTRY_EXTRAS.map((e) => [e.id, e.name]))

// Product ids with a positive quantity in the inventory.
export function onHandIds(inventory) {
  return new Set(inventory.filter((it) => it.productId && Number(it.qty) > 0).map((it) => it.productId))
}

//   onHand — a Set of product ids (from onHandIds)
//   pantry — { extraId: true } for extras you have
export function recipeStatus(recipe, onHand, pantry = {}) {
  const storage = recipe.storage.map((s) => ({
    ...s, name: productNames[s.id] || s.id, have: onHand.has(s.id),
  }))
  const extras = recipe.extras.map((e) => ({
    ...e, name: extraNames[e.id] || e.id, have: !!pantry[e.id],
  }))
  const missingStorage = storage.filter((s) => !s.have && !s.optional)
  const missingExtras = extras.filter((e) => !e.have && !e.optional)
  return {
    storage,
    extras,
    missingStorage,
    missingExtras,
    ready: missingStorage.length === 0 && missingExtras.length === 0,
  }
}

// Required extras you haven't ticked, with how many recipes each would unlock
// a step toward, most-used first.
export function extrasToBuy(recipes, pantry = {}) {
  const counts = {}
  for (const r of recipes) {
    for (const e of r.extras) {
      if (e.optional || pantry[e.id]) continue
      counts[e.id] = (counts[e.id] || 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([id, recipesUsing]) => ({ id, name: extraNames[id] || id, recipesUsing }))
    .sort((a, b) => b.recipesUsing - a.recipesUsing || a.name.localeCompare(b.name))
}
