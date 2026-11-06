import { describe, it, expect } from 'vitest'
import { avoidedBy, checkText, describePerson, dietIssues, recipeItems } from '../src/lib/diets.js'
import { RESTRICTIONS } from '../src/data/diets.js'
import { RECIPES } from '../src/data/recipes.js'
import { recipeStatus } from '../src/lib/recipes.js'
import { makePerson } from '../src/data/ageTiers.js'

const r = (id) => RESTRICTIONS.find((x) => x.id === id)
const hits = (id, text) => !!checkText(r(id), text)
const status = (id) => recipeStatus(RECIPES.find((x) => x.id === id), new Set(), {})
const issuesFor = (recipeId, people) => dietIssues(recipeItems(status(recipeId)), people)

describe('spotting ingredients', () => {
  it('catches what each allergy covers', () => {
    expect(hits('wheat', 'White flour')).toBe(true)
    expect(hits('wheat', 'Spaghetti bites')).toBe(true)
    expect(hits('wheat', 'Soy sauce')).toBe(true)
    expect(hits('wheat', 'Rice flour')).toBe(false)
    expect(hits('milk', 'Nonfat dry milk')).toBe(true)
    expect(hits('milk', 'Butter (or more oil)')).toBe(true)
    expect(hits('milk', 'Peanut butter')).toBe(false)
    expect(hits('milk', 'Coconut milk')).toBe(false)
    expect(hits('peanuts', 'Peanut butter')).toBe(true)
    expect(hits('soy', 'Soy sauce')).toBe(true)
    expect(hits('fish', 'Canned tuna')).toBe(true)
    expect(hits('sesame', 'Tahini')).toBe(true)
  })
  it('catches what each diet covers', () => {
    expect(hits('vegetarian', 'Canned chicken, beef or ham')).toBe(true)
    expect(hits('vegetarian', 'Black beans')).toBe(false)
    expect(checkText(r('vegetarian'), 'Chicken or vegetable bouillon')).toMatchObject({ caution: true })
    expect(hits('vegan', 'Honey')).toBe(true)
    expect(hits('no-pork', 'Bacon')).toBe(true)
    expect(checkText(r('gluten-free'), 'Regular oats')).toMatchObject({ caution: true })
    expect(hits('low-salt', 'Salt')).toBe(true)
    expect(hits('low-sugar', 'Sugar-free syrup')).toBe(false)
  })
})

describe('recipes and people', () => {
  const sam = { ...makePerson({ name: 'Sam' }), allergies: ['wheat'] }
  const ann = { ...makePerson({ name: 'Ann' }), diets: ['vegan'] }
  const bob = { ...makePerson({ name: 'Bob' }), diets: ['low-salt'] }

  it('says who a dish is not for', () => {
    const issues = issuesFor('pancakes', [sam, ann, bob])
    expect(avoidedBy(issues).sort()).toEqual(['Ann', 'Sam'])
    expect(issues.find((i) => i.restriction.id === 'low-salt').level).toBe('limit')
  })
  it('says when only optional things need leaving out', () => {
    // Pinto chili: canned meat is optional, so a vegetarian can still have it.
    const veg = { ...makePerson({ name: 'Vi' }), diets: ['vegetarian'] }
    const issues = issuesFor('pinto-chili', [veg])
    expect(issues[0].level).toBe('leave-out')
    expect(avoidedBy(issues)).toEqual([])
  })
  it('has nothing to say for people without restrictions', () => {
    expect(issuesFor('pancakes', [makePerson({ name: 'Al' })])).toEqual([])
  })
  it('works for people saved before allergies existed', () => {
    const old = makePerson({ name: 'Old' })
    delete old.allergies
    delete old.diets
    expect(issuesFor('pancakes', [old])).toEqual([])
    expect(describePerson(old)).toEqual([])
  })
  it('describes a person', () => {
    expect(describePerson({ ...sam, diets: ['vegetarian'] })).toEqual(['wheat allergy', 'vegetarian'])
  })
})
