// Stored water: the containers you can keep it in. Sizes are in gallons.
//
// sealed — bought filled (bottled water); good until the date on the label
// refill — you fill it yourself; replace the water every 6 months (ready.gov)
export const WATER_CONTAINERS = [
  { id: 'case-24', name: 'Case of 24 × 16.9 oz bottles', gallons: (24 * 16.9) / 128, kind: 'sealed' },
  { id: 'case-40', name: 'Case of 40 × 16.9 oz bottles (Costco size)', gallons: (40 * 16.9) / 128, kind: 'sealed' },
  { id: 'jug-1', name: '1 gallon jug (store-bought)', gallons: 1, kind: 'sealed' },
  { id: 'jug-2.5', name: '2.5 gallon jug with spout (store-bought)', gallons: 2.5, kind: 'sealed' },
  { id: 'jug-5', name: '5 gallon water jug', gallons: 5, kind: 'refill' },
  { id: 'jug-7', name: '7 gallon container (Aquatainer size)', gallons: 7, kind: 'refill' },
  { id: 'drum-15', name: '15 gallon drum', gallons: 15, kind: 'refill' },
  { id: 'drum-30', name: '30 gallon drum', gallons: 30, kind: 'refill' },
  { id: 'barrel-55', name: '55 gallon barrel', gallons: 55, kind: 'refill' },
]

// How often self-filled water gets replaced.
export const REFILL_MONTHS = 6

export const DEFAULT_WATER = {
  containers: {}, // container id -> how many (decimals for partly full)
  lastFilled: '', // ISO date the refillable containers were last filled
}

// Household bleach (sodium hypochlorite) for disinfecting water, per gallon,
// from the EPA's emergency drinking water guidance. Plain unscented bleach
// only — no "splash-less", scented or cleaner-added kinds.
export const BLEACH_STRENGTHS = [
  { id: '6', label: '6% bleach (older bottles, most store brands)', dropsPerGallon: 8 },
  { id: '8.25', label: '8.25% bleach (most Clorox sold now)', dropsPerGallon: 6 },
]
// The EPA's table works out to roughly this many drops in a teaspoon.
export const DROPS_PER_TSP = 96
