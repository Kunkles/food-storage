import { COOKING_STYLES, FUEL_CONTAINERS, STOVES, WOOD_AMOUNTS, WOOD_STOVES } from '../data/fuel.js'
import { fuelSummary } from '../lib/fuel.js'
import { fmtNum } from '../lib/format.js'

const fmtLb = (n) => `${(Number(n) || 0).toFixed(n < 10 ? 1 : 0)} lb`
const plural = (n, word) => `${n} × ${word}${n === 1 ? '' : 's'}`
const FUEL_GROUPS = [
  { kind: 'propane', title: 'Propane' },
  { kind: 'butane', title: 'Butane and isobutane canisters' },
]
// Wood in the units people buy it: cords, bundles or pounds.
const fmtWood = (lb) =>
  lb >= 900 ? `${(lb / 3000).toFixed(1)} cord${lb === 3000 ? "" : "s"} (${Math.round(lb).toLocaleString()} lb)`
    : lb >= 40 ? `${Math.ceil(lb / 20)} bundles (${Math.round(lb)} lb)`
      : `${(Number(lb) || 0).toFixed(1)} lb`
const fmtDays = (d) => {
  const days = Math.floor(d)
  return days < 60 ? `${days} days` : `${fmtNum(days)} days (≈ ${(d / 30.4).toFixed(1)} months)`
}

// Cooking fuel: how fast the household burns propane, butane or wood, how
// long what's stored lasts, and what to buy to cover the plan and the stored food.
export default function FuelView({ people, days, foodDays, fuel, setFuel }) {
  const s = fuelSummary(fuel, people, days, foodDays)
  const set = (patch) => setFuel((f) => ({ ...f, ...patch }))
  const hasButane = s.butane.count > 0 || s.stove.id !== 'propane'
  const hasWoodStove = s.wood.stove.id !== 'none'
  const hasWood = hasWoodStove || WOOD_AMOUNTS.some((t) => Number(fuel.wood?.[t.id]) > 0)
  const setCount = (id, value) =>
    setFuel((f) => ({ ...f, containers: { ...f.containers, [id]: Math.max(0, Number(value) || 0) } }))
  const setWood = (id, value) =>
    setFuel((f) => ({ ...f, wood: { ...f.wood, [id]: Math.max(0, Number(value) || 0) } }))
  // What to buy to cover some days short: gas, or wood if there's a wood stove.
  const buyText = (count, woodLb) =>
    `buy ${plural(count, s.buyLabel)}${hasWoodStove && woodLb > 0 ? `, or ${fmtWood(woodLb)} of wood` : ''}`

  return (
    <>
      <section className="card">
        <h3>Cooking fuel</h3>
        <p className="hint">
          Rice, beans and wheat need a lot of cooking, so a power outage is also a fuel problem.
          This works out how much fuel your household burns a day and how long the propane,
          butane and wood you've stored lasts.
        </p>
        <div className="stat-grid">
          <div className="stat">
            <div className="k">Fuel on hand lasts</div>
            <div className="v">{fmtDays(s.daysCovered)}</div>
            <div className="s">
              {fmtLb(s.onHandLb)} gas ({Math.floor(s.gasDays)} days)
              {s.butane.count > 0 && (
                <>: {fmtLb(s.propane.lb)} propane + {s.butane.count} butane canister{s.butane.count === 1 ? '' : 's'}</>
              )}
              {hasWoodStove && <> · {fmtWood(s.wood.onHandLb)} of wood ({Math.floor(s.wood.days)} days)</>}
            </div>
          </div>
          <div className="stat">
            <div className="k">{hasWoodStove ? 'Gas burn rate' : 'Burn rate'}</div>
            <div className="v">{fmtLb(s.lbPerDay)}/day</div>
            <div className="s">
              {s.stove.id !== 'propane' && s.containersPerDay > 0 && (
                <>≈ {s.containersPerDay.toFixed(1)} × {s.buyLabel} a day · </>
              )}
              {fmtNum(s.btuPerDay)} BTU · {s.minutesPerDay} burner-min/day
            </div>
          </div>
          {hasWoodStove && (
            <div className="stat">
              <div className="k">Wood burn rate</div>
              <div className="v">{fmtLb(s.wood.lbPerDay)}/day</div>
              <div className="s">
                on a {s.wood.stove.label.split(' (')[0].toLowerCase()} · a cord lasts about{' '}
                {fmtDays(3000 / s.wood.lbPerDay)}
              </div>
            </div>
          )}
          <div className="stat">
            <div className="k">For your {days}-day plan</div>
            <div className="v">{s.shortDays > 0 ? `${Math.ceil(s.shortDays)} days short` : 'Covered'}</div>
            <div className="s">
              {s.shortDays > 0 ? buyText(s.buyCount, s.wood.neededLb) : 'by the fuel you have'}
            </div>
          </div>
          <div className="stat">
            <div className="k">For all your stored food</div>
            <div className="v">
              {s.foodDays <= 0 ? '—' : s.shortDaysFood > 0 ? `${Math.ceil(s.shortDaysFood)} days short` : 'Covered'}
            </div>
            <div className="s">
              {s.foodDays <= 0
                ? 'add food on the On Hand tab'
                : `${fmtDays(s.foodDays)} of food at emergency rations${s.shortDaysFood > 0 ? ` — ${buyText(s.buyCountForFood, s.wood.neededLbForFood)}` : ''}`}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>How you'll cook</h3>
        <div className="journal-form">
          <label className="grow">
            <span>Stove</span>
            <select
              value={s.stove.id}
              onChange={(e) => {
                const stove = STOVES.find((st) => st.id === e.target.value)
                set({ stove: stove.id, stoveBtu: stove.btu })
              }}
            >
              {STOVES.map((st) => (
                <option key={st.id} value={st.id}>{st.label}</option>
              ))}
            </select>
          </label>
          <label className="grow">
            <span>Wood stove</span>
            <select value={s.wood.stove.id} onChange={(e) => set({ woodStove: e.target.value })}>
              {WOOD_STOVES.map((w) => (
                <option key={w.id} value={w.id}>{w.label}</option>
              ))}
            </select>
          </label>
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
          Stove BTU is printed on the stove or its box: most two-burner propane camp stoves are
          10,000 per burner, butane tabletop stoves 7,600–15,000, and backpacking stoves about 8,000.
          Picking a stove fills in a typical number — change it to match yours.
          A pressure cooker roughly halves the fuel for beans and wheat.
          {hasWoodStove && ' With a wood stove, the days from gas and wood add together — use one, then the other. Wood gets less of its heat into the pot, so the same meals take several pounds of wood a day.'}
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
          {FUEL_GROUPS.map((g) => (
          <tbody key={g.kind}>
            <tr className="group-row"><td colSpan={3}>{g.title}</td></tr>
            {FUEL_CONTAINERS.filter((t) => t.fuel === g.kind).map((t) => {
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
          ))}
          <tbody>
            <tr className="group-row"><td colSpan={3}>Wood</td></tr>
            {WOOD_AMOUNTS.map((t) => {
              const n = Number(fuel.wood?.[t.id]) || 0
              return (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>
                    <input
                      className="cellnum" type="number" min="0" step={t.lb >= 1000 ? 0.25 : 1} value={n}
                      onChange={(e) => setWood(t.id, e.target.value)}
                    />
                  </td>
                  <td>{n > 0 ? `${fmtNum(n * t.lb)} lb` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="hint">
          Use decimals for tanks that aren't full — 0.5 for a half-full tank. Butane and isobutane
          hold about as much heat per pound as propane, so it's all counted as pounds of fuel.
          Wood weights are rough: a cord of seasoned hardwood is 2,500–4,000 lb, so 3,000 is used.
        </p>
        {hasWood && !hasWoodStove && (
          <p className="hint sync-error">Pick a wood stove under "How you'll cook" to count your wood.</p>
        )}
      </section>

      <section className="card">
        <h3>Storing fuel safely</h3>
        <ul className="tips">
          <li><strong>Never cook or heat with propane indoors</strong>, in a garage or in a tent — it makes carbon monoxide. Put a battery CO detector near where you sleep.</li>
          <li>Store tanks <strong>outside, upright</strong>, in shade and away from doors and windows — not in the house or an attached garage.</li>
          <li>Tanks are good for <strong>12 years from the date stamped on the collar</strong>, then need requalifying before anyone will fill them. Check yours.</li>
          <li>Propane doesn't go bad, so stored tanks don't need rotating — but check valves and hoses for leaks once a year with soapy water.</li>
          <li>A 20 lb tank runs a camp stove with an adapter hose, which is much cheaper than 1 lb cylinders.</li>
        </ul>
        {hasButane && (
          <>
            <h4 style={{ margin: '14px 0 4px' }}>Butane</h4>
            <ul className="tips">
              <li><strong>Butane struggles in the cold.</strong> Below about 40°F the flame gets weak, and near freezing it may not light at all. Keep the canister warm (in a pocket or inside) until you cook. For a winter outage, have propane too. Isobutane backpacking canisters do better, down to about 20°F.</li>
              <li><strong>Some butane tabletop stoves are sold for indoor use</strong> (they say so on the box). Even then, open a window, keep a CO detector nearby, and never use one to heat a room.</li>
              <li><strong>Heat is the danger:</strong> keep canisters below 120°F. Never leave them in a car, in sun or next to a stove, and don't set a big pot that covers the canister on a tabletop stove — trapped heat can make it burst.</li>
              <li>Store canisters upright, in a cool dry place, with the caps on. Kept that way they last for years. Throw out any that are rusted, dented or leaking.</li>
              <li>Don't refill disposable canisters. Click a canister fully into the stove, and take it out when you're done.</li>
              <li>8 oz butane canisters cost less per hour of cooking than small backpacking ones; buy them in packs of 4 or 12.</li>
            </ul>
          </>
        )}
        {hasWood && (
          <>
            <h4 style={{ margin: '14px 0 4px' }}>Wood</h4>
            <ul className="tips">
              <li><strong>Only burn wood indoors in a wood stove or fireplace with a working chimney.</strong> Never bring a rocket stove, grill or fire pit inside. Keep a CO detector near where you sleep.</li>
              <li><strong>Have the chimney inspected and swept every year</strong>, before you need it. Creosote buildup causes chimney fires.</li>
              <li><strong>Use dry, seasoned wood</strong>: split it and let it dry 6–12 months. Stack it off the ground with only the top covered so air moves through. Wet wood smokes, sputters and wastes most of its heat.</li>
              <li>Keep the woodpile <strong>20–30 ft from the house</strong> to keep termites and pests out, with a few days' worth near the door under cover.</li>
              <li>A rocket stove cooks a meal on a handful of sticks, twigs or scrap lumber you can gather — a cheap backup. Never burn painted or pressure-treated wood.</li>
              <li>Cooking over wood blackens pots. Rub dish soap on the outside first and the soot washes off.</li>
              <li>This is wood for cooking only. Heating a house takes far more — often several cords a winter.</li>
              <li>Check for burn bans before cooking over an open fire, and keep water or a shovel of dirt nearby.</li>
            </ul>
          </>
        )}
      </section>
    </>
  )
}
