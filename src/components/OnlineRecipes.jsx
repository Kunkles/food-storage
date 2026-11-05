import { useState } from 'react'
import { SEARCH_FOODS, mealDetails, mealToRecipe, mealsByName, mealsUsingAll } from '../lib/mealdb.js'
import { recipeStatus } from '../lib/recipes.js'
import RecipeBody from './RecipeBody.jsx'

const MAX_RESULTS = 20

// Search TheMealDB for recipes that use your stored foods, ranked by how many
// of them each one uses, and save the ones you like.
export default function OnlineRecipes({ onHand, pantry, savedIds, onSave, online }) {
  const [picked, setPicked] = useState([])
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ status: 'idle', results: [], total: 0, error: null })
  const [openId, setOpenId] = useState(null)

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const search = async (e) => {
    e?.preventDefault()
    if (!picked.length && !query.trim()) return
    setState({ status: 'loading', results: [], total: 0, error: null })
    setOpenId(null)
    try {
      let meals
      let total
      if (picked.length) {
        const short = await mealsUsingAll(picked)
        const q = query.trim().toLowerCase()
        const matching = q ? short.filter((m) => m.strMeal.toLowerCase().includes(q)) : short
        total = matching.length
        meals = (await Promise.all(matching.slice(0, MAX_RESULTS).map((m) => mealDetails(m.idMeal)))).filter(Boolean)
      } else {
        meals = await mealsByName(query)
        total = meals.length
      }
      const results = meals.slice(0, MAX_RESULTS).map((meal) => {
        const recipe = mealToRecipe(meal)
        const status = recipeStatus(recipe, onHand, pantry)
        return { recipe, status, uses: status.storage.length }
      }).sort((a, b) => b.uses - a.uses || a.status.others.length - b.status.others.length)
      setState({ status: 'done', results, total, error: null })
    } catch (err) {
      setState({ status: 'error', results: [], total: 0, error: navigator.onLine === false ? "You're offline — searching needs internet." : err.message || 'Search failed.' })
    }
  }

  return (
    <section className="card no-print">
      <h3>Find more recipes online</h3>
      <p className="hint">
        Pick one or more of your stored foods to find recipes that use all of them, or search by
        name. Results come from TheMealDB, a free recipe site, and the ones using the most of your
        storage come first. Save one and it's yours to change, and it works offline.
      </p>
      {!online && <p className="hint sync-error">You're offline — searching needs internet. Saved recipes still work.</p>}
      <div className="chips">
        {SEARCH_FOODS.map((f) => (
          <button
            key={f.id} type="button"
            className={picked.includes(f.id) ? 'chip on' : 'chip'}
            onClick={() => toggle(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <form className="journal-form" onSubmit={search}>
        <label className="grow">
          <span>Name (optional)</span>
          <input value={query} placeholder="e.g. soup, chili, pancakes" onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={!online || state.status === 'loading' || (!picked.length && !query.trim())}>
          {state.status === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </form>

      {state.status === 'error' && <p className="hint sync-error">{state.error}</p>}
      {state.status === 'done' && (
        <p className="hint">
          {state.total === 0
            ? 'No recipes found — try fewer foods or a different name.'
            : state.total > state.results.length
              ? `${state.total} recipes found; showing ${state.results.length}. Pick another food to narrow it down.`
              : `${state.total} recipe${state.total === 1 ? '' : 's'} found.`}
        </p>
      )}

      <div className="online-results">
        {state.results.map(({ recipe, status, uses }) => {
          const open = openId === recipe.id
          const saved = savedIds.has(recipe.id)
          return (
            <div key={recipe.id} className={open ? 'online-result open' : 'online-result'}>
              <button type="button" className="online-head" onClick={() => setOpenId(open ? null : recipe.id)}>
                {recipe.image && <img src={`${recipe.image}/small`} alt="" loading="lazy" />}
                <span>
                  <strong>{recipe.name}</strong>
                  <span className="recipe-meta">
                    uses {uses} of your stored foods
                    {uses > 0 && ` (${status.storage.map((i) => i.name.toLowerCase()).join(', ')})`}
                    {' · '}{status.others.length} other ingredient{status.others.length === 1 ? '' : 's'}
                  </span>
                </span>
              </button>
              {open && (
                <div className="online-body">
                  <RecipeBody recipe={recipe} status={status} />
                  <div className="toolbar" style={{ marginTop: 10 }}>
                    <button className="btn btn-primary" disabled={saved} onClick={() => onSave(recipe)}>
                      {saved ? '✓ Saved to your recipes' : 'Save to my recipes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
