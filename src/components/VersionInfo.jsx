import { fmtBuild } from '../lib/updates.js'

const STATUS = {
  checking: 'Checking…',
  current: "You're on the latest version.",
  updating: 'Getting the new version…',
  offline: "Couldn't check — you're offline or the site couldn't be reached.",
}

// Which version this is, and a button to move to the newest one now.
export default function VersionInfo({ offline, compact = false }) {
  const o = offline
  const status = o.updateStatus
  return (
    <span className="version-info">
      {compact ? 'Version ' : null}
      <strong>{fmtBuild(o.build)}</strong>{' '}
      <button
        className={compact ? 'btn btn-small' : 'btn'}
        onClick={o.checkUpdates}
        disabled={status === 'checking' || status === 'updating'}
      >
        Check for updates
      </button>
      {status && (
        <span className="hint version-status" role="status">
          {' '}{STATUS[status]}
          {status === 'updating' && o.latest ? ` (${fmtBuild(o.latest)})` : null}
        </span>
      )}
    </span>
  )
}
