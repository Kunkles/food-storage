import { useCallback, useEffect, useState } from 'react'
import { REFERENCES } from '../data/references.js'
import { loadReference } from '../lib/references.js'

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null)

function statusText(doc) {
  const updated = fmtDate(doc.updated)
  if (doc.mode === 'live') return `Live — the current online version${updated ? `, last changed ${updated}` : ''}. A copy is saved for offline.`
  if (doc.mode === 'saved') return `Offline — showing the copy saved ${fmtDate(doc.savedAt)}${updated ? ` (version from ${updated})` : ''}. It updates next time you're online.`
  if (doc.mode === 'built-in') return "Offline — showing the copy that came with the app. Open this tab once while online to get the latest."
  return "Couldn't load this document. Connect to the internet and try again."
}

// Reference documents kept with the app: the live page when online, the
// latest saved copy when not.
export default function ReferenceView() {
  const [selected, setSelected] = useState(REFERENCES[0].id)
  const [doc, setDoc] = useState(null)
  const ref = REFERENCES.find((r) => r.id === selected)

  const load = useCallback(() => {
    setDoc(null)
    loadReference(ref).then(setDoc)
  }, [ref])
  useEffect(load, [load])

  return (
    <>
      <section className="card no-print">
        <h3>Reference</h3>
        <p className="hint">
          Guides you keep with your preparedness plan. Each one shows the latest online version when
          you have internet, and a saved copy when you don't.
        </p>
        {REFERENCES.length > 1 && (
          <div className="chips">
            {REFERENCES.map((r) => (
              <button key={r.id} type="button" className={r.id === selected ? 'chip on' : 'chip'} onClick={() => setSelected(r.id)}>
                {r.title}
              </button>
            ))}
          </div>
        )}
        <h4 style={{ margin: '10px 0 2px' }}>{ref.title}</h4>
        <p className="hint" style={{ marginTop: 0 }}>{ref.description}</p>
        <div className="toolbar">
          {doc ? (
            <span className={`badge ${doc.mode === 'live' ? 'badge-ok' : doc.mode === 'none' ? 'badge-danger' : 'badge-warn'}`}>
              {doc.mode === 'live' ? 'Up to date' : doc.mode === 'none' ? 'Not available' : 'Saved copy'}
            </span>
          ) : (
            <span className="badge badge-muted">Checking for updates…</span>
          )}
          <button className="btn" onClick={load} disabled={!doc}>Check for updates</button>
          <a className="btn" href={ref.liveUrl} target="_blank" rel="noreferrer">Open in its own tab</a>
        </div>
        {doc && <p className="hint">{statusText(doc)}</p>}
      </section>

      {doc && doc.mode !== 'none' && (
        <iframe
          key={`${ref.id}-${doc.mode}-${doc.savedAt || ''}`}
          className="reference-frame"
          title={ref.title}
          {...(doc.html ? { srcDoc: doc.html } : { src: doc.url })}
        />
      )}
    </>
  )
}
