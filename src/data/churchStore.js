// Church of Jesus Christ online store (Home Storage Center) products.
//
// These come sealed for long-term storage: #10 cans with an oxygen absorber
// already inside, or foil pouches. Net weights and calories are ESTIMATES —
// worked from typical #10 can fill weights and USDA kcal per 100 g — so check
// the label on your own cans and edit kcal/unit in the On Hand tab.
//
// "category" matches the food library: 'staple' for things you cook,
// 'noCook' for things you can eat dry or just add water to.
// 'supply' items carry no calories and don't count toward days covered.
export const CHURCH_STORE_PRODUCTS = [
  { id: 'cs-hard-white-wheat', name: 'Hard white wheat', category: 'staple', unit: '#10 can (~5.6 lb)', perUnitKcal: 8400 },
  { id: 'cs-hard-red-wheat', name: 'Hard red wheat', category: 'staple', unit: '#10 can (~5.6 lb)', perUnitKcal: 8400 },
  { id: 'cs-white-flour', name: 'White flour', category: 'staple', unit: '#10 can (~4.4 lb)', perUnitKcal: 7300 },
  { id: 'cs-white-rice', name: 'White rice', category: 'staple', unit: '#10 can (~5.7 lb)', perUnitKcal: 9300 },
  { id: 'cs-black-beans', name: 'Black beans', category: 'staple', unit: '#10 can (~5.4 lb)', perUnitKcal: 8300 },
  { id: 'cs-white-beans', name: 'White beans', category: 'staple', unit: '#10 can (~5.4 lb)', perUnitKcal: 8300 },
  { id: 'cs-pinto-beans', name: 'Pinto beans', category: 'staple', unit: '#10 can (~5.4 lb)', perUnitKcal: 8500 },
  { id: 'cs-regular-oats', name: 'Regular oats', category: 'staple', unit: '#10 can (~2.6 lb)', perUnitKcal: 4500 },
  { id: 'cs-quick-oats', name: 'Quick oats', category: 'staple', unit: '#10 can (~2.6 lb)', perUnitKcal: 4500 },
  { id: 'cs-macaroni', name: 'Macaroni', category: 'staple', unit: '#10 can (~3.6 lb)', perUnitKcal: 6000 },
  { id: 'cs-spaghetti-bites', name: 'Spaghetti bites', category: 'staple', unit: '#10 can (~3.6 lb)', perUnitKcal: 6000 },
  { id: 'cs-sugar', name: 'Sugar', category: 'staple', unit: '#10 can (~5.6 lb)', perUnitKcal: 9800 },
  { id: 'cs-potato-flakes', name: 'Potato flakes', category: 'noCook', unit: '#10 can (~1.75 lb)', perUnitKcal: 2800 },
  { id: 'cs-apple-slices', name: 'Apple slices', category: 'noCook', unit: '#10 can (~0.85 lb)', perUnitKcal: 1300 },
  { id: 'cs-strawberry-slices', name: 'Strawberry slices', category: 'noCook', unit: '#10 can (~0.5 lb)', perUnitKcal: 800 },
  { id: 'cs-carrots', name: 'Carrots', category: 'staple', unit: '#10 can (~2.2 lb)', perUnitKcal: 3400 },
  { id: 'cs-onions', name: 'Onions', category: 'staple', unit: '#10 can (~1.75 lb)', perUnitKcal: 2800 },
  { id: 'cs-nonfat-dry-milk', name: 'Nonfat dry milk', category: 'noCook', unit: 'pouch (~1.25 lb)', perUnitKcal: 2000 },

  { id: 'cs-oxygen-absorbers', name: 'Oxygen absorber packets', category: 'supply', unit: 'pack', perUnitKcal: 0 },
  { id: 'cs-foil-pouch', name: 'Food storage foil pouch', category: 'supply', unit: 'pouch', perUnitKcal: 0 },
  { id: 'cs-water-bottle-filter', name: 'WaterBasics Redline bottle with filter', category: 'supply', unit: 'bottle', perUnitKcal: 0 },
  { id: 'cs-water-filter', name: 'WaterBasics Red Line extra filter', category: 'supply', unit: 'filter', perUnitKcal: 0 },
]

// Orders you've placed, ready to import into On Hand in one click.
// qty is in the product's unit (cans, pouches, packs), so a "case of 6 cans"
// is 6 and a "case of 12 pouches" is 12.
export const CHURCH_STORE_ORDERS = [
  {
    id: 'church-store-2026-10-27',
    label: 'Church store order, Oct 27 2026',
    date: '2026-10-27',
    items: [
      { productId: 'cs-strawberry-slices', qty: 6 },
      { productId: 'cs-hard-white-wheat', qty: 6 },
      { productId: 'cs-white-flour', qty: 6 },
      { productId: 'cs-hard-red-wheat', qty: 6 },
      { productId: 'cs-apple-slices', qty: 6 },
      { productId: 'cs-carrots', qty: 6 },
      { productId: 'cs-onions', qty: 6 },
      { productId: 'cs-potato-flakes', qty: 6 },
      { productId: 'cs-white-rice', qty: 6 },
      { productId: 'cs-black-beans', qty: 6 },
      { productId: 'cs-white-beans', qty: 6 },
      { productId: 'cs-pinto-beans', qty: 6 },
      { productId: 'cs-regular-oats', qty: 6 },
      { productId: 'cs-quick-oats', qty: 6 },
      { productId: 'cs-spaghetti-bites', qty: 6 },
      { productId: 'cs-macaroni', qty: 6 },
      { productId: 'cs-sugar', qty: 6 },
      { productId: 'cs-nonfat-dry-milk', qty: 36 }, // 3 cases of 12
      { productId: 'cs-oxygen-absorbers', qty: 5 },
      { productId: 'cs-foil-pouch', qty: 10 },
      { productId: 'cs-water-bottle-filter', qty: 3 },
      { productId: 'cs-water-filter', qty: 4 },
    ],
  },
]
