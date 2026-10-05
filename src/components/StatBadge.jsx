// A colored pill showing how the plan covers the calorie target.
export default function StatBadge({ status, ratio }) {
  const label =
    {
      ok: 'On target',
      warn: 'A bit short',
      danger: 'Under-provisioned',
    }[status] || status
  const pct = ratio != null ? ` · ${Math.round(ratio * 100)}%` : ''
  return <span className={`badge badge-${status}`}>{label}{pct}</span>
}
