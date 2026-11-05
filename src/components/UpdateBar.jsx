// A bar along the bottom when a new version has downloaded, and a note when
// the device is offline.
export default function UpdateBar({ offline, online }) {
  if (offline.needRefresh) {
    return (
      <div className="update-bar no-print" role="status">
        <span>A new version of Food Storage is ready.</span>
        <button className="btn btn-primary" onClick={offline.applyUpdate}>Reload</button>
        <button className="btn btn-ghost" onClick={offline.dismissUpdate}>Later</button>
      </div>
    )
  }
  if (!online) {
    return (
      <div className="update-bar offline no-print" role="status">
        <span>You're offline. Everything still works, and changes are saved on this device.</span>
      </div>
    )
  }
  return null
}
