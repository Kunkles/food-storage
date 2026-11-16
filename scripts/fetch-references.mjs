// Saves a copy of each reference document into public/ before a build, so
// the app ships with it and the Reference tab works offline from the start.
// If a document can't be fetched, the build goes on without it (or with the
// copy already there) and the tab falls back to whatever it has.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REFERENCES } from '../src/data/references.js'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

for (const ref of REFERENCES) {
  const out = join(publicDir, ref.snapshot)
  try {
    const res = await fetch(ref.liveUrl, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    await mkdir(dirname(out), { recursive: true })
    await writeFile(out, html)
    console.log(`reference: saved ${ref.title} (${Math.round(html.length / 1024)} KB)`)
  } catch (err) {
    console.warn(`reference: couldn't fetch ${ref.title} (${err.message}) — building without a fresh copy`)
  }
}
