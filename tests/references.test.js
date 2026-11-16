import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadReference } from '../src/lib/references.js'
import { REFERENCES } from '../src/data/references.js'

const ref = REFERENCES[0]

// A small stand-in for the browser's Cache Storage.
function fakeCaches() {
  const store = new Map()
  return {
    open: async () => ({
      put: async (url, res) => { store.set(url, { body: await res.text(), headers: Object.fromEntries(res.headers) }) },
      match: async (url) => {
        const hit = store.get(url)
        return hit ? new Response(hit.body, { headers: hit.headers }) : undefined
      },
    }),
  }
}

describe('reference documents', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', fakeCaches())
  })

  it('shows the live page and saves a copy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<h1>v2</h1>', { headers: { 'last-modified': 'Fri, 13 Nov 2026 17:18:21 GMT' } })))
    const doc = await loadReference(ref, '/food-storage/')
    expect(doc).toMatchObject({ mode: 'live', url: ref.liveUrl, updated: 'Fri, 13 Nov 2026 17:18:21 GMT' })

    // Offline next time: the saved copy comes back.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    const offline = await loadReference(ref, '/food-storage/')
    expect(offline).toMatchObject({ mode: 'saved', html: '<h1>v2</h1>', updated: 'Fri, 13 Nov 2026 17:18:21 GMT' })
    expect(offline.savedAt).toBeTruthy()
  })

  it('falls back to the copy that shipped with the app', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url === ref.liveUrl) throw new TypeError('offline')
      return new Response('<h1>built in</h1>')
    })
    vi.stubGlobal('fetch', fetchMock)
    const doc = await loadReference(ref, '/food-storage/')
    expect(doc).toEqual({ mode: 'built-in', url: `/food-storage/${ref.snapshot}` })
  })

  it('says when nothing is available', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    expect(await loadReference(ref, '/food-storage/')).toEqual({ mode: 'none' })
  })
})
