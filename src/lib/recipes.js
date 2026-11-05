// Recipe availability: which storage foods are on hand, which pantry extras
// you've ticked as having, and which recipes you can make now. Pure functions —
// no React, no DOM.
import { CHURCH_STORE_PRODUCTS } from '../data/churchStore.js'
import { PANTRY_EXTRAS, RECIPES } from '../data/recipes.js'

const productNames = Object.fromEntries(CHURCH_STORE_PRODUCTS.map((p) => [p.id, p.name]))
const extraNames = Object.fromEntries(PANTRY_EXTRAS.map((e) => [e.id, e.name]))

// Product ids with a positive quantity in the inventory.
export function onHandIds(inventory) {
  return new Set(inventory.filter((it) => it.productId && Number(it.qty) > 0).map((it) => it.productId))
}

//   onHand — a Set of product ids (from onHandIds)
//   pantry — { extraId: true } for extras you have
export function recipeStatus(recipe, onHand, pantry = {}) {
  const storage = (recipe.storage || []).map((s) => ({
    ...s, name: productNames[s.id] || s.id, have: onHand.has(s.id),
  }))
  const extras = (recipe.extras || []).map((e) => ({
    ...e, name: extraNames[e.id] || e.id, have: !!pantry[e.id],
  }))
  // Everything else in the recipe, as written (from your own or online recipes).
  const others = recipe.others || []
  const missingStorage = storage.filter((s) => !s.have && !s.optional)
  const missingExtras = extras.filter((e) => !e.have && !e.optional)
  return {
    storage,
    extras,
    others,
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
    for (const e of r.extras || []) {
      if (e.optional || pantry[e.id]) continue
      counts[e.id] = (counts[e.id] || 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([id, recipesUsing]) => ({ id, name: extraNames[id] || id, recipesUsing }))
    .sort((a, b) => b.recipesUsing - a.recipesUsing || a.name.localeCompare(b.name))
}

// ---- your own recipes ----
// Stored as { custom: [recipe…], edits: { builtInId: recipe } }: recipes you
// added or saved from online, and your changed copies of built-in ones.
export const DEFAULT_MY_RECIPES = { custom: [], edits: {} }

// Built-ins (with your edits in place of the originals), then your own.
export function mergeRecipes(mine = DEFAULT_MY_RECIPES, builtIns = RECIPES) {
  const edits = mine.edits || {}
  return [
    ...builtIns.map((r) => (edits[r.id] ? { ...edits[r.id], id: r.id, edited: true } : r)),
    ...(mine.custom || []),
  ]
}

// Saves a recipe: an edit for a built-in, otherwise added or replaced in your list.
export function saveRecipe(mine, recipe, builtIns = RECIPES) {
  if (builtIns.some((r) => r.id === recipe.id)) {
    const { edited, ...clean } = recipe // eslint-disable-line no-unused-vars
    return { ...mine, edits: { ...mine.edits, [recipe.id]: clean } }
  }
  const custom = mine.custom.some((r) => r.id === recipe.id)
    ? mine.custom.map((r) => (r.id === recipe.id ? recipe : r))
    : [...mine.custom, { ...recipe, custom: true }]
  return { ...mine, custom }
}

// Deletes one of your recipes, or puts a built-in back the way it came.
export function removeRecipe(mine, id) {
  if (mine.edits?.[id]) {
    const { [id]: _gone, ...edits } = mine.edits // eslint-disable-line no-unused-vars
    return { ...mine, edits }
  }
  return { ...mine, custom: mine.custom.filter((r) => r.id !== id) }
}
