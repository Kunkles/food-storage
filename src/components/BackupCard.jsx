import { useRef, useState } from 'react'
import { backupFilename, makeBackup, parseBackup } from '../lib/backup.js'

const SYNC_LABELS = {
  signedOut: null,
  reconnect: 'Not connected right now',
  working: 'Saving…',
  synced: 'Saved to Google Drive',
  error: "Couldn't save",
}

// Backup + sync: download your list as a file, load one back, and (when the
// app is set up with a Google client ID) keep it saved in your Google Drive.
export default function BackupCard({ snapshot, applyData, drive }) {
  const fileInput = useRef(null)
  const [message, setMessage] = useState(null)

  const onExport = () => {
    const blob = new Blob([JSON.stringify(makeBackup(snapshot), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFilename()
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ ok: true, text: `Downloaded ${a.download}.` })
  }

  const onImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { savedAt, data } = parseBackup(await file.text())
      const when = savedAt ? ` from ${new Date(savedAt).toLocaleString()}` : ''
      if (!window.confirm(`Load the backup${when}? This replaces everything in this browser.`)) return
      applyData(data)
      setMessage({ ok: true, text: `Loaded ${file.name}.` })
    } catch (err) {
      setMessage({ ok: false, text: err.message })
    }
  }

  return (
    <section className="card no-print">
      <h3>Backup &amp; sync</h3>
      <p className="hint">
        Your list lives only in this browser. Download a backup file to keep it safe or move it
        to another device{drive.status !== 'unconfigured' && ', or sign in with Google to keep it saved automatically'}.
      </p>

      <div className="toolbar">
        <button className="btn" onClick={onExport}>Download backup</button>
        <button className="btn" onClick={() => fileInput.current?.click()}>Load backup…</button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
      </div>
      {message && <p className={message.ok ? 'hint' : 'hint sync-error'}>{message.text}</p>}

      {drive.status !== 'unconfigured' && (
        <div className="sync-row">
          {drive.status === 'signedOut' ? (
            <button className="btn btn-primary" onClick={drive.connect}>Sign in with Google</button>
          ) : (
            <>
              <span className={`badge ${drive.status === 'synced' ? 'badge-ok' : drive.status === 'error' ? 'badge-danger' : 'badge-warn'}`}>
                {SYNC_LABELS[drive.status]}
              </span>
              <span className="hint">
                {drive.email}
                {drive.lastSyncedAt && ` · last saved ${new Date(drive.lastSyncedAt).toLocaleString()}`}
              </span>
              {drive.status === 'reconnect' && (
                <button className="btn btn-primary" onClick={drive.connect}>Reconnect</button>
              )}
              {drive.status === 'error' && (
                <button className="btn" onClick={drive.saveNow}>Try again</button>
              )}
              <button className="btn btn-ghost" onClick={drive.disconnect}>Sign out</button>
            </>
          )}
        </div>
      )}
      {drive.error && <p className="hint sync-error">{drive.error}</p>}
      {drive.status === 'reconnect' && drive.dirty && (
        <p className="hint">You have changes that aren't in Drive yet — reconnect to save them.</p>
      )}
    </section>
  )
}
