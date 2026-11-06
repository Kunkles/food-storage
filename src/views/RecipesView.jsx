import { useState } from 'react'
import { BASICS, MEALS, PANTRY_EXTRAS } from '../data/recipes.js'
import { extrasToBuy, onHandIds, recipeStatus } from '../lib/recipes.js'
import RecipeBody from '../components/RecipeBody.jsx'
import DietIssues from '../components/DietIssues.jsx'
import { avoidedBy, dietIssues, personRestrictions, recipeItems } from '../lib/diets.js'
import RecipeEditor from '../components/RecipeEditor.jsx'
import OnlineRecipes from '../components/OnlineRecipes.jsx'

const fuelLabel = (min) => (min == null ? null : min === 0 ? 'no cooking' : `~${min} min of fuel`)

// Recipes that use the storage foods on the On Hand tab: the built-in ones,
// your own, and ones saved from online. Pantry extras (salt, oil, spices…)
// are listed too, with a checklist of the ones you have.
export default function RecipesView({ recipes, people, inventory, pantry, setPantry, onSaveRecipe, onRemoveRecipe, online, goTo }) {
  const [meal, setMeal] = useState('all')
  const [readyOnly, setReadyOnly] = useState(false)
  const [noOven, setNoOven] = useState(false)
  const [safeOnly, setSafeOnly] = useState(false)
  const [editing, setEditing] = useState(null) // recipe id, or 'new'
  const [openIds, setOpenIds] = useState(() => new Set())

  const onHand = onHandIds(inventory)
  const toggleExtra = (id) => setPantry((p) => ({ ...p, [id]: !p[id] }))
  const setOpen = (id, open) => setOpenIds((s) => {
    const next = new Set(s)
    if (open) next.add(id)
    else next.delete(id)
    return next
  })

  const anyRestrictions = people.some((p) => personRestrictions(p).length > 0)
  const all = recipes.map((r) => {
    const status = recipeStatus(r, onHand, pantry)
    const issues = dietIssues(recipeItems(status), people)
    return { recipe: r, status, issues, avoided: avoidedBy(issues) }
  })
  const shown = all.filter(({ recipe, status, avoided }) =>
    (meal === 'all' || (meal === 'mine' ? recipe.custom || recipe.edited : recipe.meal === meal)) &&
    (!readyOnly || status.ready) &&
    (!noOven || !recipe.oven) &&
    (!safeOnly || avoided.length === 0))
  const readyCount = all.filter((x) => x.status.ready).length
  const mineCount = recipes.filter((r) => r.custom).length
  const toBuy = extrasToBuy(recipes, pantry).slice(0, 8)
  const savedIds = new Set(recipes.map((r) => r.id))

  const save = (recipe) => {
    onSaveRecipe(recipe)
    setEditing(null)
    setOpen(recipe.id, true)
  }
  const remove = (r) => {
    const msg = r.edited
      ? `Put "${r.name}" back the way it came? Your changes to it will be lost.`
      : `Delete "${r.name}" from your recipes?`
    if (window.confirm(msg)) onRemoveRecipe(r.id)
  }

  return (
    <>
      <section className="card">
        <h3>Recipes</h3>
        <p className="hint">
          Meals made from your stored food. Each one also lists the everyday extras it uses — salt,
          oil, spices — since you may already have them. Tick what's in your kitchen below and the
          recipes will show what you can make right now. Add your own, change any of them, or find
          more online.
        </p>
        {onHand.size === 0 && (
          <p className="hint sync-error">
            Nothing from your storage order is on hand yet in this browser —{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); goTo('onhand') }}>add it on the On Hand tab</a>.
          </p>
        )}
        <div className="stat-grid">
          <div className="stat">
            <div className="k">Recipes</div>
            <div className="v">{recipes.length}</div>
            <div className="s">{mineCount ? `${mineCount} of them yours` : 'using your stored food'}</div>
          </div>
          <div className="stat">
            <div className="k">Ready to make</div>
            <div className="v">{readyCount}</div>
            <div className="s">with what you have now</div>
          </div>
          <div className="stat">
            <div className="k">Extras ticked</div>
            <div className="v">{PANTRY_EXTRAS.filter((e) => pantry[e.id]).length} / {PANTRY_EXTRAS.length}</div>
            <div className="s">pantry items you have</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Your pantry extras</h3>
        <p className="hint">Tick the ones you have. These don't come from the storage order but most recipes need a few.</p>
        <div className="pantry-grid">
          {PANTRY_EXTRAS.map((e) => (
            <label key={e.id} className="check">
              <input type="checkbox" checked={!!pantry[e.id]} onChange={() => toggleExtra(e.id)} />
              {e.name}
            </label>
          ))}
        </div>
        {toBuy.length > 0 && (
          <p className="hint" style={{ marginTop: 12 }}>
            <strong>Worth stocking up on first:</strong>{' '}
            {toBuy.map((x) => `${x.name} (${x.recipesUsing} recipe${x.recipesUsing === 1 ? '' : 's'})`).join(', ')}.
            {!(pantry.salt && pantry.oil && pantry['baking-powder']) &&
              ' Salt, oil and baking powder store well and turn flour, beans and wheat into real meals.'}
          </p>
        )}
      </section>

      <section className="card no-print">
        <div className="toolbar">
          <button className={meal === 'all' ? 'btn btn-primary' : 'btn'} onClick={() => setMeal('all')}>All</button>
          {MEALS.map((m) => (
            <button key={m.id} className={meal === m.id ? 'btn btn-primary' : 'btn'} onClick={() => setMeal(m.id)}>
              {m.label}
            </button>
          ))}
          <button className={meal === 'mine' ? 'btn btn-primary' : 'btn'} onClick={() => setMeal('mine')}>Mine</button>
          <span style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => setEditing('new')}>+ New recipe</button>
        </div>
        <label className="check">
          <input type="checkbox" checked={readyOnly} onChange={(e) => setReadyOnly(e.target.checked)} />
          Only what I can make now
        </label>
        <label className="check">
          <input type="checkbox" checked={noOven} onChange={(e) => setNoOven(e.target.checked)} />
          No oven needed (stovetop or camp stove)
        </label>
        {anyRestrictions && (
          <label className="check">
            <input type="checkbox" checked={safeOnly} onChange={(e) => setSafeOnly(e.target.checked)} />
            Safe for everyone's allergies and diets
          </label>
        )}
      </section>

      {editing === 'new' && (
        <section className="card">
          <h3>New recipe</h3>
          <RecipeEditor onSave={save} onCancel={() => setEditing(null)} />
        </section>
      )}

      {shown.length === 0 && (
        <section className="card">
          <p className="hint">
            {meal === 'mine'
              ? 'No recipes of your own yet — add one with + New recipe, or save one from the online search below.'
              : 'No recipes match — try ticking more pantry extras or clearing a filter.'}
          </p>
        </section>
      )}

      {shown.map(({ recipe: r, status: s, issues, avoided }) => (
        <details
          key={r.id} className="card recipe"
          open={openIds.has(r.id) || editing === r.id}
          onToggle={(e) => setOpen(r.id, e.currentTarget.open)}
        >
          <summary>
            <span className="recipe-name">{r.name}</span>
            <span className="recipe-meta">
              {[
                r.servesLabel || (r.serves ? `serves ${r.serves}` : null),
                fuelLabel(r.fuelMinutes),
                r.oven && 'oven',
                r.needs && `needs ${r.needs}`,
                r.custom && (r.source ? 'saved from online' : 'yours'),
                r.edited && 'changed by you',
              ].filter(Boolean).join(' · ')}
            </span>
            {avoided.length > 0 && <span className="badge badge-danger">Not for {avoided.join(', ')}</span>}
            {avoided.length === 0 && issues.length > 0 && <span className="badge badge-warn">Adjust for diets</span>}
            <span className={`badge ${s.ready ? 'badge-ok' : 'badge-muted'}`}>
              {s.ready ? 'Ready' : `Missing ${s.missingStorage.length + s.missingExtras.length}`}
            </span>
          </summary>

          {editing === r.id ? (
            <RecipeEditor recipe={r} onSave={save} onCancel={() => setEditing(null)} />
          ) : (
            <>
              <DietIssues issues={issues} />
              <RecipeBody recipe={r} status={s} />
              <div className="toolbar no-print" style={{ marginTop: 10 }}>
                <button className="btn" onClick={() => setEditing(r.id)}>Edit</button>
                {(r.custom || r.edited) && (
                  <button className="btn btn-ghost" onClick={() => remove(r)}>
                    {r.edited ? 'Undo my changes' : 'Delete'}
                  </button>
                )}
              </div>
            </>
          )}
        </details>
      ))}

      <OnlineRecipes
        onHand={onHand} pantry={pantry} people={people} savedIds={savedIds} online={online}
        onSave={(recipe) => onSaveRecipe(recipe)}
      />

      <section className="card">
        <h3>Cooking the basics</h3>
        {BASICS.map((b) => (
          <p key={b.title} style={{ fontSize: '0.9rem' }}><strong>{b.title}.</strong> {b.text}</p>
        ))}
      </section>
    </>
  )
}
