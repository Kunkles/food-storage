// Recipes from TheMealDB (themealdb.com), a free recipe site that the browser
// can call directly. Fetching needs internet; a recipe you save is copied into
// your own recipes and works offline after that.
import { sortIngredients } from './ingredientMatch.js'

// "1" is TheMealDB's free key for personal and educational use.
const KEY = import.meta.env.VITE_MEALDB_KEY || '1'
const API = `https://www.themealdb.com/api/json/v1/${KEY}`

// Storage foods you can search by, and the TheMealDB ingredient names that
// mean the same thing.
export const SEARCH_FOODS = [
  { id: 'rice', label: 'Rice', terms: ['rice'] },
  { id: 'black-beans', label: 'Black beans', terms: ['black_beans'] },
  { id: 'pinto-beans', label: 'Pinto beans', terms: ['pinto_beans'] },
  { id: 'white-beans', label: 'White beans', terms: ['cannellini_beans', 'great_northern_beans'] },
  { id: 'oats', label: 'Oats', terms: ['oats', 'rolled_oats', 'porridge_oats'] },
  { id: 'flour', label: 'Flour', terms: ['plain_flour', 'flour'] },
  { id: 'pasta', label: 'Pasta', terms: ['macaroni', 'spaghetti'] },
  { id: 'carrots', label: 'Carrots', terms: ['carrots'] },
  { id: 'onion', label: 'Onion', terms: ['onion'] },
  { id: 'apples', label: 'Apples', terms: ['apples'] },
  { id: 'strawberries', label: 'Strawberries', terms: ['strawberries'] },
  { id: 'milk', label: 'Milk', terms: ['milk'] },
  { id: 'sugar', label: 'Sugar', terms: ['sugar'] },
]

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`The recipe site answered ${res.status}. Try again in a bit.`)
  return res.json()
}

// Short entries ({ idMeal, strMeal, strMealThumb }) for meals that use every
// one of the chosen foods.
export async function mealsUsingAll(foodIds) {
  const lists = await Promise.all(foodIds.map(async (fid) => {
    const food = SEARCH_FOODS.find((f) => f.id === fid)
    const results = await Promise.all(food.terms.map((t) => getJson(`${API}/filter.php?i=${encodeURIComponent(t)}`)))
    const byId = new Map()
    for (const r of results) for (const m of r.meals || []) byId.set(m.idMeal, m)
    return byId
  }))
  const [first, ...rest] = lists
  return [...first.values()].filter((m) => rest.every((l) => l.has(m.idMeal)))
}

export async function mealsByName(query) {
  const r = await getJson(`${API}/search.php?s=${encodeURIComponent(query.trim())}`)
  return r.meals || []
}

export async function mealDetails(id) {
  const r = await getJson(`${API}/lookup.php?i=${encodeURIComponent(id)}`)
  return r.meals?.[0] || null
}

// The ingredient lines of a full TheMealDB meal.
export function mealIngredients(meal) {
  const lines = []
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] || '').trim()
    if (name) lines.push({ name, amount: (meal[`strMeasure${i}`] || '').trim() })
  }
  return lines
}

// Instructions as steps: one per line, without "STEP 1" headings. A recipe
// written as one long paragraph is split into sentences.
export function mealSteps(text) {
  let steps = String(text || '')
    .split(/\r?\n+/)
    .map((s) => s.replace(/^\s*(step\s*\d+[:.)]?|\d+[.)])\s*/i, '').trim())
    .filter((s) => s && !/^(step\s*)?\d*$/i.test(s))
  if (steps.length === 1 && steps[0].length > 300) {
    steps = steps[0].match(/[^.!?]+[.!?]+(\s|$)/g)?.map((s) => s.trim()) || steps
  }
  return steps
}

const MEAL_FOR_CATEGORY = { Breakfast: 'breakfast', Dessert: 'sweet' }

// A full TheMealDB meal as one of your recipes.
export function mealToRecipe(meal) {
  const { storage, extras, others } = sortIngredients(mealIngredients(meal))
  return {
    id: `mealdb-${meal.idMeal}`,
    name: meal.strMeal,
    meal: MEAL_FOR_CATEGORY[meal.strCategory] || 'main',
    serves: null,
    fuelMinutes: null,
    storage,
    extras,
    others,
    steps: mealSteps(meal.strInstructions),
    image: meal.strMealThumb || null,
    source: {
      name: 'TheMealDB',
      url: `https://www.themealdb.com/meal/${meal.idMeal}`,
      original: meal.strSource || null,
    },
    custom: true,
  }
}
