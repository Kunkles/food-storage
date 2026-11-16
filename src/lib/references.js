// Loads a reference document: the live page when it can be reached, saving a
// copy each time; otherwise the latest saved copy; otherwise the copy that
// shipped with the app.
const CACHE = 'reference-docs'
const TIMEOUT_MS = 8000

async function openCache() {
  try {
    return await caches.open(CACHE)
  } catch {
    return null // no Cache Storage (private window, old browser)
  }
}

// Result: { mode, url?, html?, updated?, savedAt? }
//   mode 'live'     — url is the live page, just checked and saved
//   mode 'saved'    — html is the last copy saved while online
//   mode 'built-in' — url is the copy that came with this version of the app
//   mode 'none'     — nothing available
export async function loadReference(ref, base = import.meta.env.BASE_URL) {
  const cache = await openCache()
  try {
    const res = await fetch(ref.liveUrl, { cache: 'no-cache', signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const updated = res.headers.get('last-modified')
    const savedAt = new Date().toISOString()
    await cache?.put(ref.liveUrl, new Response(html, {
      headers: { 'content-type': 'text/html', 'x-saved-at': savedAt, ...(updated ? { 'x-updated': updated } : {}) },
    }))
    return { mode: 'live', url: ref.liveUrl, updated, savedAt }
  } catch {
    // Offline, or the page couldn't be reached — fall through to saved copies.
  }

  const saved = await cache?.match(ref.liveUrl)
  if (saved) {
    return {
      mode: 'saved',
      html: await saved.text(),
      updated: saved.headers.get('x-updated'),
      savedAt: saved.headers.get('x-saved-at'),
    }
  }

  const builtIn = `${base}${ref.snapshot}`
  try {
    const res = await fetch(builtIn)
    if (res.ok) return { mode: 'built-in', url: builtIn }
  } catch {
    /* not shipped with this build */
  }
  return { mode: 'none' }
}
