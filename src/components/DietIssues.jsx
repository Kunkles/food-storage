// What in a dish or food doesn't fit someone's allergies or diet.
const name = (r) => (r.kind === 'allergy' ? `${r.label} allergy` : r.label)

function hitList(hits) {
  return hits
    .map((h) => `${h.label}${h.caution && h.note ? ` (${h.note})` : h.optional ? ' (optional)' : ''}`)
    .join(', ')
}

export function issueText(issue) {
  const who = issue.people.join(', ')
  const firm = issue.hits.filter((h) => !h.caution)
  const label = `${name(issue.restriction)} — ${who}`
  if (issue.level === 'avoid') return { cls: 'avoid', text: `⚠ ${label}: ${hitList(firm)}` }
  if (issue.level === 'leave-out') return { cls: '', text: `${label}: leave out ${hitList(firm)}` }
  if (issue.restriction.level === 'limit') return { cls: '', text: `${label}: go easy on ${hitList(issue.hits)}` }
  return { cls: '', text: `${label}: check ${hitList(issue.hits)}` }
}

export default function DietIssues({ issues }) {
  if (!issues.length) return null
  return (
    <ul className="diet-issues">
      {issues.map((issue) => {
        const { cls, text } = issueText(issue)
        return <li key={issue.restriction.id} className={cls}>{text}</li>
      })}
    </ul>
  )
}
