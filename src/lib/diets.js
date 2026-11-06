// Checks foods and recipes against each person's allergies and diets.
// Pure functions — no React, no DOM.
import { RESTRICTIONS } from '../data/diets.js'

const byId = Object.fromEntries(RESTRICTIONS.map((r) => [r.id, r]))

// The restriction ids set for a person (older saved people have none).
export function personRestrictions(person) {
  return [...(person.allergies || []), ...(person.diets || [])].filter((id) => byId[id])
}

// How a single piece of text trips a restriction: null, or { caution, note }.
export function checkText(restriction, text) {
  const t = String(text || '').toLowerCase()
  for (const rule of restriction.rules) {
    if (rule.re.test(t) && !(rule.not && rule.not.test(t))) {
      return rule.caution ? { caution: true, note: rule.note } : { caution: false }
    }
  }
  return null
}

// items: [{ label, text, optional? }] — label is what to show, text what to check.
// Returns one issue per restriction someone has that any item trips:
//   { restriction, people: [names], hits: [{ label, optional, caution, note }], level }
// level: 'avoid'     — has something they can't have
//        'leave-out' — only optional ingredients, which can be skipped
//        'limit'     — a low-salt/low-sugar diet, or "check the label" cases
export function dietIssues(items, people) {
  const who = {}
  for (const p of people) {
    for (const id of personRestrictions(p)) (who[id] ||= []).push(p.name || 'Someone')
  }
  const issues = []
  for (const [id, names] of Object.entries(who)) {
    const restriction = byId[id]
    const hits = []
    for (const item of items) {
      const hit = checkText(restriction, item.text)
      if (hit) hits.push({ label: item.label, optional: !!item.optional, ...hit })
    }
    if (!hits.length) continue
    const firm = hits.filter((h) => !h.caution)
    let level
    if (restriction.level === 'limit' || firm.length === 0) level = 'limit'
    else if (firm.every((h) => h.optional)) level = 'leave-out'
    else level = 'avoid'
    issues.push({ restriction, people: names, hits, level })
  }
  const rank = { avoid: 0, 'leave-out': 1, limit: 2 }
  return issues.sort((a, b) => rank[a.level] - rank[b.level])
}

// The people a set of issues rules a dish out for.
export function avoidedBy(issues) {
  return [...new Set(issues.filter((i) => i.level === 'avoid').flatMap((i) => i.people))]
}

// A recipe's ingredients as items to check: the app's names for stored foods
// and pantry extras (with the recipe's own wording), and the other lines.
export function recipeItems(status) {
  return [
    ...status.storage.map((i) => ({ label: i.name, text: `${i.name} ${i.as || ''}`, optional: i.optional })),
    ...status.extras.map((i) => ({ label: i.name, text: `${i.name} ${i.as || ''}`, optional: i.optional })),
    ...status.others.map((i) => ({ label: i.name, text: i.name, optional: i.optional })),
  ]
}

// Short wording for a person's restrictions: "wheat allergy, vegetarian".
export function describePerson(person) {
  return personRestrictions(person).map((id) => {
    const r = byId[id]
    return r.kind === 'allergy' ? `${r.label.toLowerCase()} allergy` : r.label.toLowerCase()
  })
}
