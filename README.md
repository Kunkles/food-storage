# Food Storage

A practical disaster food preparation web app. It helps a household plan a
**2–4 week local-disruption food kit** — sized to each person's age, with
editable prices, age-aware calorie and water targets, and flags on the foods
most likely to get more expensive.

Built in React (Vite), entirely client-side, with all data persisted in
`localStorage`. No backend.

---

## Why this app

The immediate risk in places like Southern California is not a months-long food
scarcity — it is a **2–4 week local isolation event**: a power outage, closed
roads, or water interruption following an earthquake, flood, or other disaster.
This app is built to plan for exactly that: enough safe, practical food (things
a family would actually eat) to last through a prolonged disruption.

The app is deliberately **not** a "store 400 lbs of wheat" generator. It plans
for **price and isolation, not absence** — enough food to cook, stay hydrated,
and stay healthy until local supply resumes, sized to who is actually in your
home (including relatives who may temporarily stay with you).

---

## Features

- **Age-aware household**: add each person with their age (auto-assigned to a
  tier: infant, toddler, child, pre-teen, teen, adult, or senior). Each tier has
  a suggested daily calorie and water target (based on USDA / Ready.gov), both
  editable — since guests and individual needs vary.
- **Disruption duration**: choose how many days (3–30, typically 14) you want
  your plan to cover.
- **Editable food plan**: a two-tier list (no-cook / no-power items and
  long-rotation staples). Every item's quantity, price, and calorie content can
  be individually adjusted; new items can be added from the library or entirely
  custom entries.
- **Calorie and water accounting**: live totals that compare your plan against
  the sum of each person's daily target (multiplied by days), showing whether
  the plan is on target, slightly short, or meaningfully under-provisioned.
  A "scale to target" button proportionally resizes all items to hit the exact
  calorie goal.
- **Food library**: an editable database of common storage foods, each with its
  size, calories, price, daily rate, and a flag indicating whether it is
  particularly sensitive to wide commodity / climate price swings (marked with
  ⚠).
- **Shopping list**: a clean, printable, cost-ordered list grouped by category,
  with running totals.
- **Price journal** *(Milestone 2)*: log what you actually pay each time you buy
  a food. See the latest price vs. your recent average, a **buy-ahead signal**
  (dip → buy, spike → wait), and the cost per 100k calories. Logging a price
  also updates that food's baseline in the library.
- **Rotation calendar** *(Milestone 2)*: a per-food rotation schedule (staples
  default to a 6-month cadence, shelf goods to 3; both editable). Shows last
  rotated, next due, and status — and "mark rotated" in one tap keeps the
  store fresh and the household practiced on disaster meals.
- **All data is private and local** — stored only in your own browser.

---

## Running the app

Requires Node.js (v18+). Note that on some machines `node` is not on the
default `PATH` — it may be installed via a package manager (e.g. Homebrew at
`/opt/homebrew/bin/node`); prepend that directory if `node` is not found.

```sh
npm install
npm run dev      # start the development server
npm run build    # create a production build (in dist/)
npm run preview  # preview the production build
npm test         # run the unit tests (Vitest)
```

---

## Data sources and honesty about estimates

All baseline prices, calorie contents, and daily rates are **editable
estimates**, seeded from general guidance in:

- [Ready.gov](https://www.ready.gov) emergency food lists (1,200-calorie-per-day
  guidance, 1 gallon-of-water-per-person-per-day baseline)
- The LDS Church's [FENSA](https://store.churchofjesuschrist.org) food storage
  catalogs and the published "Approach to Long-Term Food Storage" checklist
- USDA Dietary Reference Intakes (for age-tiered calorie recommendations)

**None of these numbers are fixed truth.** Because food prices change by region,
store, and season, and because each family's diet differs, every number
(specified per unit, per person, per day) can — and should — be replaced with
what you actually paid and how much you actually eat.

---

## Roadmap

**Milestone 1 (complete):** the 2–4 week local-disruption kit — the
calorie/water/quantity calculator, food library, and shopping list described
above.

**Milestone 2 (complete):** the longer-horizon **food-inflation hedge**,
built around the expectation that wide commodity swings (such as those
potentially accompanied by the 2026–27 El Niño) will push prices of specific
staples higher over many months. It adds two new tabs that build directly on
the Milestone 1 data model (the library's ⚠ "exposed" flag drives both):

- **Price Journal** — the core mechanic of the hedge: log every real receipt
  price, and when a price-sensitive staple dips below its recent average you
  get a "buy ahead" signal (and a "wait" when it spikes).
- **Rotation calendar** — so the hedge stays fresh: each stored food is on a
  cadence, you mark it rotated as you eat through and replace it, and the
  calendar flags overdue / due-soon items.

All journal and rotation state persists in `localStorage` (`food.stock`).

**Milestone 3 (roadmap):** trend charts of cost per 100k calories over time,
a 12–24 month buy-ahead plan generator (current store cost vs. projected
inflation, "what to buy this month"), and import/export of your price history.

---

## Project structure

```
src/
  data/
    ageTiers.js       # age tiers, default calorie/water targets, person factory
    foodDatabase.js   # the seeded (editable) food library
  lib/
    calc.js           # all the planning math (quantities, calories, water, costs)
    rotation.js       # rotation-cadence date math (Milestone 2)
    inflation.js      # price-history / buy-ahead analysis (Milestone 2)
    format.js         # small number-formatting helpers
  hooks/
    useLocalStorage.js # persistence hook
  components/         # reusable building blocks (people, plan, library, badges)
  views/              # the six main screens (dashboard, calculator, library, list, rotation, journal)
  App.jsx             # state owner + navigation
  main.jsx            # entry point
  index.css           # all styling
tests/
  calc.test.js        # unit tests for the calculation library
  rotation.test.js    # unit tests for the rotation calendar (Milestone 2)
  inflation.test.js   # unit tests for the price journal / buy-ahead logic (Milestone 2)
```

## License

Free to use, copy, and adapt for personal or community preparedness. No
warranty of any kind — adjust every number to your own circumstances.
