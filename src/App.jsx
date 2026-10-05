import { useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { makePerson } from './data/ageTiers.js'
import { FOOD_DATABASE } from './data/foodDatabase.js'
import { defaultPlan, planItemFromLibrary, scalePlanToTarget } from './lib/calc.js'
import { addJournalEntry, markRotated, setRotationMonths } from './lib/inflation.js'

import Dashboard from './views/Dashboard.jsx'
import Calculator from './views/Calculator.jsx'
import FoodLibrary from './views/FoodLibrary.jsx'
import ShoppingList from './views/ShoppingList.jsx'
import RotationView from './views/RotationView.jsx'
import JournalView from './views/JournalView.jsx'

const VIEWS = ['dashboard', 'calculator', 'foodlibrary', 'shoppinglist', 'rotation', 'journal']

const VIEW_LABELS = {
  dashboard: 'Dashboard',
  calculator: 'Calculator',
  foodlibrary: 'Food Library',
  shoppinglist: 'Shopping List',
  rotation: 'Rotation',
  journal: 'Price Journal',
}

export default function App() {
  const [view, setView] = useState('dashboard')
  const [sortMode, setSortMode] = useState('name') // 'name' | 'kcal'

  const [people, setPeople] = useLocalStorage(
    'food.people',
    () => [
      makePerson({ name: 'Adult 1', age: 30 }),
      makePerson({ name: 'Adult 2', age: 30 }),
      makePerson({ name: 'Child', age: 6 }),
    ]
  )
  const [days, setDays] = useLocalStorage('food.days', 14)
  const [hygieneWater, setHygieneWater] = useLocalStorage('food.hygieneWater', 1)
  const [plan, setPlan] = useLocalStorage(
    'food.plan',
    () => defaultPlan(
      [
        makePerson({ name: 'Adult 1', age: 30 }),
        makePerson({ name: 'Adult 2', age: 30 }),
        makePerson({ name: 'Child', age: 6 }),
      ],
      14
    )
  )
  const [library, setLibrary] = useLocalStorage('food.library', FOOD_DATABASE)
  // Milestone 2: the per-food stock tracker (sparse). Only foods the user has
  // touched (rotated, or logged a price for) appear here; everything else falls
  // back to library defaults in the views.
  const [stock, setStock] = useLocalStorage('food.stock', () => ({}))

  // ---- plan mutation handlers (shared between views) ----
  const onItemChange = (id, patch) =>
    setPlan((p) => p.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const onRemove = (id) => setPlan((p) => p.filter((it) => it.id !== id))
  const onAdd = (food) => {
    const item = planItemFromLibrary(food, people.length || 1, days)
    setPlan((p) => [...p, item])
  }
  const onScale = () => setPlan((p) => scalePlanToTarget(p, people, days))
  const onToggleSort = () => setSortMode((m) => (m === 'name' ? 'kcal' : 'name'))

  // ---- Milestone 2: rotation + price-journal handlers ----
  const onLogPrice = (foodId, entry) => {
    setStock((s) => addJournalEntry(foodId, s, entry))
    // Also make the logged price the food's current baseline, so the library
    // and any future "add from library" reflect what you actually pay.
    setLibrary((lib) => lib.map((f) => (f.id === foodId ? { ...f, price: entry.price } : f)))
  }
  const onMarkRotated = (foodId, date) => setStock((s) => markRotated(foodId, s, date))
  const onSetRotation = (foodId, months) => setStock((s) => setRotationMonths(foodId, s, months))

  const state = { people, days, plan, library, hygieneWater, sortMode }

  return (
    <>
      <header className="appbar">
        <h1>Food Storage</h1>
        <span className="tag">2–4 week disruption kit + food-inflation hedge</span>
        <nav className="tabs">
          {VIEWS.map((v) => (
            <button
              key={v}
              className={v === view ? 'active' : ''}
              onClick={() => setView(v)}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {view === 'dashboard' && (
          <Dashboard
            people={people} setPeople={setPeople}
            days={days} setDays={setDays}
            hygieneWater={hygieneWater} setHygieneWater={setHygieneWater}
            plan={plan}
            onScale={onScale}
            goTo={(v) => setView(v)}
          />
        )}
        {view === 'calculator' && (
          <Calculator {...state}
            setPeople={setPeople} setDays={setDays}
            setLibrary={setLibrary} setPlan={setPlan}
            onItemChange={onItemChange} onRemove={onRemove}
            onAdd={onAdd} onScale={onScale} onToggleSort={onToggleSort}
          />
        )}
        {view === 'foodlibrary' && (
          <FoodLibrary library={library} setLibrary={setLibrary} />
        )}
        {view === 'shoppinglist' && (
          <ShoppingList people={people} days={days} plan={plan}
            hygieneWater={hygieneWater}
          />
        )}
        {view === 'rotation' && (
          <RotationView
            foods={library} stock={stock}
            onMarkRotated={onMarkRotated} onSetRotation={onSetRotation}
          />
        )}
        {view === 'journal' && (
          <JournalView foods={library} stock={stock} onLogPrice={onLogPrice} />
        )}
      </main>

      <footer>
        <p>
          All quantities, prices, and calorie values are <strong>editable baseline
          estimates</strong> (adapted from ready.gov, the LDS / FENSA preparedness guides, and
          USDA). Enter your own receipt prices for accuracy. Plan for a 2–4 week local
          disruption (power, roads, water); use the Rotation + Price Journal to build the
          longer food-inflation hedge.
        </p>
      </footer>
    </>
  )
}
