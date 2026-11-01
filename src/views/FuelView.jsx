import { COOKING_STYLES, FUEL_CONTAINERS } from '../data/fuel.js'
import { fuelSummary } from '../lib/fuel.js'
import { fmtNum } from '../lib/format.js'

const fmtLb = (n) => `${(Number(n) || 0).toFixed(n < 10 ? 1 : 0)} lb`
const fmtDays = (d) => {
  const days = Math.floor(d)
  return days < 60 ? `${days} days` : `${fmtNum(days)} days (≈ ${(d / 30.4).toFixed(1)} months)`
}

// Cooking fuel: how fast the household burns propane, how long what's stored
// lasts, and what to buy to cover the plan and the stored food.
export default function FuelView({ people, days, foodDays, fuel, setFuel }) {
  const s = fuelSummary(fuel, people, days, foodDays)
  const set = (patch) => setFuel((f) => ({ ...f, ...patch }))
  const setCount = (id, value) =>
    setFuel((f) => ({ ...f, containers: { ...f.containers, [id]: Math.max(0, Number(value) || 0) } }))

  return (
    <>
      <section className="card">
        <h3>Cooking fuel</h3>
        <p className="hint">
          Rice, beans and wheat need a lot of cooking, so a power outage is also a fuel problem.
          This works out how much propane your household burns a day and how long what you've
          stored lasts.
        </p>
        <div className="stat-grid">
          <div className="stat">
            <div className="k">Fuel on hand</div>
            <div className="v">{fmtLb(s.onHandLb)}</div>
            <div className="s">lasts {fmtDays(s.daysCovered)}</div>
          </div>
          <div className="stat">
            <div className="k">Burn rate</div>
            <div className="v">{fmtLb(s.lbPerDay)}/day</div>
            <div className="s">{fmtNum(s.btuPerDay)} BTU · {s.minutesPerDay} burner-min/day</div>
          </div>
          <div className="stat">
            <div className="k">For your {days}-day plan</div>
            <div className="v">{fmtLb(s.neededLb)}</div>
            <div className="s">
              {s.shortfallLb > 0
                ? `short ${fmtLb(s.shortfallLb)} — buy ${s.tanks20ToBuy} × 20 lb tank${s.tanks20ToBuy === 1 ? '' : 's'}`
                : 'covered by what you have'}
            </div>
          </div>
          <div className="stat">
            <div className="k">For all your stored food</div>
            <div className="v">{s.foodDays > 0 ? fmtLb(s.neededLbForFood) : '—'}</div>
            <div className="s">
              {s.foodDays > 0
                ? `${fmtDays(s.foodDays)} of food at emergency rations ≈ ${Math.ceil(s.neededLbForFood / 20)} × 20 lb tanks`
                : 'add food on the On Hand tab'}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>How you'll cook</h3>
        <div className="journal-form">
          <label className="grow">
            <span>Cooking style</span>
            <select
              value={fuel.style}
              onChange={(e) => set({ style: e.target.value, minutesPerDay: null })}
            >
              {COOKING_STYLES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="num">
            <span>Burner min/day</span>
            <input
              type="number" min="0" step="5" value={s.minutesPerDay}
              onChange={(e) => set({ minutesPerDay: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
          <label className="num">
            <span>Stove BTU/hr</span>
            <input
              type="number" min="0" step="500" value={fuel.stoveBtu}
              onChange={(e) => set({ stoveBtu: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
          <label className="num">
            <span>Avg flame %</span>
            <input
              type="number" min="0" max="100" step="5" value={fuel.flamePct}
              onChange={(e) => set({ flamePct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
            />
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox" checked={fuel.boilWater}
            onChange={(e) => set({ boilWater: e.target.checked })}
          />
          Also boil all drinking water (if filters run out)
        </label>
        <p className="hint">
          Burner minutes are for up to 4 people and scale up for bigger households
          {fuel.minutesPerDay != null && ' — you\'ve set your own, pick a style again to go back to the estimate'}.
          Stove BTU is printed on the stove (most two-burner camp stoves are 10,000 per burner).
          A pressure cooker roughly halves the fuel for beans and wheat.
        </p>
      </section>

      <section className="card">
        <h3>Fuel you have</h3>
        <table className="grid">
          <thead>
            <tr>
              <th>Container</th>
              <th>Count</th>
              <th>Fuel</th>
            </tr>
          </thead>
          <tbody>
            {FUEL_CONTAINERS.map((t) => {
              const n = Number(fuel.containers[t.id]) || 0
              return (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>
                    <input
                      className="cellnum" type="number" min="0" step="0.5" value={n}
                      onChange={(e) => setCount(t.id, e.target.value)}
                    />
                  </td>
                  <td>{n > 0 ? fmtLb(n * t.lb) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="hint">Use decimals for tanks that aren't full — 0.5 for a half-full tank.</p>
      </section>

      <section className="card">
        <h3>Storing propane safely</h3>
        <ul className="tips">
          <li><strong>Never cook or heat with propane indoors</strong>, in a garage or in a tent — it makes carbon monoxide. Put a battery CO detector near where you sleep.</li>
          <li>Store tanks <strong>outside, upright</strong>, in shade and away from doors and windows — not in the house or an attached garage.</li>
          <li>Tanks are good for <strong>12 years from the date stamped on the collar</strong>, then need requalifying before anyone will fill them. Check yours.</li>
          <li>Propane doesn't go bad, so stored tanks don't need rotating — but check valves and hoses for leaks once a year with soapy water.</li>
          <li>A 20 lb tank runs a camp stove with an adapter hose, which is much cheaper than 1 lb cylinders.</li>
        </ul>
      </section>
    </>
  )
}
