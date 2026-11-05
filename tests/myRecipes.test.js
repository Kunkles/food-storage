import { describe, it, expect } from 'vitest'
import { matchIngredient, sortIngredients, ingredientsToText, textToIngredients } from '../src/lib/ingredientMatch.js'
import { mealToRecipe, mealSteps } from '../src/lib/mealdb.js'
import { DEFAULT_MY_RECIPES, mergeRecipes, saveRecipe, removeRecipe, recipeStatus } from '../src/lib/recipes.js'
import { RECIPES } from '../src/data/recipes.js'

const id = (text) => matchIngredient(text)?.id

describe('matching ingredients', () => {
  it('finds stored foods from everyday wording', () => {
    expect(id('Long grain rice')).toBe('cs-white-rice')
    expect(id('Onion')).toBe('cs-onions')
    expect(id('Plain Flour')).toBe('cs-white-flour')
    expect(id('Cannellini Beans')).toBe('cs-white-beans')
    expect(id('Milk')).toBe('cs-nonfat-dry-milk')
    expect(id('Penne Rigate')).toBe('cs-macaroni')
    expect(id('Hard red wheat')).toBe('cs-hard-red-wheat')
  })
  it('puts the specific ahead of the general', () => {
    expect(id('Peanut Butter')).toBe('peanut-butter')
    expect(id('Butter')).toBe('butter')
    expect(id('Butter Beans')).toBe('cs-white-beans')
    expect(id('Brown Sugar')).toBe('brown-sugar')
    expect(id('Apple Cider Vinegar')).toBe('vinegar')
    expect(id('Tomato Puree')).toBe('tomato-sauce')
    expect(id('Chicken Stock')).toBe('bouillon')
  })
  it('leaves alone what it should not guess', () => {
    expect(matchIngredient('Spring Onions')).toBeNull()
    expect(matchIngredient('Coconut Milk')).toBeNull()
    expect(matchIngredient('Red Pepper')).toBeNull()
    expect(matchIngredient('Chicken Breast')).toBeNull()
    expect(matchIngredient('Water')).toEqual({ kind: 'water' })
  })
  it('sorts lines and keeps the recipe wording', () => {
    const s = sortIngredients([
      { name: 'Onion', amount: '1 chopped' },
      { name: 'Red Onion', amount: '1' },
      { name: 'Water', amount: '2 cups' },
      { name: 'Salt', amount: 'pinch' },
      { name: 'Chorizo', amount: '100g' },
    ])
    expect(s.storage).toEqual([{ id: 'cs-onions', amount: '1 chopped', as: 'Onion' }])
    expect(s.extras).toEqual([{ id: 'salt', amount: 'pinch' }])
    expect(s.others.map((o) => o.name)).toEqual(['Red Onion', 'Chorizo'])
  })
})

describe('the ingredient box', () => {
  it('round-trips every built-in recipe without losing what it uses', () => {
    for (const r of RECIPES) {
      const back = textToIngredients(ingredientsToText(r))
      expect(back.storage.map((i) => i.id), r.id).toEqual(r.storage.map((i) => i.id))
      expect(back.extras.map((i) => i.id), r.id).toEqual(r.extras.map((i) => i.id))
      expect(back.storage.map((i) => !!i.optional), r.id).toEqual(r.storage.map((i) => !!i.optional))
      expect(back.extras.map((i) => !!i.optional), r.id).toEqual(r.extras.map((i) => !!i.optional))
      expect(back.others, r.id).toEqual([])
    }
  })
  it('reads typed lines', () => {
    const s = textToIngredients('White rice: 1 cup\n2 tbsp olive oil\nBay leaves: 1 (optional)\nchorizo: 100 g\n')
    expect(s.storage).toEqual([{ id: 'cs-white-rice', amount: '1 cup' }])
    expect(s.extras).toEqual([{ id: 'oil', amount: '2 tbsp olive oil' }, { id: 'bay-leaf', amount: '1', optional: true }])
    expect(s.others).toEqual([{ name: 'chorizo', amount: '100 g' }])
  })
})

describe('online recipes', () => {
  const meal = {
    idMeal: '53522', strMeal: 'Arroz con Leche', strCategory: 'Dessert',
    strMealThumb: 'https://www.themealdb.com/images/media/meals/x.jpg', strSource: 'https://example.com/r',
    strInstructions: 'STEP 1\r\nBoil the water.\r\n\r\nSTEP 2\r\nAdd the rice.',
    strIngredient1: 'Rice', strMeasure1: '1 cup',
    strIngredient2: 'Water', strMeasure2: '2 cups',
    strIngredient3: 'Condensed Milk', strMeasure3: '12 ounces',
    strIngredient4: 'Sugar', strMeasure4: '1 cup',
    strIngredient5: '', strMeasure5: '',
  }
  it('becomes one of your recipes', () => {
    const r = mealToRecipe(meal)
    expect(r).toMatchObject({ id: 'mealdb-53522', meal: 'sweet', custom: true, serves: null })
    expect(r.storage.map((i) => i.id)).toEqual(['cs-white-rice', 'cs-sugar'])
    expect(r.others).toEqual([{ name: 'Condensed Milk', amount: '12 ounces' }])
    expect(r.steps).toEqual(['Boil the water.', 'Add the rice.'])
    expect(r.source.url).toBe('https://www.themealdb.com/meal/53522')
  })
  it('drops step numbers on lines of their own', () => {
    expect(mealSteps('1\r\nRinse the rice.\r\n2\r\nBoil it.')).toEqual(['Rinse the rice.', 'Boil it.'])
  })
  it('splits one long paragraph into sentences', () => {
    const long = 'Mix it all together well. '.repeat(15) + 'Serve hot.'
    expect(mealSteps(long).length).toBe(16)
  })
  it('shows what you have', () => {
    const s = recipeStatus(mealToRecipe(meal), new Set(['cs-white-rice']), {})
    expect(s.storage.map((i) => i.have)).toEqual([true, false])
    expect(s.others).toHaveLength(1)
  })
})

describe('your own recipes', () => {
  const mine = { name: 'Bean tacos', storage: [], extras: [], steps: ['Cook.'] }

  it('adds, changes and deletes your recipes', () => {
    let m = saveRecipe(DEFAULT_MY_RECIPES, { ...mine, id: 'mine-1' })
    expect(mergeRecipes(m).at(-1)).toMatchObject({ id: 'mine-1', custom: true })
    m = saveRecipe(m, { ...mine, id: 'mine-1', name: 'Better tacos' })
    expect(m.custom).toHaveLength(1)
    expect(m.custom[0].name).toBe('Better tacos')
    expect(removeRecipe(m, 'mine-1').custom).toEqual([])
  })

  it('keeps changes to a built-in and can undo them', () => {
    const original = RECIPES[0]
    const m = saveRecipe(DEFAULT_MY_RECIPES, { ...original, name: 'My oatmeal' })
    const merged = mergeRecipes(m)
    expect(merged).toHaveLength(RECIPES.length)
    expect(merged[0]).toMatchObject({ id: original.id, name: 'My oatmeal', edited: true })
    expect(mergeRecipes(removeRecipe(m, original.id))[0]).toBe(original)
  })
})
