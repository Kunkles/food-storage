import { makePerson, tierForAge } from '../data/ageTiers.js'

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
                  <span>Diet / notes</span>
                  <input
                    type="text"
                    placeholder="e.g. diabetic, gluten-free, meds"
                    value={p.restrictions}
                    onChange={(e) => update(p.id, { restrictions: e.target.value })}
                  />
                </label>
                <button className="btn btn-ghost" onClick={() => remove(p.id)}>Remove</button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
