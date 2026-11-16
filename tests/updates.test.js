import { describe, it, expect, vi } from 'vitest'
import { checkForUpdates, fmtBuild } from '../src/lib/updates.js'

const current = { id: 'aaa1111', date: '2026-11-15T12:00:00Z' }
const live = (build) => vi.fn(async () => new Response(JSON.stringify(build)))

describe('checking for updates', () => {
  it('says so when this is the newest version', async () => {
    const hardReload = vi.fn()
    const r = await checkForUpdates({ current, base: '/', fetchImpl: live(current), hardReload })
    expect(r.status).toBe('current')
    expect(hardReload).not.toHaveBeenCalled()
  })

  it('switches to the new service worker when one downloads', async () => {
    const registration = { waiting: null, installing: null, update: vi.fn(async () => { registration.waiting = {} }) }
    const activate = vi.fn()
    const hardReload = vi.fn()
    const r = await checkForUpdates({ current, base: '/', registration, activate, hardReload, fetchImpl: live({ id: 'bbb2222' }) })
    expect(r).toMatchObject({ status: 'updating', latest: { id: 'bbb2222' } })
    expect(activate).toHaveBeenCalled()
    expect(hardReload).not.toHaveBeenCalled()
  })

  it('reloads a fresh copy when the service worker is stuck on the old one', async () => {
    const registration = { waiting: null, installing: null, update: vi.fn(async () => {}) }
    const hardReload = vi.fn()
    const r = await checkForUpdates({ current, base: '/', registration, hardReload, fetchImpl: live({ id: 'bbb2222' }) })
    expect(r.status).toBe('updating')
    expect(hardReload).toHaveBeenCalled()
  })

  it('reports offline when the server cannot be reached', async () => {
    const r = await checkForUpdates({ current, base: '/', fetchImpl: vi.fn(async () => { throw new TypeError('offline') }) })
    expect(r.status).toBe('offline')
  })

  it('shows the version id and date', () => {
    expect(fmtBuild(current)).toMatch(/^aaa1111 · Nov 1[45], 2026$/)
    expect(fmtBuild({ id: 'dev', date: null })).toBe('dev')
  })
})
