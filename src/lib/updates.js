// The build this copy of the app came from: { id, date }.
// eslint-disable-next-line no-undef
export const APP_BUILD = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : { id: 'dev', date: null }

export const fmtBuild = (build) => {
  const date = build.date
    ? new Date(build.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  return date ? `${build.id} · ${date}` : build.id
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Waits for a new service worker to finish downloading. Returns it, or null.
async function waitForWaiting(registration, timeoutMs) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    if (registration.waiting) return registration.waiting
    if (!registration.installing) return null
    await sleep(250)
  }
  return registration.waiting || null
}

// Asks the server which version is live and moves to it if this copy is older.
// Returns { status, latest? }:
//   'current'  — already the newest version
//   'updating' — the new version is being switched in (the page reloads)
//   'offline'  — couldn't reach the server
export async function checkForUpdates({
  current = APP_BUILD,
  base = import.meta.env.BASE_URL,
  registration = null,
  activate = () => {}, // switch to the waiting worker and reload
  hardReload = forceFreshCopy,
  fetchImpl = fetch,
  waitMs = 20000,
} = {}) {
  let latest
  try {
    const res = await fetchImpl(`${base}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    latest = await res.json()
  } catch {
    return { status: 'offline' }
  }
  if (latest.id === current.id) return { status: 'current', latest }

  // Newer version is out: have the service worker fetch it, then switch over.
  if (registration) {
    try {
      await registration.update()
    } catch {
      /* fall back below */
    }
    if (await waitForWaiting(registration, waitMs)) {
      activate()
      return { status: 'updating', latest }
    }
  }
  // No service worker, or it didn't pick up the new version: drop the saved
  // copy of the app (never your data, which is in localStorage) and reload.
  await hardReload()
  return { status: 'updating', latest }
}

// Clears the offline copy of the app so the next load comes from the server.
// Saved recipe photos and reference guides are kept.
export async function forceFreshCopy() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) || []
    await Promise.all(regs.map((r) => r.unregister()))
  } catch {
    /* no service workers */
  }
  try {
    const names = await caches.keys()
    await Promise.all(names.filter((n) => n.startsWith('workbox-precache')).map((n) => caches.delete(n)))
  } catch {
    /* no Cache Storage */
  }
  window.location.reload()
}
