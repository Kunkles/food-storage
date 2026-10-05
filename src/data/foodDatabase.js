// The editable food library.
//
// Every value here is a USER-EDITABLE baseline estimate, not gospel.
// - "unit"        : the thing you actually buy (a can, a 1 lb bag, a bottle).
// - "perUnitKcal" : kcal in one unit.
// - "price"       : $ per unit (ballpark 2026 US prices — enter your own).
// - "rate"        : units per person per day, used to auto-size a plan.
// - "elNinoExposed" : true = price is sensitive to El Niño / import shocks
//                     (grains, sugar, oil, coffee, cocoa, peanuts, eggs, rice).
//
// Data adapted from ready.gov, the LDS/FENSA preparedness guides, and USDA
// DRI figures. All prices are rough — a "15 oz can" costs you what you paid
// this week, so treat price as your own receipt number.
export const FOOD_DATABASE = [
  // ---- No-cook / no-power kit (edible with no stove) ----
  { id: 'tuna', name: 'Canned tuna', category: 'noCook', unit: '15 oz can', perUnitKcal: 210, price: 3.0, rate: 0.5, elNinoExposed: false },
  { id: 'beans-rte', name: 'Ready-to-eat canned beans', category: 'noCook', unit: '15 oz can', perUnitKcal: 310, price: 2.5, rate: 0.5, elNinoExposed: false },
  { id: 'chicken', name: 'Canned chicken', category: 'noCook', unit: '10 oz can', perUnitKcal: 130, price: 3.0, rate: 0.5, elNinoExposed: false },
  { id: 'peanut-butter', name: 'Peanut butter', category: 'noCook', unit: '16 oz jar', perUnitKcal: 2190, price: 5.0, rate: 0.05, elNinoExposed: true },
  { id: 'protein-bar', name: 'Protein bar', category: 'noCook', unit: '1 bar', perUnitKcal: 200, price: 1.5, rate: 1.0, elNinoExposed: false },
  { id: 'soup', name: 'Canned soup', category: 'noCook', unit: '10.75 oz can', perUnitKcal: 190, price: 2.5, rate: 0.5, elNinoExposed: false },
  { id: 'granola-bar', name: 'Granola bar', category: 'noCook', unit: '1 bar', perUnitKcal: 150, price: 1.0, rate: 1.0, elNinoExposed: false },
  { id: 'crackers', name: 'Crackers', category: 'noCook', unit: '1 lb box', perUnitKcal: 1650, price: 3.5, rate: 0.15, elNinoExposed: false },
  { id: 'jerky', name: 'Beef jerky', category: 'noCook', unit: '6 oz bag', perUnitKcal: 120, price: 4.0, rate: 0.25, elNinoExposed: false },
  { id: 'fruit', name: 'Canned fruit in juice', category: 'noCook', unit: '15 oz can', perUnitKcal: 120, price: 2.5, rate: 0.5, elNinoExposed: false },
  { id: 'juice', name: 'Juice boxes', category: 'noCook', unit: '8 oz box', perUnitKcal: 60, price: 0.5, rate: 1.0, elNinoExposed: false },
  { id: 'instant-mash', name: 'Instant mashed potatoes', category: 'noCook', unit: '16 oz box', perUnitKcal: 1200, price: 3.0, rate: 0.25, elNinoExposed: false },
  { id: 'trail-mix', name: 'Trail mix', category: 'noCook', unit: '12 oz bag', perUnitKcal: 1400, price: 5.0, rate: 0.1, elNinoExposed: false },
  { id: 'powder-milk', name: 'Powdered milk', category: 'noCook', unit: '1 lb can', perUnitKcal: 720, price: 6.0, rate: 0.1, elNinoExposed: false },
  { id: 'infant-formula', name: 'Infant formula', category: 'noCook', unit: '12.5 oz tub', perUnitKcal: 660, price: 9.0, rate: 0.5, elNinoExposed: false },

  // ---- Rotating staples (cook & rotate through — also your buy-ahead hedge) ----
  { id: 'rice', name: 'Rice', category: 'staple', unit: '1 lb bag', perUnitKcal: 3340, price: 1.4, rate: 0.1, elNinoExposed: true },
  { id: 'pasta', name: 'Pasta', category: 'staple', unit: '1 lb box', perUnitKcal: 1700, price: 2.0, rate: 0.1, elNinoExposed: true },
  { id: 'oats', name: 'Rolled oats', category: 'staple', unit: '1 lb bag', perUnitKcal: 3760, price: 3.0, rate: 0.05, elNinoExposed: true },
  { id: 'flour', name: 'Flour', category: 'staple', unit: '1 lb bag', perUnitKcal: 1900, price: 1.5, rate: 0.03, elNinoExposed: true },
  { id: 'dry-beans', name: 'Dry beans', category: 'staple', unit: '1 lb bag', perUnitKcal: 1700, price: 3.0, rate: 0.1, elNinoExposed: true },
  { id: 'potato-flakes', name: 'Potato flakes', category: 'staple', unit: '1 lb bag', perUnitKcal: 6080, price: 4.0, rate: 0.05, elNinoExposed: false },
  { id: 'sugar', name: 'Sugar', category: 'staple', unit: '1 lb bag', perUnitKcal: 1430, price: 1.25, rate: 0.05, elNinoExposed: true },
  { id: 'salt', name: 'Salt', category: 'staple', unit: '1 lb canister', perUnitKcal: 0, price: 2.0, rate: 0.02, elNinoExposed: false },
  { id: 'cooking-oil', name: 'Cooking oil', category: 'staple', unit: '16 oz bottle', perUnitKcal: 2667, price: 2.5, rate: 0.05, elNinoExposed: true },
  { id: 'canned-tomatoes', name: 'Canned tomatoes', category: 'staple', unit: '15 oz can', perUnitKcal: 80, price: 2.0, rate: 0.5, elNinoExposed: false },
  { id: 'frozen-eggs', name: 'Frozen eggs', category: 'staple', unit: '12 oz box', perUnitKcal: 510, price: 6.0, rate: 0.2, elNinoExposed: true },
  { id: 'butter', name: 'Butter', category: 'staple', unit: '8 oz tub', perUnitKcal: 1600, price: 2.5, rate: 0.05, elNinoExposed: false },
  { id: 'instant-coffee', name: 'Instant coffee', category: 'staple', unit: '16 oz canister', perUnitKcal: 0, price: 10.0, rate: 0.05, elNinoExposed: true },
  { id: 'cereal', name: 'Cereal', category: 'staple', unit: '12 oz box', perUnitKcal: 1050, price: 4.5, rate: 0.2, elNinoExposed: true },
]

// A sensible starter plan. This is NOT everything you need — it's a coherent
// first kit that the user then expands from the library. Quantities scale by
// head count and days (safety-first: quantities over-provision relative to the
// age-weighted calorie target, and "Scale to Target" dials it back to exactly
// the household calorie need).
export const DEFAULT_PLAN_FOOD_IDS = [
  'protein-bar', 'beans-rte', 'tuna', 'crackers', // no-cook
  'rice', 'potato-flakes', 'cooking-oil', // staples
]
