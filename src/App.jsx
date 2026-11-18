import { useCallback, useMemo, useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useDriveSync } from './hooks/useDriveSync.js'
import { useOffline, useOnline } from './hooks/useOffline.js'
import { makePerson } from './data/ageTiers.js'
import { FOOD_DATABASE } from './data/foodDatabase.js'
import { defaultPlan, planItemFromLibrary, scalePlanToTarget } from './lib/calc.js'
import { addJournalEntry, markRotated, setRotationMonths } from './lib/inflation.js'
import { daysCovered, importOrder } from './lib/inventory.js'
import { recordUse, undoUse } from './lib/usage.js'
import { recordFuelUse, recordWaterUse, undoSupplyUse } from './lib/supplyUse.js'
import { todayIso } from './lib/rotation.js'
import { DEFAULT_FUEL } from './data/fuel.js'
import { DEFAULT_WATER } from './data/water.js'
import { containerGallons } from './lib/water.js'
import { DEFAULT_SHOPPING } from './lib/shopping.js'
import { DEFAULT_MY_RECIPES, mergeRecipes, removeRecipe, saveRecipe } from './lib/recipes.js'

import Dashboard from './views/Dashboard.jsx'
import Calculator from './views/Calculator.jsx'
import FoodLibrary from './views/FoodLibrary.jsx'
import ShoppingList from './views/ShoppingList.jsx'
import RotationView from './views/RotationView.jsx'
import JournalView from './views/JournalView.jsx'
import InventoryView from './views/InventoryView.jsx'
import FuelView from './views/FuelView.jsx'
import WaterView from './views/WaterView.jsx'
import RecipesView from './views/RecipesView.jsx'
import ReferenceView from './views/ReferenceView.jsx'
import BackupCard from './components/BackupCard.jsx'
import OfflineCard from './components/OfflineCard.jsx'
import VersionInfo from './components/VersionInfo.jsx'
import UpdateBar from './components/UpdateBar.jsx'

const VIEWS = ['dashboard', 'onhand', 'water', 'fuel', 'recipes', 'calculator', 'foodlibrary', 'shoppinglist', 'rotation', 'journal', 'reference']

const VIEW_LABELS = {
  dashboard: 'Dashboard',
  onhand: 'On Hand',
  water: 'Water',
  fuel: 'Fuel',
  recipes: 'Recipes',
  calculator: 'Calculator',
  foodlibrary: 'Food Library',
  shoppinglist: 'Shopping List',
  rotation: 'Rotation',
  journal: 'Price Journal',
  reference: 'Reference',
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
  // What's already stored (as opposed to the plan, which is what to buy).
  const [inventory, setInventory] = useLocalStorage('food.inventory', () => [])
  // Food taken out of storage, newest first, so it can be undone and the
  // On Hand tab can tell how fast it's going.
  const [usage, setUsage] = useLocalStorage('food.usage', () => [])
  // Loose gallons (the original On Hand field), plus the Water tab's containers.
  const [waterOnHand, setWaterOnHand] = useLocalStorage('food.waterOnHand', 0)
  const [storedWater, setWater] = useLocalStorage('food.water', DEFAULT_WATER)
  const water = { ...DEFAULT_WATER, ...storedWater }
  const waterGallons = containerGallons(water.containers) + (Number(waterOnHand) || 0)
  const [storedFuel, setFuel] = useLocalStorage('food.fuel', DEFAULT_FUEL)
  // Water and fuel taken out of storage, newest first, for Undo and pace.
  const [supplyUse, setSupplyUse] = useLocalStorage('food.supplyUse', () => [])
  // Pantry extras (salt, oil, spices…) ticked as on hand, for the Recipes tab.
  const [pantry, setPantry] = useLocalStorage('food.pantry', () => ({}))
  // Shopping list check-offs and your own items beyond the plan.
  const [storedShopping, setShopping] = useLocalStorage('food.shopping', DEFAULT_SHOPPING)
  const shopping = { ...DEFAULT_SHOPPING, ...storedShopping }
  // Your own recipes, ones saved from online, and your changes to built-in ones.
  const [storedMyRecipes, setMyRecipes] = useLocalStorage('food.myRecipes', DEFAULT_MY_RECIPES)
  const recipes = mergeRecipes({ ...DEFAULT_MY_RECIPES, ...storedMyRecipes })
  const onSaveRecipe = (recipe) => setMyRecipes((m) => saveRecipe({ ...DEFAULT_MY_RECIPES, ...m }, recipe))
  const onRemoveRecipe = (id) => setMyRecipes((m) => removeRecipe({ ...DEFAULT_MY_RECIPES, ...m }, id))
  // Fill in settings added after this browser first saved its fuel.
  const fuel = { ...DEFAULT_FUEL, ...storedFuel }
  const foodDays = daysCovered(inventory, people).emergencyDays

  // ---- backup + Google Drive sync ----
  // Keyed by localStorage key, the same shape a backup file holds.
  const snapshot = useMemo(() => ({
    'food.people': people,
    'food.days': days,
    'food.hygieneWater': hygieneWater,
    'food.plan': plan,
    'food.library': library,
    'food.stock': stock,
    'food.inventory': inventory,
    'food.waterOnHand': waterOnHand,
    'food.water': storedWater,
    'food.fuel': storedFuel,
    'food.pantry': pantry,
    'food.shopping': storedShopping,
    'food.myRecipes': storedMyRecipes,
    'food.usage': usage,
    'food.supplyUse': supplyUse,
  }), [people, days, hygieneWater, plan, library, stock, inventory, waterOnHand, storedWater, storedFuel, pantry, storedShopping, storedMyRecipes, usage, supplyUse])
  // Replaces the data with a loaded backup. Keys missing from it are left alone.
  const applyData = useCallback((data) => {
    const setters = {
      'food.people': setPeople,
      'food.days': setDays,
      'food.hygieneWater': setHygieneWater,
      'food.plan': setPlan,
      'food.library': setLibrary,
      'food.stock': setStock,
      'food.inventory': setInventory,
      'food.waterOnHand': setWaterOnHand,
      'food.water': setWater,
      'food.fuel': setFuel,
      'food.pantry': setPantry,
      'food.shopping': setShopping,
      'food.myRecipes': setMyRecipes,
      'food.usage': setUsage,
      'food.supplyUse': setSupplyUse,
    }
    for (const [key, value] of Object.entries(data)) setters[key]?.(value)
  }, [setPeople, setDays, setHygieneWater, setPlan, setLibrary, setStock, setInventory, setWaterOnHand, setWater, setFuel, setPantry, setShopping, setMyRecipes, setUsage, setSupplyUse])
  const drive = useDriveSync(snapshot, applyData)
  const offline = useOffline()
  const online = useOnline()

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
  const onImportOrder = (order) => setInventory((inv) => importOrder(inv, order))

  // ---- using food from storage ----
  // lines: [{ itemId | productId, qty }] in cans/units. Opening and cooking
  // with a can also counts as rotating it.
  const onUseFood = (lines, note = '', date = todayIso()) => {
    const r = recordUse(inventory, usage, lines, { date, note })
    if (!r.entries.length) return r.entries
    setInventory(r.inventory)
    setUsage(r.log.slice(0, 1000))
    for (const e of r.entries) onMarkRotated(`onhand:${e.productId || e.parts[0].itemId}`, date)
    return r.entries
  }
  // One log entry id, or several (a recipe takes out a few foods at once).
  const onUndoUse = (ids) => {
    let r = { inventory, log: usage }
    for (const id of [].concat(ids)) r = undoUse(r.inventory, r.log, id)
    setInventory(r.inventory)
    setUsage(r.log)
  }

  // ---- using water and fuel ----
  // { sourceId, units, date, note }: units are containers (or loose gallons).
  const onUseWater = (use) => {
    const r = recordWaterUse({ water, loose: waterOnHand }, supplyUse, use)
    if (!r) return null
    setWater(r.water)
    if (r.loose !== waterOnHand) setWaterOnHand(r.loose)
    setSupplyUse(r.log)
    return r.entry
  }
  // { field, sourceId, units, date, note }: field is 'containers' or a solid fuel's field.
  const onUseFuel = (use) => {
    const r = recordFuelUse(fuel, supplyUse, use)
    if (!r) return null
    setFuel(r.fuel)
    setSupplyUse(r.log)
    return r.entry
  }
  const onUndoSupply = (id) => {
    const r = undoSupplyUse({ water, loose: waterOnHand, fuel }, supplyUse, id)
    if (r.water !== water) setWater(r.water)
    if (r.loose !== waterOnHand) setWaterOnHand(r.loose)
    if (r.fuel !== fuel) setFuel(r.fuel)
    setSupplyUse(r.log)
  }

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
            plan={plan} inventory={inventory} usage={usage} supplyUse={supplyUse} fuel={fuel} waterGallons={waterGallons}
            onScale={onScale}
            goTo={(v) => setView(v)}
          />
        )}
        {view === 'dashboard' && (
          <BackupCard snapshot={snapshot} applyData={applyData} drive={drive} />
        )}
        {view === 'dashboard' && <OfflineCard offline={offline} />}
        {view === 'onhand' && (
          <InventoryView
            people={people} hygieneWater={hygieneWater}
            inventory={inventory} setInventory={setInventory}
            usage={usage} onUseFood={onUseFood} onUndoUse={onUndoUse}
            waterGallons={waterGallons}
            onImportOrder={onImportOrder}
            goTo={(v) => setView(v)}
          />
        )}
        {view === 'water' && (
          <WaterView
            people={people} days={days} foodDays={foodDays}
            hygieneWater={hygieneWater} setHygieneWater={setHygieneWater}
            water={water} setWater={setWater}
            looseGallons={waterOnHand} setLooseGallons={setWaterOnHand}
            inventory={inventory}
            supplyUse={supplyUse} onUseWater={onUseWater} onUndoSupply={onUndoSupply}
          />
        )}
        {view === 'fuel' && (
          <FuelView
            people={people} days={days} foodDays={foodDays} fuel={fuel} setFuel={setFuel}
            supplyUse={supplyUse} onUseFuel={onUseFuel} onUndoSupply={onUndoSupply}
          />
        )}
        {view === 'recipes' && (
          <RecipesView
            recipes={recipes} people={people} inventory={inventory} pantry={pantry} setPantry={setPantry}
            onUseFood={onUseFood} onUndoUse={onUndoUse}
            onSaveRecipe={onSaveRecipe} onRemoveRecipe={onRemoveRecipe}
            online={online} goTo={(v) => setView(v)}
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
            onItemChange={onItemChange} onRemove={onRemove}
            shopping={shopping} setShopping={setShopping} pantry={pantry} recipes={recipes}
          />
        )}
        {view === 'rotation' && (
          <RotationView
            foods={library} inventory={inventory} stock={stock}
            onMarkRotated={onMarkRotated} onSetRotation={onSetRotation}
          />
        )}
        {view === 'reference' && <ReferenceView />}
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
        <p>
          <a href={`${import.meta.env.BASE_URL}privacy.html`}>Privacy Policy</a> ·{' '}
          <a href={`${import.meta.env.BASE_URL}terms.html`}>Terms of Service</a>
        </p>
        <p className="no-print">
          <VersionInfo offline={offline} compact />
        </p>
      </footer>
      <UpdateBar offline={offline} online={online} />
    </>
  )
}
