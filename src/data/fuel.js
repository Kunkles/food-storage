// Cooking fuel: the containers you can store, and how much cooking a stored
// diet takes. All of these are editable estimates.
//
// Propane holds about 21,600 BTU per pound; butane about 21,200. A tank's
// size is the fuel it holds when full ("20 lb" = 20 lb of propane).
export const PROPANE_BTU_PER_LB = 21600

export const FUEL_CONTAINERS = [
  { id: 'propane-1lb', name: '1 lb propane cylinder (camp stove)', lb: 1, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-5lb', name: '5 lb propane tank', lb: 5, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-11lb', name: '11 lb propane tank', lb: 11, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-20lb', name: '20 lb propane tank (BBQ size)', lb: 20, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-30lb', name: '30 lb propane tank', lb: 30, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-40lb', name: '40 lb propane tank', lb: 40, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-100lb', name: '100 lb propane tank', lb: 100, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'butane-8oz', name: '8 oz butane canister (single burner)', lb: 0.5, btuPerLb: 21200 },
]

// How much burner time a day of cooking takes, for a household of up to four,
// including hot water for drinks and dishes. Larger households scale up.
// Scratch-cooking beans and grains works out near 1 lb of propane a day.
export const COOKING_STYLES = [
  { id: 'boil', label: 'Boil water only (oats, potato flakes, pasta, dry milk)', minutes: 45 },
  { id: 'pressure', label: 'Rice and beans in a pressure cooker', minutes: 90 },
  { id: 'simmer', label: 'Beans and wheat simmered in a regular pot', minutes: 180 },
]

export const DEFAULT_FUEL = {
  style: 'pressure',
  minutesPerDay: null, // null = use the style's minutes, scaled to the household
  stoveBtu: 10000, // per burner, per hour, at full flame (a typical camp stove)
  flamePct: 70, // average across boiling and simmering
  boilWater: false, // boil drinking water too (if filters run out)
  containers: {}, // container id -> how many (decimals for partly full)
}
