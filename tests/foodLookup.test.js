import { describe, it, expect } from 'vitest'
import { gramsOf, itemFromOpenFoodFacts, lookupBarcode, readNutritionLabel } from '../src/lib/foodLookup.js'

// Roughly what OCR reads off the two labels in the user's photos.
const CHICKEN = `Nutrition Facts
about 21 servings per container
Serving size 2 oz (56g)
Amount per serving
Calories 60
% Daily Value*
Total Fat 1g 1%
Protein 13g 26%
* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
NET WT 6 – 354 g (12.5 OZ) CANS • TOTAL 2.13 kg (4.6 LB)
DRAINED WT 6 – 196 g (7 OZ) CANS • TOTAL 1.18 kg (2.6 LB)`

const TUNA = `43g Protein Per Can
Nutrition Facts
10 servings per container
Serving size 3oz (85g)
Amount per serving
Calories 110
Total Fat 0.5g 1%
Protein 26g 52%
IN TUNA NETWT 5OZ(142g)`

describe('reading a Nutrition Facts panel', () => {
  it('splits a pack label between its cans', () => {
    const r = readNutritionLabel(CHICKEN)
    expect(r.servings).toBe(21)
    expect(r.kcalPerServing).toBe(60)
    expect(r.packCount).toBe(6)
    expect(r.perUnitKcal).toBe(210)
    expect(r.unit).toBe('12.5 oz can')
  })
  it("works out one can when the panel is for a multipack", () => {
    const r = readNutritionLabel(TUNA)
    expect(r.servingGrams).toBe(85)
    expect(r.netGrams).toBe(142)
    expect(r.perUnitKcal).toBe(184)
    expect(r.unit).toBe('5 oz can')
  })
  it('reads old-style labels', () => {
    const r = readNutritionLabel('Serving Size 1/2 cup (130g)\nServings Per Container about 3.5\nCalories 120 Calories from Fat 10')
    expect(r.servings).toBe(3.5)
    expect(r.kcalPerServing).toBe(120)
    expect(r.perUnitKcal).toBe(420)
  })
  it('returns what it could read when calories are missing', () => {
    const r = readNutritionLabel('Serving size 1 cup (240mL)')
    expect(r.perUnitKcal).toBeUndefined()
    expect(r.servingText).toBe('1 cup (240mL)')
  })
})

describe('Open Food Facts', () => {
  const product = {
    status: 1,
    product: {
      product_name: 'Chunk Chicken Breast', brands: 'Kirkland Signature', quantity: '354 g',
      product_quantity: 354, nutriments: { 'energy-kcal_100g': 107 }, categories_tags: ['en:canned-meats'],
    },
  }
  it('turns a product into an On Hand item', () => {
    const r = itemFromOpenFoodFacts(product, '0096619')
    expect(r).toMatchObject({ found: true, name: 'Chunk Chicken Breast (Kirkland Signature)', unit: '12.5 oz can', perUnitKcal: 379, noCook: true })
    expect(r.how).toContain('per 100 g')
  })
  it('says when the barcode is unknown', async () => {
    expect(itemFromOpenFoodFacts({ status: 0 }).found).toBe(false)
    const r = await lookupBarcode('123', async () => ({ status: 404, ok: false }))
    expect(r.found).toBe(false)
  })
  it('asks for the barcode it was given', async () => {
    let url
    await lookupBarcode('0 12', async (u) => { url = u; return { ok: true, status: 200, json: async () => product } })
    expect(url).toMatch(/^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/0%2012\.json/)
  })
  it('reads weights', () => {
    expect(gramsOf('5 oz')).toBeCloseTo(141.7, 1)
    expect(gramsOf('1,5 kg')).toBe(1500)
    expect(gramsOf('a can')).toBeNull()
  })
})

describe('container words', () => {
  it('calls jars jars and cans cans', () => {
    const jar = itemFromOpenFoodFacts({ status: 1, product: { product_name: 'Nutella', product_quantity: 400, nutriments: { 'energy-kcal_100g': 539 }, categories_tags: ['en:sweet-spreads', 'en:hazelnut-spreads'] } })
    expect(jar.unit).toBe('14 oz jar')
    const can = itemFromOpenFoodFacts({ status: 1, product: { product_name: 'Tuna', quantity: '5 oz can', nutriments: {}, categories_tags: ['en:canned-tunas'] } })
    expect(can.unit).toBe('5 oz can')
    expect(can.perUnitKcal).toBe(0)
  })
})

// What OCR actually read from the user's photos of curved, shiny cans.
describe('real OCR text', () => {
  const chickenPanel = `ings per conta
about 21 serv 2 oz (564)
Ee — i
Amount per serving 60
Calories | I
% Daily Value* | | W
Cholesterol 45mg 15% = ) ,
2 a day is used for general mutrion papper puss : | \\J`
  const chickenNet = `JRKL/AND 2 PEC » E -
{NET WT 6-3549 (12.502) CANS « TOTAL 2.43
EL DRAINED WT 6-196 9 (7 0Z) CANS « TOTAL L1aiy rd)`
  const tunaPanel = `~ Rwnutrition Fac: 2% |
es i 10 servings per container
8 I serving size 30z(8t
| Amount per sively - ~-
| calories 11048 |
on * &1ving of fog contributes to a daily diet: 2 - Hid | v1 '`

  it('gets the chicken right from the panel and the pack weight', () => {
    const r = readNutritionLabel(`${chickenPanel}\n${chickenNet}`)
    expect(r).toMatchObject({ servings: 21, kcalPerServing: 60, packCount: 6, perUnitKcal: 210 })
  })
  it('reads the tuna panel and says the total may be for a pack', () => {
    const r = readNutritionLabel(tunaPanel)
    expect(r).toMatchObject({ servings: 10, kcalPerServing: 110, perUnitKcal: 1100, wholePackage: true })
  })
  it('checks grams against ounces', () => {
    expect(readNutritionLabel('Serving size 2 oz (564)').servingGrams).toBeCloseTo(56.7, 0)
    expect(readNutritionLabel('Serving size 2 oz (56g)').servingGrams).toBe(56)
  })
})
