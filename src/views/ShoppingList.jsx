import { planSummary, itemCost } from '../lib/calc.js'
import { fmtMoney, fmtGallons, fmtNum } from '../lib/format.js'

// A clean, print-oriented shopping list grouped by category.
export default function ShoppingList({ people, days, plan, hygieneWater }) {
  const summary = planSummary(people, days, plan, hygieneWater)
  const noCook = plan.filter((p) => p.category === 'noCook')
  const staples = plan.filter((p) => p.category === 'staple')

  const Group = ({ title, items }) =>
    items.length > 0 && (
      <section className="card">
        <h3>{title}</h3>
        <table className="grid">
          <thead>
            <tr>
              <th>Item</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Est. cost</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.name}</td>
                <td>{it.unit}</td>
                <td>{fmtNum(it.qty)}</td>
                <td>{fmtMoney(itemCost(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )

  return (
    <>
      <section className="card">
        <h3>Shopping List</h3>
        <p className="hint">
          {summary.headCount} people · {days} days · total {fmtMoney(summary.cost)} ·{' '}
          {fmtGallons(summary.water)} water
        </p>
        <button className="btn btn-primary no-print" onClick={() => window.print()}>
          Print this list
        </button>
      </section>

      <Group title="No-cook / no-power foods" items={noCook} />
      <Group title="Staples (cook &amp; rotate)" items={staples} />

      <section className="card">
        <h3>Notes</h3>
        <ul className="hint" style={{ lineHeight: 1.7 }}>
          <li>
            Water: store {fmtGallons(summary.water)} total (drinking/cooking + hygiene).
          </li>
          <li>
            Prices are baseline estimates — swap in what you actually pay at your local
            grocery or the Church food store.
          </li>
          <li>
            Check for the <span className="exposed">⚠</span> items when prices are unusually
            low (they are the most likely to rise with climate-driven supply shocks).
          </li>
          <li>Store in a cool, dry, dark place; keep off bare concrete.</li>
        </ul>
      </section>
    </>
  )
}
