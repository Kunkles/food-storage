// Cooking-fuel math: how fast the household burns propane, how long the fuel
// on hand lasts, and how much more to buy. Pure functions — no React, no DOM.
import { COOKING_STYLES, FUEL_CONTAINERS, PROPANE_BTU_PER_LB } from '../data/fuel.js'

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

// Everything the Fuel tab shows.
//   days     — the plan's disruption length
//   foodDays — how long the stored food lasts (from On Hand), or 0
export function fuelSummary(fuel, people, days, foodDays = 0) {
  const btuPerDay = cookingBtuPerDay(fuel, people.length) + (fuel.boilWater ? waterBoilBtuPerDay(people) : 0)
  const onHandBtu = fuelOnHandBtu(fuel.containers)
  const neededLb = toPropaneLb(btuPerDay * days)
  const shortfallLb = Math.max(0, neededLb - toPropaneLb(onHandBtu))
  return {
    minutesPerDay: cookingMinutes(fuel, people.length),
    btuPerDay,
    lbPerDay: toPropaneLb(btuPerDay),
    onHandLb: toPropaneLb(onHandBtu),
    daysCovered: btuPerDay > 0 ? onHandBtu / btuPerDay : 0,
    neededLb,
    shortfallLb,
    tanks20ToBuy: Math.max(0, Math.ceil(shortfallLb / 20 - 1e-9)), // tolerate float dust
    foodDays,
    neededLbForFood: toPropaneLb(btuPerDay * foodDays),
  }
}
