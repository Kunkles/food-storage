// Using the app offline: install it, whether it's ready without internet, and
// keeping the data on this device from being cleared.
export default function OfflineCard({ offline }) {
  const o = offline
  return (
    <section className="card no-print">
      <h3>Use it offline</h3>
      <p className="hint">
        Install Food Storage to keep the whole app on this device. It works with no internet,
        your list stays here, and it updates itself when you're back online.
      </p>
      <ul className="tips">
        <li>
          <strong>Works offline:</strong>{' '}
          {o.ready
            ? <span className="badge badge-ok">Ready</span>
            : 'getting ready — keep this page open with internet for a moment'}
        </li>
        <li>
          <strong>Installed:</strong>{' '}
          {o.installed ? (
            <span className="badge badge-ok">Yes</span>
          ) : o.canInstall ? (
            <button className="btn btn-primary" onClick={o.install}>Install app</button>
          ) : o.ios ? (
            <>In Safari tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.</>
          ) : (
            <>Use your browser's <strong>Install</strong> option (in the address bar or menu), or{' '}
              <strong>Add to Home Screen</strong> on a phone.</>
          )}
        </li>
        {o.persisted !== null && (
          <li>
            <strong>Data protected on this device:</strong>{' '}
            {o.persisted ? (
              <span className="badge badge-ok">Yes</span>
            ) : (
              <button className="btn" onClick={o.keepData}>Keep my data from being cleared</button>
            )}
          </li>
        )}
      </ul>
      {o.ios && !o.installed && (
        <p className="hint">
          On iPhone, the home-screen app keeps its own copy of your data, separate from Safari. Sign in
          with Google or use Download backup / Load backup to bring your list across.
        </p>
      )}
    </section>
  )
}
