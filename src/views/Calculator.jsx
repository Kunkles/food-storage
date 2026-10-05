import PeopleEditor from '../components/PeopleEditor.jsx'
import PlanTable from '../components/PlanTable.jsx'

export default function Calculator({
  people, setPeople, days, setDays,
  plan, library, sortMode,
  onItemChange, onRemove, onAdd, onScale, onToggleSort,
}) {
  return (
    <>
      <section className="card">
        <div className="card-head">
          <h3>Duration</h3>
        </div>
        <label className="num" style={{ maxWidth: 220 }}>
          <span>How many days of food do you want to cover?</span>
          <input
            type="number"
            min="3"
            max="60"
            value={days}
            onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <p className="hint">
          14 days (2 weeks) is a solid target for local isolation; stretch toward 30 for a
          larger buffer. Adjust to your area's typical recovery time.
        </p>
      </section>

      <PeopleEditor people={people} onChange={setPeople} />

      <PlanTable
        plan={plan}
        library={library}
        onItemChange={onItemChange}
        onRemove={onRemove}
        onAdd={onAdd}
        onScale={onScale}
        sortMode={sortMode}
        onToggleSort={onToggleSort}
      />
    </>
  )
}
