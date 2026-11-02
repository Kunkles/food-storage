import { useState } from 'react'
import { BLEACH_STRENGTHS, REFILL_MONTHS, WATER_CONTAINERS } from '../data/water.js'
import { bleachFor, hasRefillable, nextRefill, waterSummary } from '../lib/water.js'
import { fmtGallons, fmtNum } from '../lib/format.js'

const fmtDays = (d) => {
  const days = Math.floor(d)
  return days < 60 ? `${days} days` : `${fmtNum(days)} days (≈ ${(d / 30.4).toFixed(1)} months)`
}

// Teaspoons as a cook would say them: 1 ⅜ tsp, or tablespoons past 3 tsp.
const FRACTIONS = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞']
function fmtTsp(tsp) {
  if (tsp <= 0) return '—'
  if (tsp >= 3) return `${(tsp / 3).toFixed(1)} tbsp`
  const whole = Math.floor(tsp)
  const frac = FRACTIONS[Math.round((tsp - whole) * 8)]
  return `${whole || ''}${whole && frac ? ' ' : ''}${frac} tsp`
}

// Stored water: how much the household needs, how long what's stored lasts,
// what to buy, and how to treat it and keep it clean.
export default function WaterView({
  people, days, foodDays, hygieneWater, setHygieneWater,
  water, setWater, looseGallons, setLooseGallons, inventory,
}) {
  const [bleachGallons, setBleachGallons] = useState(5)
  const [strength, setStrength] = useState(BLEACH_STRENGTHS[1].id)

  const s = waterSummary({ water, looseGallons, people, hygieneWater, days, foodDays })
  const setCount = (id, value) =>
    setWater((w) => ({ ...w, containers: { ...w.containers, [id]: Math.max(0, Number(value) || 0) } }))

  const refillDue = nextRefill(water.lastFilled)
  const overdue = refillDue && refillDue < new Date()
  const bleach = bleachFor(bleachGallons, strength)
  // Filters, bottles and bleach already on the On Hand tab.
  const waterSupplies = inventory.filter(
    (it) => it.category === 'supply' && /water|filter|bleach/i.test(it.name)
  )

  return (
    <>
      <section className="card">
        <h3>Water</h3>
        <p className="hint">
          Plan on about a gallon per person a day for drinking and cooking, plus whatever you
          set aside for washing. You can go weeks without food but only days without water,
          so this matters more than anything else in the kit.
        </p>
        <div className="stat-grid">
          <div className="stat">
            <div className="k">Water on hand</div>
            <div className="v">{fmtGallons(s.onHand)}</div>
            <div className="s">lasts {fmtDays(s.daysCovered)}</div>
          </div>
          <div className="stat">
            <div className="k">Household use</div>
            <div className="v">{fmtGallons(s.perDay)}/day</div>
            <div className="s">
              {fmtGallons(s.drinkPerDay)} drinking + {fmtGallons(s.hygienePerDay)} washing
            </div>
          </div>
          <div className="stat">
            <div className="k">For your {days}-day plan</div>
            <div className="v">{fmtGallons(s.needed)}</div>
            <div className="s">
              {s.shortfall > 0
                ? `short ${fmtGallons(s.shortfall)} — about ${s.casesToBuy} cases of bottles or ${s.jugs5ToBuy} × 5 gal jugs`
                : 'covered by what you have'}
            </div>
          </div>
          <div className="stat">
            <div className="k">To match your stored food</div>
            <div className="v">{s.foodDays > 0 ? fmtGallons(s.neededForFood) : '—'}</div>
            <div className="s">
              {s.foodDays > 0
                ? s.shortfallForFood > 0
                  ? `${fmtDays(s.foodDays)} of food · short ${fmtGallons(s.shortfallForFood)}. Past a few weeks, plan on filtering instead of storing`
                  : `${fmtDays(s.foodDays)} of food · covered`
                : 'add food on the On Hand tab'}
            </div>
          </div>
        </div>
        <label className="check">
          Washing water per person per day (gallons):
          <input
            type="number" step="0.5" min="0" value={hygieneWater} style={{ width: 70 }}
            onChange={(e) => setHygieneWater(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <p className="hint">
          Drinking water comes from each person's age (set on the Calculator). Add more in hot
          weather, for nursing mothers, and for anyone sick.
        </p>
      </section>

      <section className="card">
        <h3>Water you have</h3>
        <table className="grid">
          <thead>
            <tr>
              <th>Container</th>
              <th>Count</th>
              <th>Water</th>
            </tr>
          </thead>
          <tbody>
            {WATER_CONTAINERS.map((t) => {
              const n = Number(water.containers[t.id]) || 0
              return (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>
                    <input
                      className="cellnum" type="number" min="0" step="1" value={n}
                      onChange={(e) => setCount(t.id, e.target.value)}
                    />
                  </td>
                  <td>{n > 0 ? fmtGallons(n * t.gallons) : '—'}</td>
                </tr>
              )
            })}
            <tr>
              <td>Other water (gallons)</td>
              <td>
                <input
                  className="cellnum" type="number" min="0" step="1" value={looseGallons}
                  onChange={(e) => setLooseGallons(Math.max(0, Number(e.target.value) || 0))}
                />
              </td>
              <td>{looseGallons > 0 ? fmtGallons(looseGallons) : '—'}</td>
            </tr>
          </tbody>
        </table>
        <p className="hint">
          Don't count your water heater (40–50 gallons) or a bathtub you'd fill when a storm is
          coming. They're good backups, but you can't count on having them.
        </p>
        {hasRefillable(water.containers) && (
          <div className="journal-form" style={{ marginTop: 12 }}>
            <label>
              <span>Refillable containers last filled</span>
              <input
                type="date" value={water.lastFilled}
                onChange={(e) => setWater((w) => ({ ...w, lastFilled: e.target.value }))}
              />
            </label>
            <p className="hint" style={{ alignSelf: 'end' }}>
              {refillDue ? (
                <>
                  <span className={`badge ${overdue ? 'badge-danger' : 'badge-ok'}`}>
                    {overdue ? 'Due now' : 'Fresh'}
                  </span>{' '}
                  Empty, clean and refill by {refillDue.toLocaleDateString()} (every {REFILL_MONTHS} months).
                </>
              ) : (
                'Enter the date and this will tell you when to refill.'
              )}
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <h3>Bleach for treating water</h3>
        <div className="journal-form">
          <label className="num">
            <span>Gallons</span>
            <input
              type="number" min="0" step="1" value={bleachGallons}
              onChange={(e) => setBleachGallons(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <label className="grow">
            <span>Bleach</span>
            <select value={strength} onChange={(e) => setStrength(e.target.value)}>
              {BLEACH_STRENGTHS.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </label>
        </div>
        <p style={{ fontSize: '1.1rem', margin: '12px 0 4px' }}>
          Add <strong>{fmtNum(bleach.drops)} drops</strong>
          {bleach.drops >= 24 && <> (about <strong>{fmtTsp(bleach.tsp)}</strong>)</>}, stir, and
          wait 30 minutes.
        </p>
        <p className="hint">
          The percentage is on the label. Use plain unscented bleach — not scented, "splash-less"
          or with added cleaners. It should smell slightly of chlorine after 30 minutes; if not,
          add the same dose again and wait 15 more. Bleach weakens over time, so buy a fresh
          bottle every year. From the EPA's emergency drinking water guide.
        </p>
      </section>

      <section className="card">
        <h3>Making water safe to drink</h3>
        <ul className="tips">
          <li><strong>Boiling is the surest way.</strong> Bring it to a full rolling boil for 1 minute (3 minutes above 6,500 ft). Let it cool covered. Pour it back and forth between clean containers to fix the flat taste. This takes fuel — see the Fuel tab.</li>
          <li><strong>Bleach</strong> kills bacteria and viruses but not all parasites (Cryptosporidium survives it). Use the calculator above.</li>
          <li><strong>Filters</strong> like your Redline bottles remove bacteria and parasites, but most don't stop viruses. For water from a river, pond or flood, filter it and then add bleach or boil it.</li>
          <li><strong>Cloudy water:</strong> let it settle, then pour it through a clean cloth, paper towel or coffee filter <em>before</em> treating it. Dirt protects germs from bleach and clogs filters faster.</li>
          <li><strong>Water treatment tablets</strong> (chlorine dioxide, such as Aquatabs or Katadyn Micropur) are light and keep for years. A good backup for a bug-out bag.</li>
          <li><strong>Never drink</strong> water from a waterbed, radiator, pool or hot tub, or floodwater that might have fuel or chemicals in it. Boiling and filters don't remove chemicals.</li>
          <li><strong>When the city says to boil water</strong>, shut off your home's main water valve so bad water doesn't get into your water heater. Know where the valve is now.</li>
        </ul>
        {waterSupplies.length > 0 && (
          <p className="hint" style={{ marginTop: 10 }}>
            You have on hand: {waterSupplies.map((it) => `${it.qty} × ${it.name}`).join(', ')}.
            Check the package for how many gallons each filter is good for.
          </p>
        )}
      </section>

      <section className="card">
        <h3>Cleaning water containers</h3>
        <ul className="tips">
          <li><strong>Use food-grade containers</strong>: blue water barrels and jugs (HDPE, the #2 recycling mark) or store-bought bottles. Don't use milk jugs, which break down and can't be cleaned well, or anything that has held chemicals.</li>
          <li><strong>Wash</strong> with dish soap and hot water, then rinse well.</li>
          <li><strong>Sanitize</strong>: mix 1 teaspoon of unscented bleach in 1 quart of water, pour it in, put the cap on and shake so it wets every inside surface. Let it sit 30 seconds, pour it out, and let the container air-dry or fill it right away. (CDC)</li>
          <li><strong>Barrels</strong>: put in about a gallon of water with 4 teaspoons of bleach (the same strength), roll and tip the barrel so it wets every inside surface, wait a few minutes, then drain it. Clean the bung caps and spigot too.</li>
          <li><strong>Fill</strong> from a tap with a drinking-water-safe hose (the white or blue kind, not a garden hose). City water already has chlorine, so you don't need to add bleach. For well water, add the bleach dose from the calculator above.</li>
          <li><strong>Label</strong> every container with the date you filled it.</li>
        </ul>
      </section>

      <section className="card">
        <h3>How often</h3>
        <table className="grid">
          <thead>
            <tr><th>What</th><th>When</th></tr>
          </thead>
          <tbody>
            <tr><td>Water you filled yourself</td><td>Empty, clean and refill every {REFILL_MONTHS} months</td></tr>
            <tr><td>Store-bought bottled water</td><td>Keep until the date on the label, unopened. Use the oldest first.</td></tr>
            <tr><td>Bleach</td><td>Buy a fresh bottle every year</td></tr>
            <tr><td>Filters</td><td>Replace after the gallons on the package, or sooner if water comes slowly. Keep a spare.</td></tr>
            <tr><td>Barrel caps, spigots and hoses</td><td>Check for cracks and leaks each time you refill</td></tr>
          </tbody>
        </table>
        <p className="hint">
          An easy way to remember: refill stored water when the clocks change in spring and fall.
        </p>
      </section>

      <section className="card">
        <h3>Storing water</h3>
        <ul className="tips">
          <li>Keep it <strong>cool and dark</strong>. Sunlight grows algae and heat breaks down plastic.</li>
          <li>Keep it <strong>away from gasoline, paint, pesticides and cleaners</strong>. Fumes get through plastic and into the water.</li>
          <li>A full 55 gallon barrel weighs about <strong>460 lb</strong>. Put it where it will stay, and get a pump or siphon to get water out.</li>
          <li>Spread water out. Keep some in the house, some in the car, and some somewhere else, so one leak or problem doesn't take all of it.</li>
        </ul>
      </section>
    </>
  )
}
