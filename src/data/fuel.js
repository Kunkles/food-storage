// Cooking fuel: the containers you can store, and how much cooking a stored
// diet takes. All of these are editable estimates.
//
// Propane holds about 21,600 BTU per pound; butane about 21,200; the
// isobutane/propane mix in backpacking canisters about 21,000. A container's
// size is the fuel it holds when full ("20 lb" = 20 lb of propane, "230 g" =
// 230 g of gas). Because they're so close, the app counts all of it as
// pounds of fuel.
export const PROPANE_BTU_PER_LB = 21600
export const BUTANE_BTU_PER_LB = 21200
export const ISOBUTANE_BTU_PER_LB = 21000
const G_PER_LB = 453.6

export const FUEL_CONTAINERS = [
  { id: 'propane-1lb', name: '1 lb propane cylinder (camp stove)', lb: 1, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-5lb', name: '5 lb propane tank', lb: 5, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-11lb', name: '11 lb propane tank', lb: 11, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-20lb', name: '20 lb propane tank (BBQ size)', lb: 20, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-30lb', name: '30 lb propane tank', lb: 30, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-40lb', name: '40 lb propane tank', lb: 40, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'propane-100lb', name: '100 lb propane tank', lb: 100, btuPerLb: PROPANE_BTU_PER_LB },
  { id: 'butane-8oz', name: '8 oz butane canister (tabletop stove)', lb: 0.5, btuPerLb: BUTANE_BTU_PER_LB, fuel: 'butane' },
  { id: 'isobutane-100g', name: '100 g isobutane canister (backpacking)', lb: 100 / G_PER_LB, btuPerLb: ISOBUTANE_BTU_PER_LB, fuel: 'butane' },
  { id: 'isobutane-230g', name: '230 g isobutane canister (backpacking)', lb: 230 / G_PER_LB, btuPerLb: ISOBUTANE_BTU_PER_LB, fuel: 'butane' },
  { id: 'isobutane-450g', name: '450 g isobutane canister (backpacking)', lb: 450 / G_PER_LB, btuPerLb: ISOBUTANE_BTU_PER_LB, fuel: 'butane' },
].map((c) => ({ fuel: 'propane', ...c }))

// The stove you'll mostly cook on. It sets the starting BTU and what the Fuel
// tab tells you to buy. Butane stoves are usually smaller than propane ones.
export const STOVES = [
  { id: 'propane', label: 'Propane camp stove', btu: 10000, buy: 'propane-20lb', buyLabel: '20 lb propane tank' },
  { id: 'butane', label: 'Butane tabletop stove (single burner)', btu: 9000, buy: 'butane-8oz', buyLabel: '8 oz butane canister' },
  { id: 'backpacking', label: 'Backpacking canister stove', btu: 8000, buy: 'isobutane-230g', buyLabel: '230 g isobutane canister' },
]

// ---- wood ----
// Seasoned firewood (about 20% moisture) holds about 6,400 BTU per pound;
// wood pellets about 8,000. Wood is weighed loosely: a cord of mixed seasoned
// hardwood is 2,500–4,000 lb, so 3,000 is a middle guess.
export const WOOD_BTU_PER_LB = 6400

export const WOOD_AMOUNTS = [
  { id: 'wood-lb', name: 'Sticks, scrap wood or kindling (pounds)', lb: 1, btuPerLb: WOOD_BTU_PER_LB },
  { id: 'wood-bundle', name: 'Store bundle of firewood (about ¾ cu ft)', lb: 20, btuPerLb: WOOD_BTU_PER_LB },
  { id: 'wood-face-cord', name: 'Face cord or rick (⅓ cord, 4 × 8 ft × 16 in)', lb: 1000, btuPerLb: WOOD_BTU_PER_LB },
  { id: 'wood-cord', name: 'Full cord (4 × 4 × 8 ft)', lb: 3000, btuPerLb: WOOD_BTU_PER_LB },
  { id: 'pellets-40lb', name: 'Wood pellets, 40 lb bag', lb: 40, btuPerLb: 8000 },
]

// How much of the wood's heat ends up in the pot. A gas camp stove gets about
// 40%; wood does worse, so the same meal takes more heat from wood.
export const GAS_POT_EFFICIENCY = 0.4
export const WOOD_STOVES = [
  { id: 'none', label: 'No wood stove', efficiency: 0 },
  { id: 'rocket', label: 'Rocket stove (outdoors, burns sticks)', efficiency: 0.25 },
  { id: 'indoor', label: 'Wood-burning stove in the house (cook on top)', efficiency: 0.12 },
  { id: 'fire', label: 'Campfire or fire pit with a grate', efficiency: 0.1 },
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
  stove: 'propane',
  style: 'pressure',
  minutesPerDay: null, // null = use the style's minutes, scaled to the household
  stoveBtu: 10000, // per burner, per hour, at full flame (a typical camp stove)
  flamePct: 70, // average across boiling and simmering
  boilWater: false, // boil drinking water too (if filters run out)
  containers: {}, // container id -> how many (decimals for partly full)
  woodStove: 'none', // a WOOD_STOVES id
  wood: {}, // WOOD_AMOUNTS id -> how many
}
