import { useState } from 'react'
import { BASICS, MEALS, PANTRY_EXTRAS, RECIPES } from '../data/recipes.js'
import { extrasToBuy, onHandIds, recipeStatus } from '../lib/recipes.js'

const fuelLabel = (min) => (min === 0 ? 'no cooking' : `~${min} min of fuel`)

// Recipes that use the storage foods on the On Hand tab. Pantry extras
// (salt, oil, spices…) are listed too, with a checklist of the ones you have.
export default function RecipesView({ inventory, pantry, setPantry, goTo }) {
  const [meal, setMeal] = useState('all')
  const [readyOnly, setReadyOnly] = useState(false)
  const [noOven, setNoOven] = useState(false)

  const onHand = onHandIds(inventory)
  const toggleExtra = (id) => setPantry((p) => ({ ...p, [id]: !p[id] }))

  const all = RECIPES.map((r) => ({ recipe: r, status: recipeStatus(r, onHand, pantry) }))
  const shown = all.filter(({ recipe, status }) =>
    (meal === 'all' || recipe.meal === meal) &&
    (!readyOnly || status.ready) &&
    (!noOven || !recipe.oven))
  const readyCount = all.filter((x) => x.status.ready).length
  const toBuy = extrasToBuy(RECIPES, pantry).slice(0, 8)

  return (
    <>
      <section className="card">
        <h3>Recipes</h3>
        <p className="hint">
          Meals made from your stored food. Each one also lists the everyday extras it uses — salt,
          oil, spices — since you may already have them. Tick what's in your kitchen below and the
          recipes will show what you can make right now.
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
            <div className="v">{RECIPES.length}</div>
            <div className="s">using your stored food</div>
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
        </div>
        <label className="check">
          <input type="checkbox" checked={readyOnly} onChange={(e) => setReadyOnly(e.target.checked)} />
          Only what I can make now
        </label>
        <label className="check">
          <input type="checkbox" checked={noOven} onChange={(e) => setNoOven(e.target.checked)} />
          No oven needed (stovetop or camp stove)
        </label>
      </section>

      {shown.length === 0 && (
        <section className="card"><p className="hint">No recipes match — try ticking more pantry extras or clearing a filter.</p></section>
      )}

      {shown.map(({ recipe: r, status: s }) => (
        <details key={r.id} className="card recipe">
          <summary>
            <span className="recipe-name">{r.name}</span>
            <span className="recipe-meta">
              {r.servesLabel || `serves ${r.serves}`} · {fuelLabel(r.fuelMinutes)}
              {r.oven && ' · oven'}
              {r.needs && ` · needs ${r.needs}`}
            </span>
            <span className={`badge ${s.ready ? 'badge-ok' : 'badge-muted'}`}>
              {s.ready
                ? 'Ready'
                : `Missing ${s.missingStorage.length + s.missingExtras.length}`}
            </span>
          </summary>

          <div className="recipe-cols">
            <div>
              <h4>From your storage</h4>
              <ul className="ingredients">
                {s.storage.map((i) => (
                  <li key={i.id} className={i.have ? 'have' : 'need'}>
                    <span className="mark">{i.have ? '✓' : '○'}</span>
                    <span><strong>{i.name}</strong> — {i.amount}{i.optional && ' (optional)'}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Pantry extras</h4>
              <ul className="ingredients">
                {s.extras.map((i) => (
                  <li key={i.id} className={i.have ? 'have' : 'need'}>
                    <span className="mark">{i.have ? '✓' : '○'}</span>
                    <span><strong>{i.name}</strong> — {i.amount}{i.optional && ' (optional)'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <h4>Steps</h4>
          <ol className="steps">
            {r.steps.map((step, n) => <li key={n}>{step}</li>)}
          </ol>
          {r.tip && <p className="hint">{r.tip}</p>}
        </details>
      ))}

      <section className="card">
        <h3>Cooking the basics</h3>
        {BASICS.map((b) => (
          <p key={b.title} style={{ fontSize: '0.9rem' }}><strong>{b.title}.</strong> {b.text}</p>
        ))}
      </section>
    </>
  )
}
