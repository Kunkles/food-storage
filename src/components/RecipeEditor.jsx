import { useState } from 'react'
import { MEALS } from '../data/recipes.js'
import { ingredientsToText, textToIngredients } from '../lib/ingredientMatch.js'

const blank = { name: '', meal: 'main', serves: 4, fuelMinutes: '', oven: false, storage: [], extras: [], others: [], steps: [], tip: '' }

// Add a recipe or change one. Ingredients are typed one per line; storage
// foods and pantry extras are picked out automatically when it's saved.
export default function RecipeEditor({ recipe, onSave, onCancel }) {
  const start = { ...blank, ...recipe }
  const [form, setForm] = useState({
    ...start,
    fuelMinutes: start.fuelMinutes ?? '',
    serves: start.serves ?? '',
    ingredients: ingredientsToText(start),
    steps: (start.steps || []).join('\n'),
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const onSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const { ingredients, ...rest } = form
    onSave({
      ...rest,
      id: recipe?.id || `mine-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: form.name.trim(),
      serves: form.serves === '' ? null : Math.max(1, Number(form.serves) || 1),
      fuelMinutes: form.fuelMinutes === '' ? null : Math.max(0, Number(form.fuelMinutes) || 0),
      ...textToIngredients(ingredients),
      steps: form.steps.split('\n').map((s) => s.trim()).filter(Boolean),
      tip: form.tip.trim(),
    })
  }

  return (
    <form className="recipe-editor" onSubmit={onSubmit}>
      <div className="journal-form">
        <label className="grow">
          <span>Recipe name</span>
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} required />
        </label>
        <label>
          <span>Kind</span>
          <select value={form.meal} onChange={(e) => set({ meal: e.target.value })}>
            {MEALS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <label className="num">
          <span>Serves</span>
          <input type="number" min="1" value={form.serves} onChange={(e) => set({ serves: e.target.value })} />
        </label>
        <label className="num">
          <span>Fuel min</span>
          <input type="number" min="0" step="5" value={form.fuelMinutes} placeholder="?" onChange={(e) => set({ fuelMinutes: e.target.value })} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={!!form.oven} onChange={(e) => set({ oven: e.target.checked })} />
        Needs an oven
      </label>

      <label className="block">
        <span>Ingredients — one per line</span>
        <textarea
          rows={Math.max(6, form.ingredients.split('\n').length + 1)} value={form.ingredients}
          placeholder={'White rice: 1 cup\nBlack beans: 1 cup dry\n2 tbsp olive oil\nBay leaves: 1 (optional)'}
          onChange={(e) => set({ ingredients: e.target.value })}
        />
      </label>
      <p className="hint">
        Write "name: amount", or just the line as a recipe has it. Your stored foods and pantry
        extras are spotted automatically (onion → Onions, olive oil → Cooking oil) so the recipe can
        show what you have. Add "(optional)" at the end of anything it can do without.
      </p>

      <label className="block">
        <span>Steps — one per line</span>
        <textarea rows={Math.max(5, form.steps.split('\n').length + 1)} value={form.steps} onChange={(e) => set({ steps: e.target.value })} />
      </label>
      <label className="block">
        <span>Tip (optional)</span>
        <input value={form.tip || ''} onChange={(e) => set({ tip: e.target.value })} />
      </label>

      <div className="toolbar" style={{ marginTop: 12 }}>
        <button className="btn btn-primary" type="submit">Save recipe</button>
        <button className="btn" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
