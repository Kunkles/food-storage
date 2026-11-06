import { makePerson, tierForAge } from '../data/ageTiers.js'
import { ALLERGIES, DIETS } from '../data/diets.js'

// Household roster. Each person's calorie + water targets derive from their
// age tier, but can be overridden by editing the kcal / water fields directly.
// NOTE: changing someone's age re-derives their tier and resets the calorie
// target to that tier's default (water keeps its per-person value).
export default function PeopleEditor({ people, onChange }) {
  const update = (id, patch) =>
    onChange(people.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const add = () => {
    const p = makePerson({ name: `Person ${people.length + 1}`, age: 30 })
    onChange([...people, p])
  }

  const remove = (id) => onChange(people.filter((p) => p.id !== id))
  const toggle = (p, field, id) => {
    const list = p[field] || []
    update(p.id, { [field]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] })
  }

  const onAge = (id, age) => {
    const tier = tierForAge(age)
    update(id, { age: Number(age), tier: tier.id, emergencyKcal: tier.emergencyKcal })
  }

  return (
    <section className="card">
      <div className="card-head">
        <h3>People</h3>
        <button className="btn" onClick={add}>+ Add person</button>
      </div>
      <p className="hint">
        Age sets a tier (infant → senior) which drives the calorie + water targets.
        Tap any allergies or diets and the Recipes and On Hand tabs will flag what doesn't fit.
        Guests who might show up? Just add them here.
      </p>
      {people.length === 0 && <p className="hint">No people yet — add your household.</p>}
      <div className="person-list">
        {people.map((p) => {
          const tier = tierForAge(p.age)
          return (
            <div className="person" key={p.id}>
              <div className="person-row">
                <label>
                  <span>Name</span>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => update(p.id, { name: e.target.value })}
                  />
                </label>
                <label className="num">
                  <span>Age</span>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={p.age}
                    onChange={(e) => onAge(p.id, e.target.value)}
                  />
                </label>
                <span className="tier-chip" title={`${tier.label} defaults`}>
                  {tier.label}
                </span>
              </div>
              <div className="person-row">
                <label className="num">
                  <span>kcal/day</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={p.emergencyKcal}
                    onChange={(e) => update(p.id, { emergencyKcal: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="num">
                  <span>water gal/day</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={p.waterPerDay}
                    onChange={(e) => update(p.id, { waterPerDay: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="grow">
                  <span>Other notes</span>
                  <input
                    type="text"
                    placeholder="e.g. medications, dislikes"
                    value={p.restrictions}
                    onChange={(e) => update(p.id, { restrictions: e.target.value })}
                  />
                </label>
                <button className="btn btn-ghost" onClick={() => remove(p.id)}>Remove</button>
              </div>
              <div className="diet-row">
                <span className="diet-label">Allergies</span>
                <div className="chips">
                  {ALLERGIES.map((a) => (
                    <button
                      key={a.id} type="button" aria-pressed={(p.allergies || []).includes(a.id)}
                      className={(p.allergies || []).includes(a.id) ? 'chip on warn' : 'chip'}
                      onClick={() => toggle(p, 'allergies', a.id)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="diet-row">
                <span className="diet-label">Diet</span>
                <div className="chips">
                  {DIETS.map((d) => (
                    <button
                      key={d.id} type="button" aria-pressed={(p.diets || []).includes(d.id)}
                      className={(p.diets || []).includes(d.id) ? 'chip on' : 'chip'}
                      onClick={() => toggle(p, 'diets', d.id)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
