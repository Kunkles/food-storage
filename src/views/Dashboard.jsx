import { planSummary } from '../lib/calc.js'
import { fmtMoney, fmtKcal, fmtGallons } from '../lib/format.js'
import StatBadge from '../components/StatBadge.jsx'

export default function Dashboard({
  people, setPeople, days, setDays,
  hygieneWater, setHygieneWater, plan, onScale, goTo,
}) {
  const summary = planSummary(people, days, plan, hygieneWater)
  const barPct = Math.min(100, Math.round((summary.ratio ?? 0) * 100))

  return (
    <>
      <section className="card">
        <h3>Overview</h3>
        <p className="hint">
          {summary.headCount} people × {days} days &middot; {summary.status === 'ok'
            ? 'meets the calorie target'
            : summary.status === 'warn'
              ? 'slightly under target'
              : 'under-provisioned'}
          <StatBadge status={summary.status} ratio={summary.ratio} />
        </p>

        <div className="bar" title="Calories provided vs. target">
          <i
            className={summary.status !== 'ok' ? summary.status : ''}
            style={{ width: `${barPct}%` }}
          />
        </div>
        <p className="hint">
          {fmtKcal(summary.kcal)} provided · {fmtKcal(summary.target)} target ({barPct}%)
        </p>

        <div className="stat-grid">
          <div className="stat">
            <div className="k">People</div>
            <div className="v">{summary.headCount}</div>
            <div className="s">{people.map((p) => `${p.name} (${p.tier})`).join(', ') || '—'}</div>
          </div>
          <div className="stat">
            <div className="k">Days</div>
            <div className="v">{days}</div>
            <div className="s">
              <input
                type="number" min="3" max="60" value={days}
                onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>
          <div className="stat">
            <div className="k">Total calories</div>
            <div className="v">{Math.round(summary.kcal / 1000)}k</div>
            <div className="s">target {Math.round(summary.target / 1000)}k</div>
          </div>
          <div className="stat">
            <div className="k">Total cost</div>
            <div className="v">{fmtMoney(summary.cost)}</div>
            <div className="s">≈ {fmtMoney(summary.costPerPersonDay)}/person/day</div>
          </div>
          <div className="stat">
            <div className="k">Water</div>
            <div className="v">{fmtGallons(summary.water)}</div>
            <div className="s">
              hygiene/gal/day:
              <input
                type="number" step="0.5" min="0" value={hygieneWater}
                onChange={(e) => setHygieneWater(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          </div>
          <div className="stat">
            <div className="k">Dietary flags</div>
            <div className="v" style={{ fontSize: '0.9rem' }}>
              {people.filter((p) => p.restrictions).map((p) => p.restrictions).join(' · ') || 'none recorded'}
            </div>
            <div className="s">note allergies &amp; meds of visiting guests</div>
          </div>
        </div>

        <div className="toolbar" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" onClick={onScale}>
            Scale plan to exact calorie target
          </button>
          <button className="btn" onClick={() => goTo('calculator')}>
            Open calculator →
          </button>
          <button className="btn" onClick={() => goTo('shoppinglist')}>
            View shopping list →
          </button>
        </div>

        <p className="hint" style={{ marginTop: 12 }}>
          Planning for a {days}-day local disruption (power/road/water outage, typical
          earthquake or flood event). Plan <em>for price and isolation, not absence</em> —
          enough to cook and stay healthy until supply resumes.
        </p>
      </section>
    </>
  )
}
