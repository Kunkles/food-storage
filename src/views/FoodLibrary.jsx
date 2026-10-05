import LibraryTable from '../components/LibraryTable.jsx'

export default function FoodLibrary({ library, setLibrary }) {
  return (
    <>
      <LibraryTable library={library} onChange={setLibrary} />
      <section className="card">
        <h3>How to use this library</h3>
        <ul className="hint" style={{ lineHeight: 1.7 }}>
          <li>
            <strong>No-cook</strong> items can be eaten without a stove — vital during power
            outages.
          </li>
          <li>
            <strong>Staples</strong> are rotated through your normal meals (and form your longer
            inflation hedge).
          </li>
          <li>
            <span className="exposed">⚠</span> marks items whose prices move with El Niño and
            import shocks (grains, sugar, oil, coffee, cocoa, eggs, rice).
          </li>
          <li>
            Rates (per person per day) determine how many are auto-added — adjust them to how
            much your family actually eats.
          </li>
        </ul>
      </section>
    </>
  )
}
