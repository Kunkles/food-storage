// Shopping list state: which lines are checked off, and your own items on top
// of the plan. Pure functions — no React, no DOM.

export const DEFAULT_SHOPPING = {
  checked: {}, // line id -> true once it's in the cart
  extras: [], // your own items: { id, name, qty, unit, price }
}

let seq = 0
const uid = () => `shop-${Date.now()}-${seq++}`

export function newExtra({ name, qty = 1, unit = '', price = 0 }) {
  return { id: uid(), name: name.trim(), qty: Number(qty) || 0, unit: unit.trim(), price: Number(price) || 0 }
}

// Adds the recipe pantry extras you don't have, skipping any already on the
// list (matched by name, ignoring case).
export function addRecipeExtras(shopping, toBuy) {
  const have = new Set(shopping.extras.map((e) => e.name.toLowerCase()))
  const added = toBuy
    .filter((x) => !have.has(x.name.toLowerCase()))
    .map((x) => newExtra({ name: x.name, qty: 1 }))
  return added.length ? { ...shopping, extras: [...shopping.extras, ...added] } : shopping
}

// Cost of every line, and of the lines not checked off yet.
export function listCost(plan, extras, checked = {}) {
  let total = 0
  let left = 0
  for (const it of [...plan, ...extras]) {
    const cost = (Number(it.qty) || 0) * (Number(it.price) || 0)
    total += cost
    if (!checked[it.id]) left += cost
  }
  return { total, left }
}

// Unchecks everything, ready for the next trip.
export function clearChecked(shopping) {
  return { ...shopping, checked: {} }
}
