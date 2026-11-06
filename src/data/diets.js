// Allergies and diets you can set for each person, and the ingredient words
// that signal each one. Ingredients are matched by name, so a recipe or food
// that says "White flour" or "Soy sauce" is caught for a wheat allergy.
//
// level: 'avoid' — the person shouldn't eat it at all
//        'limit' — fine in small amounts (low-salt, low-sugar)
// A rule with caution: true is a "check the label" case, shown with its note.
//
// This is a helper, not a guarantee: always read the labels on what you buy.

const MILK = { re: /milk|cheese|cheddar|parmesan|mozzarella|butter|cream|yogh?urt|whey|ghee|casein/, not: /peanut butter|almond butter|nut butter|cocoa butter|butter beans|coconut milk|almond milk|oat milk|soy milk|rice milk|cream of tartar/ }
const EGGS = { re: /\beggs?\b|mayonnaise|meringue/ }
const WHEAT = {
  re: /wheat|flour|macaroni|spaghetti|pasta|noodle|couscous|bulgu?r|semolina|bread|cracker|tortilla|soy sauce|soya sauce|biscuit|penne|linguine|fettuccine|tagliatelle|orzo|seitan|pretzel/,
  not: /(rice|corn|almond|coconut|chickpea|oat|potato|tapioca|buckwheat) flour|cornflour|gluten-free|rice noodle/,
}
const MEAT = {
  re: /chicken|beef|pork|\bham\b|bacon|lamb|mutton|turkey|sausage|chorizo|salami|pepperoni|prosciutto|pancetta|\bmince|steak|veal|duck|venison|jerky|gelatin|\blard\b|\bmeat\b|anchov|fish|salmon|tuna|\bcod\b|shrimp|prawn|crab|lobster|clam|mussel|oyster|scallop|sardine/,
  not: /or vegetable|vegetable (stock|broth|bouillon)/,
}

export const ALLERGIES = [
  { id: 'milk', label: 'Milk', rules: [MILK] },
  { id: 'eggs', label: 'Eggs', rules: [EGGS] },
  { id: 'wheat', label: 'Wheat', rules: [WHEAT] },
  { id: 'soy', label: 'Soy', rules: [{ re: /\bsoy|soya|tofu|edamame|miso|tamari|tempeh/ }] },
  { id: 'peanuts', label: 'Peanuts', rules: [{ re: /peanut/ }, { re: /trail mix|granola/, caution: true, note: 'often has peanuts — check the label' }] },
  { id: 'tree-nuts', label: 'Tree nuts', rules: [{ re: /almond|walnut|pecan|cashew|pistachio|hazelnut|macadamia|pine nut|brazil nut|praline|marzipan/ }, { re: /trail mix|granola/, caution: true, note: 'often has nuts — check the label' }] },
  { id: 'fish', label: 'Fish', rules: [{ re: /fish|salmon|tuna|\bcod\b|anchov|sardine|haddock|tilapia|trout|mackerel|worcestershire/ }] },
  { id: 'shellfish', label: 'Shellfish', rules: [{ re: /shrimp|prawn|crab|lobster|clam|mussel|oyster|scallop|crayfish|langoustine/ }] },
  { id: 'sesame', label: 'Sesame', rules: [{ re: /sesame|tahini|halva|hummus/ }] },
].map((a) => ({ ...a, kind: 'allergy', level: 'avoid' }))

export const DIETS = [
  { id: 'vegetarian', label: 'Vegetarian', level: 'avoid', rules: [MEAT, { re: /bouillon|\bstock\b|broth/, caution: true, note: 'use vegetable bouillon' }] },
  { id: 'vegan', label: 'Vegan', level: 'avoid', rules: [MEAT, MILK, EGGS, { re: /honey/ }, { re: /bouillon|\bstock\b|broth/, caution: true, note: 'use vegetable bouillon' }] },
  {
    id: 'gluten-free', label: 'Gluten-free', level: 'avoid',
    rules: [WHEAT, { re: /barley|\brye\b|malt/ }, { re: /\boats?\b|oatmeal|granola/, caution: true, note: 'only oats labeled gluten-free' }, { re: /bouillon|\bstock\b|broth/, caution: true, note: 'check the label for wheat' }],
  },
  { id: 'no-pork', label: 'No pork', level: 'avoid', rules: [{ re: /pork|\bham\b|bacon|\blard\b|sausage|chorizo|salami|pepperoni|prosciutto|pancetta|gelatin/ }] },
  { id: 'low-salt', label: 'Low-salt', level: 'limit', rules: [{ re: /\bsalt\b|bouillon|\bstock\b|broth|soy sauce|soya sauce/ }] },
  { id: 'low-sugar', label: 'Low-sugar / diabetic', level: 'limit', rules: [{ re: /sugar|honey|syrup|juice|\bjam\b|candy|chocolate|cocoa/, not: /sugar-free|no sugar/ }] },
].map((d) => ({ ...d, kind: 'diet' }))

export const RESTRICTIONS = [...ALLERGIES, ...DIETS]
