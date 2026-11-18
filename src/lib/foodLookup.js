// Turning a barcode or a photo of a label into an On Hand item: looking the
// barcode up on Open Food Facts, and reading calories out of a Nutrition Facts
// panel's text. Pure functions apart from the fetch, which can be swapped in
// tests — no React, no DOM.

const round = (n) => Math.round(n)
const G_PER_OZ = 28.3495

// Foods that are safe to eat straight from the package. A guess from Open Food
// Facts' categories; the checkbox can be changed before adding.
const NO_COOK = /canned-(fishes|tunas|meats|chicken|fruits)|tunas|sardines|peanut-butters|nut-butters|crackers|dried-fruits|nuts|cereal-bars|protein-bars|snacks|jerkies|fruit-cups|applesauces/

// What the food comes in, for the unit name: "can", "jar", "bottle"…
function containerWord(text, tags) {
  const t = text.toLowerCase()
  if (/\bjars?\b/.test(t) || tags.some((x) => /spreads|nut-butters|jams|honeys/.test(x))) return 'jar'
  if (/\b(cans?|tins?|canned)\b/.test(t) || tags.some((x) => /canned/.test(x))) return 'can'
  if (/\bbottles?\b/.test(t)) return 'bottle'
  if (/\b(bags?|pouch(es)?)\b/.test(t)) return 'bag'
  if (/\b(box(es)?|cartons?)\b/.test(t)) return 'box'
  return 'package'
}

// "354 g", "12.5 oz", "1 lb" → grams, or null.
export function gramsOf(text) {
  const m = String(text || '').toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(kg|g|oz|lb)\b/)
  if (!m) return null
  const n = Number(m[1].replace(',', '.'))
  return { kg: n * 1000, g: n, oz: n * G_PER_OZ, lb: n * 453.6 }[m[2]]
}

// A unit name for the form, like "12.5 oz can": ounces for US-style weights.
function unitFromGrams(grams, word = 'package') {
  if (!grams) return word
  const oz = grams / G_PER_OZ
  return `${oz >= 10 ? Math.round(oz * 2) / 2 : Math.round(oz * 10) / 10} oz ${word}`
}

// Open Food Facts' answer → { found, name, unit, perUnitKcal, noCook, how }.
// `how` says where the calories came from, so they can be checked against the
// label. perUnitKcal is 0 when it can't be worked out.
export function itemFromOpenFoodFacts(json, code = '') {
  const p = json?.status === 1 ? json.product : null
  if (!p) return { found: false, code }
  const n = p.nutriments || {}
  const name = [p.product_name || p.generic_name, p.brands?.split(',')[0]?.trim()]
    .filter(Boolean)
    .filter((x, i, a) => i === 0 || !a[0].toLowerCase().includes(x.toLowerCase()))
    .map((x, i) => (i ? `(${x})` : x))
    .join(' ')
  const grams = Number(p.product_quantity) > 0 && (p.product_quantity_unit || 'g') === 'g'
    ? Number(p.product_quantity) : gramsOf(p.quantity)
  const word = containerWord(`${p.quantity || ''} ${p.product_name || ''} ${p.generic_name || ''}`, p.categories_tags || [])
  let perUnitKcal = 0
  let how = ''
  if (Number(n['energy-kcal_100g']) > 0 && grams) {
    perUnitKcal = round((n['energy-kcal_100g'] * grams) / 100)
    how = `${round(n['energy-kcal_100g'])} kcal per 100 g × ${round(grams)} g`
  } else if (Number(n['energy-kcal_serving']) > 0 && Number(p.serving_quantity) > 0 && grams) {
    perUnitKcal = round((n['energy-kcal_serving'] * grams) / p.serving_quantity)
    how = `${round(n['energy-kcal_serving'])} kcal per ${p.serving_size || `${p.serving_quantity} g`} serving`
  }
  return {
    found: true,
    code,
    name: name || 'Unnamed product',
    unit: unitFromGrams(grams, word),
    perUnitKcal,
    noCook: NO_COOK.test((p.categories_tags || []).join(' ')),
    how,
  }
}

export async function lookupBarcode(code, fetchImpl = fetch) {
  const fields = 'status,product_name,generic_name,brands,quantity,product_quantity,product_quantity_unit,serving_size,serving_quantity,nutriments,categories_tags'
  const res = await fetchImpl(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`)
  if (res.status === 404) return { found: false, code }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return itemFromOpenFoodFacts(await res.json(), code)
}

// ---- reading a Nutrition Facts panel ----

// Text from one or more photos of a US label → what it says, and calories per
// can or package when that can be worked out:
//   { servings, servingText, servingGrams, kcalPerServing, netGrams, packCount,
//     perUnitKcal, unit, how }
// OCR text is messy, so every field is optional.
export function readNutritionLabel(text) {
  const t = String(text || '').replace(/[|]/g, ' ').replace(/[ \t]+/g, ' ')
  const out = {}

  // "about 21 servings per container" (new labels) or
  // "Servings Per Container about 21" (old ones). On a curved can OCR may only
  // catch "about 21 serv".
  const sv = t.match(/(\d+(?:\.\d+)?)\s*servings?\s*per\s*(?:container|package|can|pack)/i) ||
    t.match(/servings?\s*per\s*(?:container|package|can|pack)\s*:?\s*(?:about\s*)?(\d+(?:\.\d+)?)/i) ||
    t.match(/(?:about\s*)?(\d+(?:\.\d+)?)\s*serv/i)
  if (sv) out.servings = Number(sv[1])

  const ss = t.match(/serving\s*size\s*:?\s*([^\n]*)/i)
  if (ss) {
    out.servingText = ss[1].trim()
    // Grams in brackets, checked against ounces when both are there: OCR
    // often reads "56g" as "564".
    const g = out.servingText.match(/(\d+(?:\.\d+)?)\s*g\b/i)
    const oz = out.servingText.match(/(\d+(?:\.\d+)?)\s*oz\b/i)
    const ozGrams = oz ? Number(oz[1]) * G_PER_OZ : null
    out.servingGrams = g && (!ozGrams || Math.abs(Number(g[1]) - ozGrams) < ozGrams * 0.3)
      ? Number(g[1]) : ozGrams || gramsOf(out.servingText) || undefined
  }

  // "Calories 110", or "Amount per serving 60" when OCR splits the line —
  // but not "Calories from Fat" or "2,000 calories a day". Calories per
  // serving are under 1,000, which also drops noise stuck on the end.
  const kc = t.match(/calories(?!\s*from)\s*:?\s*\n?\s*(\d{1,3})/i) ||
    t.match(/amount\s*per\s*serving\s*(\d{1,3})\b/i)
  if (kc) out.kcalPerServing = Number(kc[1])

  // "NET WT 6 – 354 g (12.5 OZ) CANS" (a pack) or "NET WT 5oz(142g)".
  const pack = t.match(/net\s*wt\.?\s*(\d{1,2})\s*[-–—x×]\s*([^\n]{0,24})/i)
  if (pack && Number(pack[1]) > 1) {
    out.packCount = Number(pack[1])
    const g = pack[2].match(/^(\d+(?:\.\d+)?)\s*g\b/i)
    out.netGrams = g ? Number(g[1]) : gramsOf(pack[2]) || undefined
  } else {
    const nw = t.match(/net\s*w(?:t|eight)\.?\s*:?\s*([^\n]{0,30})/i)
    if (nw) {
      const g = nw[1].match(/(\d+(?:\.\d+)?)\s*g\b/i)
      out.netGrams = g ? Number(g[1]) : gramsOf(nw[1]) || undefined
    }
  }
  if (!out.netGrams) delete out.netGrams

  const k = out.kcalPerServing
  if (k && out.servings) {
    const container = out.servings * k
    if (out.packCount > 1) {
      // The label is for the whole pack: split it between the cans.
      out.perUnitKcal = round(container / out.packCount)
      out.unit = unitFromGrams(out.netGrams, 'can')
      out.how = `${out.servings} servings × ${k} kcal for ${out.packCount} cans`
    } else if (out.netGrams && out.servingGrams && out.servings * out.servingGrams > out.netGrams * 1.5) {
      // Servings add up to far more than one can: the panel is for a multipack,
      // so work it out from this can's weight.
      out.perUnitKcal = round((out.netGrams / out.servingGrams) * k)
      out.unit = unitFromGrams(out.netGrams, 'can')
      out.how = `${round(out.netGrams)} g ÷ ${out.servingGrams} g serving × ${k} kcal (the label is for a multipack)`
    } else {
      out.perUnitKcal = round(container)
      out.unit = out.netGrams ? unitFromGrams(out.netGrams, 'package') : 'package'
      out.how = `${out.servings} servings × ${k} kcal`
      // A big number with no weight to check it against may be a whole multipack.
      if (!out.netGrams) out.wholePackage = true
    }
  } else if (k && out.netGrams && out.servingGrams) {
    out.perUnitKcal = round((out.netGrams / out.servingGrams) * k)
    out.unit = unitFromGrams(out.netGrams, 'package')
    out.how = `${round(out.netGrams)} g ÷ ${out.servingGrams} g serving × ${k} kcal`
  }
  return out
}
