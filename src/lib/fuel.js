// Cooking-fuel math: how fast the household burns propane or butane, how long
// the fuel on hand lasts, and how much more to buy. Pure functions — no React,
// no DOM. Amounts are in pounds of propane-equivalent fuel (the BTU per pound
// of propane, butane and isobutane are within a few percent of each other).
import {
  COOKING_STYLES, FUEL_CONTAINERS, GAS_POT_EFFICIENCY, PROPANE_BTU_PER_LB, SOLID_FUELS, STOVES,
} from '../data/fuel.js'

// Bringing a gallon of water from tap temperature to a boil takes about
// 1,270 BTU; a camp stove gets ~40% of its heat into the pot.
export const BTU_PER_GALLON_BOILED = 3200

// Burner minutes per day: the user's own number if they set one, otherwise
// the cooking style's minutes, scaled up past four people.
export function cookingMinutes(fuel, headCount) {
  if (fuel.minutesPerDay != null) return fuel.minutesPerDay
  const style = COOKING_STYLES.find((s) => s.id === fuel.style) || COOKING_STYLES[0]
  const scale = Math.max(1, headCount / 4)
  return Math.round((style.minutes * scale) / 5) * 5
}

export function cookingBtuPerDay(fuel, headCount) {
  return (cookingMinutes(fuel, headCount) / 60) * (fuel.stoveBtu || 0) * ((fuel.flamePct || 0) / 100)
}

export function waterBoilBtuPerDay(people) {
  const gallons = people.reduce((s, p) => s + (p.waterPerDay || 0), 0)
  return gallons * BTU_PER_GALLON_BOILED
}

export function fuelOnHandBtu(containers, types = FUEL_CONTAINERS) {
  return types.reduce((s, t) => s + (Number(containers?.[t.id]) || 0) * t.lb * t.btuPerLb, 0)
}

const toPropaneLb = (btu) => btu / PROPANE_BTU_PER_LB

export function stoveFor(fuel) {
  return STOVES.find((st) => st.id === fuel.stove) || STOVES[0]
}

// Pounds of fuel, and how many containers, on hand of one kind ('propane' | 'butane').
export function onHandByKind(containers, kind, types = FUEL_CONTAINERS) {
  let lb = 0
  let count = 0
  for (const t of types) {
    if (t.fuel !== kind) continue
    const n = Number(containers?.[t.id]) || 0
    lb += (n * t.lb * t.btuPerLb) / PROPANE_BTU_PER_LB
    count += n
  }
  return { lb, count }
}

// ---- wood and charcoal ----
// A meal needs the same heat in the pot whatever the fuel. Gas gets about 40%
// of its heat into the pot, wood and charcoal less, so their heat = gas heat ×
// 0.4 / efficiency. Gas heat is worked out on a typical camp stove (10,000 BTU
// at 70% flame), since the gas stove's own BTU doesn't matter for them.
const REFERENCE_GAS_BTU_PER_MIN = (10000 * 0.7) / 60
const solid = (kind) => SOLID_FUELS.find((f) => f.kind === kind)

export function solidStoveFor(kind, fuel) {
  const def = solid(kind)
  return def.stoves.find((st) => st.id === fuel[def.stoveField]) || def.stoves[0]
}

export function solidOnHandBtu(kind, amounts) {
  return solid(kind).amounts.reduce((s, t) => s + (Number(amounts?.[t.id]) || 0) * t.lb * t.btuPerLb, 0)
}

// Pounds a day on the chosen wood or charcoal cooker (0 without one).
export function solidLbPerDay(kind, fuel, people) {
  const stove = solidStoveFor(kind, fuel)
  if (!stove.efficiency) return 0
  const gasBtu = cookingMinutes(fuel, people.length) * REFERENCE_GAS_BTU_PER_MIN +
    (fuel.boilWater ? waterBoilBtuPerDay(people) : 0)
  return (gasBtu * GAS_POT_EFFICIENCY) / stove.efficiency / solid(kind).btuPerLb
}

export const woodStoveFor = (fuel) => solidStoveFor('wood', fuel)
export const woodOnHandBtu = (wood) => solidOnHandBtu('wood', wood)
export const woodLbPerDay = (fuel, people) => solidLbPerDay('wood', fuel, people)

// Everything the Fuel tab shows.
//   days     — the plan's disruption length
//   foodDays — how long the stored food lasts (from On Hand), or 0
export function fuelSummary(fuel, people, days, foodDays = 0) {
  const btuPerDay = cookingBtuPerDay(fuel, people.length) + (fuel.boilWater ? waterBoilBtuPerDay(people) : 0)
  const onHandBtu = fuelOnHandBtu(fuel.containers)
  const neededLb = toPropaneLb(btuPerDay * days)
  const lbPerDay = toPropaneLb(btuPerDay)
  const gasDays = btuPerDay > 0 ? onHandBtu / btuPerDay : 0

  // Wood and charcoal, used once the gas runs out (or alongside it).
  const solids = Object.fromEntries(SOLID_FUELS.map((def) => {
    const perDay = solidLbPerDay(def.kind, fuel, people)
    const onHandLb = solidOnHandBtu(def.kind, fuel[def.field]) / def.btuPerLb
    return [def.kind, {
      stove: solidStoveFor(def.kind, fuel),
      lbPerDay: perDay,
      onHandLb,
      days: perDay > 0 ? onHandLb / perDay : 0,
    }]
  }))
  const daysCovered = gasDays + Object.values(solids).reduce((sum, x) => sum + x.days, 0)

  // Days still to cover, as gas to buy (or wood or charcoal, with a cooker for them).
  const shortDays = Math.max(0, days - daysCovered)
  const shortDaysFood = Math.max(0, foodDays - daysCovered)
  const shortfallLb = shortDays * lbPerDay
  // What to buy, in the containers the chosen stove takes.
  const stove = stoveFor(fuel)
  const buyType = FUEL_CONTAINERS.find((t) => t.id === stove.buy)
  const buyLb = (buyType.lb * buyType.btuPerLb) / PROPANE_BTU_PER_LB
  return {
    stove,
    buyLabel: stove.buyLabel,
    buyCount: Math.max(0, Math.ceil(shortfallLb / buyLb - 1e-9)), // tolerate float dust
    buyCountForFood: Math.max(0, Math.ceil((shortDaysFood * lbPerDay) / buyLb - 1e-9)),
    containersPerDay: toPropaneLb(btuPerDay) / buyLb,
    propane: onHandByKind(fuel.containers, 'propane'),
    butane: onHandByKind(fuel.containers, 'butane'),
    minutesPerDay: cookingMinutes(fuel, people.length),
    btuPerDay,
    lbPerDay,
    onHandLb: toPropaneLb(onHandBtu),
    gasDays,
    // wood and charcoal: { stove, lbPerDay, onHandLb, days, neededLb,
    // neededLbForFood } — needed is what would cover the days still short
    // instead of buying gas.
    ...Object.fromEntries(Object.entries(solids).map(([kind, x]) => [kind, {
      ...x,
      neededLb: shortDays * x.lbPerDay,
      neededLbForFood: shortDaysFood * x.lbPerDay,
    }])),
    daysCovered,
    shortDays,
    shortDaysFood,
    neededLb,
    shortfallLb,
    tanks20ToBuy: Math.max(0, Math.ceil(shortfallLb / 20 - 1e-9)), // tolerate float dust
    foodDays,
    neededLbForFood: toPropaneLb(btuPerDay * foodDays),
  }
}
