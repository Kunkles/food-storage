// Age tiers and their default emergency targets.
// "normalKcal" is the USDA recommended daily intake for the tier.
// "emergencyKcal" defaults to roughly 60% of normal — a sustained emergency
// minimum. Both are editable per person in the UI.
// Water rates are in gallons per person per day (drinking/cooking).
// Sources: USDA Dietary Reference Intakes, Ready.gov (1 gal/day minimum).
export const AGE_TIERS = [
  {
    id: 'infant',
    label: 'Infant',
    ageMin: 0,
    ageMax: 1,
    normalKcal: 500,
    emergencyKcal: 400,
    waterPerDay: 0.5, // mostly formula/breastmilk; figure covers formula prep water
    note: 'Formula or breastmilk required — plan for both plus your usual backup.',
  },
  {
    id: 'toddler',
    label: 'Toddler',
    ageMin: 1,
    ageMax: 3,
    normalKcal: 1000,
    emergencyKcal: 600,
    waterPerDay: 0.5,
    note: 'Keep familiar comfort foods; little ones get picky under stress.',
  },
  {
    id: 'child',
    label: 'Child',
    ageMin: 3,
    ageMax: 9,
    normalKcal: 1300,
    emergencyKcal: 800,
    waterPerDay: 0.5,
    note: '',
  },
  {
    id: 'preteen',
    label: 'Pre-teen',
    ageMin: 9,
    ageMax: 14,
    normalKcal: 1600,
    emergencyKcal: 1000,
    waterPerDay: 0.75,
    note: '',
  },
  {
    id: 'teen',
    label: 'Teen',
    ageMin: 14,
    ageMax: 20,
    normalKcal: 2200,
    emergencyKcal: 1200,
    waterPerDay: 1.0,
    note: 'Growing bodies burn fuel fast — aim at the high end if you can.',
  },
  {
    id: 'adult',
    label: 'Adult',
    ageMin: 20,
    ageMax: 65,
    normalKcal: 2200,
    emergencyKcal: 1200,
    waterPerDay: 1.0,
    note: '',
  },
  {
    id: 'senior',
    label: 'Senior',
    ageMin: 65,
    ageMax: 120,
    normalKcal: 1800,
    emergencyKcal: 1000,
    waterPerDay: 1.0,
    note: 'Dehydrates faster — keep a margin on water.',
  },
]

// Map an age (in years) to the matching tier. Out-of-range ages fall to the
// last tier (senior).
export function tierForAge(age) {
  const a = Number(age)
  if (Number.isNaN(a)) return AGE_TIERS[AGE_TIERS.length - 1]
  const t = AGE_TIERS.find((x) => a >= x.ageMin && a < x.ageMax)
  return t || AGE_TIERS[AGE_TIERS.length - 1]
}

let seq = 0
function uid() {
  // Use the Web Crypto UUID when available, fall back to a counter id.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${seq++}`
}

export function makePerson({ name = 'Person', age = 30, restrictions = '', kcalOverride = null, waterOverride = null } = {}) {
  const tier = tierForAge(age)
  return {
    id: uid(),
    name,
    age: Number(age),
    tier: tier.id,
    restrictions,
    emergencyKcal: kcalOverride ?? tier.emergencyKcal,
    waterPerDay: waterOverride ?? tier.waterPerDay,
  }
}
