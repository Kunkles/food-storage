// Stored-water math: how much the household drinks and uses a day, how long
// what's stored lasts, what to buy, and how much bleach treats it. Pure
// functions — no React, no DOM.
import { BLEACH_STRENGTHS, DROPS_PER_TSP, REFILL_MONTHS, WATER_CONTAINERS } from '../data/water.js'

export function drinkingGallonsPerDay(people) {
  return people.reduce((s, p) => s + (p.waterPerDay || 0), 0)
}

export function hygieneGallonsPerDay(people, hygieneGalPerPersonDay = 0) {
  return people.length * (hygieneGalPerPersonDay || 0)
}

// Gallons in the containers, plus any loose gallons entered by hand.
export function containerGallons(containers, types = WATER_CONTAINERS) {
  return types.reduce((s, t) => s + (Number(containers?.[t.id]) || 0) * t.gallons, 0)
}

export function hasRefillable(containers, types = WATER_CONTAINERS) {
  return types.some((t) => t.kind === 'refill' && Number(containers?.[t.id]) > 0)
}

// The date self-filled water is due to be replaced, or null without a fill date.
export function nextRefill(lastFilled) {
  if (!lastFilled) return null
  const d = new Date(`${lastFilled}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  d.setMonth(d.getMonth() + REFILL_MONTHS)
  return d
}

// Bleach to disinfect a number of gallons, as drops and as teaspoons rounded
// to the nearest eighth.
export function bleachFor(gallons, strengthId) {
  const strength = BLEACH_STRENGTHS.find((b) => b.id === strengthId) || BLEACH_STRENGTHS[0]
  const drops = Math.round((Number(gallons) || 0) * strength.dropsPerGallon)
  const tsp = Math.round((drops / DROPS_PER_TSP) * 8) / 8
  return { drops, tsp }
}

// Everything the Water tab shows.
//   looseGallons — water entered as a plain number (the old On Hand field)
//   days         — the plan's disruption length
//   foodDays     — how long the stored food lasts (from On Hand), or 0
export function waterSummary({ water, looseGallons = 0, people, hygieneWater = 0, days, foodDays = 0 }) {
  const drinkPerDay = drinkingGallonsPerDay(people)
  const hygienePerDay = hygieneGallonsPerDay(people, hygieneWater)
  const perDay = drinkPerDay + hygienePerDay
  const onHand = containerGallons(water.containers) + (Number(looseGallons) || 0)
  const needed = perDay * days
  const shortfall = Math.max(0, needed - onHand)
  const neededForFood = perDay * foodDays
  return {
    drinkPerDay,
    hygienePerDay,
    perDay,
    onHand,
    daysCovered: perDay > 0 ? onHand / perDay : 0,
    needed,
    shortfall,
    // The same shortfall, as things to buy. Tolerate float dust.
    casesToBuy: Math.max(0, Math.ceil(shortfall / WATER_CONTAINERS[0].gallons - 1e-9)),
    jugs5ToBuy: Math.max(0, Math.ceil(shortfall / 5 - 1e-9)),
    foodDays,
    neededForFood,
    shortfallForFood: Math.max(0, neededForFood - onHand),
  }
}
