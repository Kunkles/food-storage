// Matches an ingredient written in plain words ("2 cups long grain rice",
// "1 tsp garlic powder") to a storage food or a pantry extra, so recipes typed
// in or found online can show what you already have. Pure functions.
//
// Rules run in order and the first match wins, so the specific ones come
// before the general: "peanut butter" before "butter", "brown sugar" before
// "sugar", "butter beans" before either. A fresh ingredient matches its stored
// stand-in (fresh onion → dried onions, fresh milk → dry milk).
import { CHURCH_STORE_PRODUCTS } from '../data/churchStore.js'
import { PANTRY_EXTRAS } from '../data/recipes.js'

const RULES = [
  { kind: 'water', re: /^\s*(cold |warm |hot |boiling )?water\s*$/ },

  { kind: 'storage', id: 'cs-black-beans', re: /black (turtle )?beans/ },
  { kind: 'storage', id: 'cs-pinto-beans', re: /pinto|refried beans/ },
  { kind: 'storage', id: 'cs-white-beans', re: /cannellini|haricot|navy beans|great northern|white beans|butter beans|borlotti/ },
  { kind: 'storage', id: 'cs-nonfat-dry-milk', re: /buttermilk|evaporated milk|milk powder|dry milk/ },

  { kind: 'pantry', id: 'peanut-butter', re: /peanut butter/ },
  { kind: 'pantry', id: 'brown-sugar', re: /brown sugar|muscovado|demerara/ },
  { kind: 'pantry', id: 'baking-powder', re: /baking powder/ },
  { kind: 'pantry', id: 'baking-soda', re: /baking soda|bicarbonate|bicarb/ },
  { kind: 'pantry', id: 'soy-sauce', re: /soy sauce|soya sauce|tamari/ },
  { kind: 'pantry', id: 'vinegar', re: /vinegar|\blimes?\b|lime juice/ },
  { kind: 'pantry', id: 'lemon-juice', re: /lemon/ },
  { kind: 'pantry', id: 'tomato-sauce', re: /tomato (sauce|paste|pur[eé]e)|passata|ketchup/ },
  { kind: 'pantry', id: 'tomatoes', re: /tomato/ },
  { kind: 'pantry', id: 'bouillon', re: /\bstock\b|broth|bouillon/ },
  { kind: 'pantry', id: 'garlic-powder', re: /garlic/ },
  { kind: 'pantry', id: 'chili-powder', re: /chil+i powder|chil+i flakes|cayenne|paprika/ },
  { kind: 'pantry', id: 'cumin', re: /cumin/ },
  { kind: 'pantry', id: 'oregano', re: /oregano/ },
  { kind: 'pantry', id: 'italian', re: /italian seasoning|mixed herbs|dried herbs|\bbasil\b|thyme|rosemary/ },
  { kind: 'pantry', id: 'bay-leaf', re: /bay lea/ },
  { kind: 'pantry', id: 'parsley', re: /parsley/ },
  { kind: 'pantry', id: 'mustard', re: /mustard/ },
  { kind: 'pantry', id: 'ginger', re: /ginger/ },
  { kind: 'pantry', id: 'cinnamon', re: /cinnamon/ },
  { kind: 'pantry', id: 'vanilla', re: /vanilla/ },
  { kind: 'pantry', id: 'cocoa', re: /cocoa|cacao/ },
  { kind: 'pantry', id: 'honey', re: /honey/ },
  { kind: 'pantry', id: 'syrup', re: /maple syrup|golden syrup|pancake syrup/ },
  { kind: 'pantry', id: 'raisins', re: /raisin|sultana|currant/ },
  { kind: 'pantry', id: 'yeast', re: /yeast/ },
  { kind: 'pantry', id: 'cheese', re: /cheese|cheddar|parmesan|mozzarella/ },
  { kind: 'pantry', id: 'eggs', re: /\beggs?\b|egg (yolk|white)/ },
  { kind: 'pantry', id: 'butter', re: /butter|ghee|margarine/ },

  { kind: 'storage', id: 'cs-strawberry-slices', re: /strawberr/ },
  { kind: 'storage', id: 'cs-apple-slices', re: /\bapples?\b(?!\s*(juice|sauce|cider))/ },
  { kind: 'storage', id: 'cs-quick-oats', re: /quick oats|instant oats|quick-cooking oats/ },
  { kind: 'storage', id: 'cs-regular-oats', re: /\boats\b|oatmeal|porridge/ },
  { kind: 'storage', id: 'cs-hard-white-wheat', re: /wheat berr|whole ?wheat flour|wholemeal|bulgu?r|cracked wheat|wheat grain/ },
  { kind: 'storage', id: 'cs-white-flour', re: /flour/, not: /(corn|rice|almond|chickpea|gram|coconut|buckwheat|rye|tapioca|potato|oat) ?flour|cornflour/ },
  { kind: 'storage', id: 'cs-white-rice', re: /\brice\b/, not: /noodle|paper|wine|cake/ },
  { kind: 'storage', id: 'cs-spaghetti-bites', re: /spaghetti|linguine|vermicelli|tagliatelle|fettuccine/ },
  { kind: 'storage', id: 'cs-macaroni', re: /macaroni|elbow|penne|rigatoni|fusilli|farfalle|\bpasta\b|orzo|ditalini/ },
  { kind: 'storage', id: 'cs-potato-flakes', re: /potato flakes|instant (mashed )?potato|mashed potato/ },
  { kind: 'storage', id: 'cs-carrots', re: /carrot/ },
  { kind: 'storage', id: 'cs-onions', re: /onion|shallot/, not: /spring onion|green onion/ },
  { kind: 'storage', id: 'cs-nonfat-dry-milk', re: /milk/, not: /coconut|almond|\boat\b|soy|rice milk|condensed/ },
  { kind: 'storage', id: 'cs-sugar', re: /sugar/, not: /icing|powdered|confectioner/ },

  { kind: 'pantry', id: 'salt', re: /\bsalt\b/ },
  { kind: 'pantry', id: 'pepper', re: /black pepper|\bpepper\b|peppercorn/, not: /bell|red|green|yellow|chil|jalap|sweet|flakes/ },
  { kind: 'pantry', id: 'oil', re: /\boil\b|shortening|lard/ },
]

// The app's own names ("Hard red wheat", "Cooking oil or shortening") always
// match, ahead of the word rules.
const NAMES = new Map([
  ...CHURCH_STORE_PRODUCTS.filter((p) => p.category !== 'supply').map((p) => [p.name.toLowerCase(), { kind: 'storage', id: p.id }]),
  ...PANTRY_EXTRAS.map((e) => [e.name.toLowerCase(), { kind: 'pantry', id: e.id }]),
])
export const nameOf = (m) =>
  m.kind === 'storage'
    ? CHURCH_STORE_PRODUCTS.find((p) => p.id === m.id)?.name
    : PANTRY_EXTRAS.find((e) => e.id === m.id)?.name

// { kind: 'storage' | 'pantry', id } for a known ingredient, { kind: 'water' }
// for plain water, or null.
export function matchIngredient(text) {
  const t = String(text || '').toLowerCase().trim()
  if (NAMES.has(t)) return NAMES.get(t)
  for (const r of RULES) {
    if (r.re.test(t) && !(r.not && r.not.test(t))) return r.id ? { kind: r.kind, id: r.id } : { kind: r.kind }
  }
  return null
}

// Sorts a recipe's ingredient lines into storage foods, pantry extras and
// everything else. Each line is { name, amount, optional? }. A matched line
// keeps the recipe's own wording in `as` when it differs ("Onion" → Onions).
export function sortIngredients(lines) {
  const storage = []
  const extras = []
  const others = []
  const seen = new Set()
  for (const { name, amount, optional } of lines) {
    const m = matchIngredient(name)
    if (m?.kind === 'water') continue
    if (m && !seen.has(m.id)) {
      seen.add(m.id)
      const item = { id: m.id, amount: amount || name }
      if (amount && name.toLowerCase() !== nameOf(m)?.toLowerCase()) item.as = name
      if (optional) item.optional = true
      ;(m.kind === 'storage' ? storage : extras).push(item)
    } else {
      // Unknown, or a second line for the same thing (two kinds of onion).
      others.push(optional ? { name, amount, optional } : { name, amount })
    }
  }
  return { storage, extras, others }
}

// ---- the recipe editor's ingredient box: one ingredient per line ----
// "White rice: 1 cup", "Bay leaves: 1 (optional)", or just "2 tbsp olive oil".

export function ingredientsToText(recipe) {
  const line = (name, amount, optional) =>
    `${amount ? `${name}: ${amount}` : name}${optional ? ' (optional)' : ''}`
  const matched = (kind) => (i) => {
    const amount = i.as ? `${i.amount} (${i.as})` : i.amount
    return line(nameOf({ kind, id: i.id }) || i.id, amount, i.optional)
  }
  return [
    ...(recipe.storage || []).map(matched('storage')),
    ...(recipe.extras || []).map(matched('pantry')),
    ...(recipe.others || []).map((o) => line(o.name, o.amount, o.optional)),
  ].join('\n')
}

export function textToIngredients(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const optional = /\(optional\)\s*$/i.test(l)
    const body = l.replace(/\s*\(optional\)\s*$/i, '')
    const colon = body.indexOf(':')
    return colon > 0
      ? { name: body.slice(0, colon).trim(), amount: body.slice(colon + 1).trim(), optional }
      : { name: body, amount: '', optional }
  })
  return sortIngredients(lines)
}
