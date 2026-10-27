import { describe, it, expect } from 'vitest'
import { BACKUP_KEYS, makeBackup, parseBackup, backupFilename, decideSync } from '../src/lib/backup.js'

const now = new Date('2026-10-27T20:00:00Z')

describe('backup files', () => {
  it('round-trips the app data and drops keys that are not backed up', () => {
    const data = { 'food.days': 14, 'food.inventory': [{ name: 'Rice', qty: 6 }], 'food.sync': { dirty: true } }
    const text = JSON.stringify(makeBackup(data, now))
    const parsed = parseBackup(text)
    expect(parsed.savedAt).toBe('2026-10-27T20:00:00.000Z')
    expect(parsed.data).toEqual({ 'food.days': 14, 'food.inventory': [{ name: 'Rice', qty: 6 }] })
  })
  it('covers the inventory and water added for On Hand', () => {
    expect(BACKUP_KEYS).toContain('food.inventory')
    expect(BACKUP_KEYS).toContain('food.waterOnHand')
  })
  it('rejects text that is not a backup', () => {
    expect(() => parseBackup('not json')).toThrow(/valid JSON/)
    expect(() => parseBackup('{"hello": 1}')).toThrow(/isn't a Food Storage backup/)
    expect(() => parseBackup(JSON.stringify({ app: 'food-storage', version: 99, data: {} }))).toThrow(/newer version/)
  })
  it('names the file by date', () => {
    expect(backupFilename(now)).toBe('food-storage-2026-10-27.json')
  })
})

describe('decideSync', () => {
  const a = '2026-10-27T20:00:00.000Z'
  const b = '2026-10-28T09:00:00.000Z'
  it('uploads when Drive has nothing yet', () => {
    expect(decideSync({ driveSavedAt: null, lastSyncedAt: null, dirty: false })).toBe('upload')
  })
  it('does nothing, or uploads local changes, when Drive is unchanged', () => {
    expect(decideSync({ driveSavedAt: a, lastSyncedAt: a, dirty: false })).toBe('none')
    expect(decideSync({ driveSavedAt: a, lastSyncedAt: a, dirty: true })).toBe('upload')
  })
  it('downloads when only Drive changed', () => {
    expect(decideSync({ driveSavedAt: b, lastSyncedAt: a, dirty: false })).toBe('download')
  })
  it('asks when both changed or this browser never synced', () => {
    expect(decideSync({ driveSavedAt: b, lastSyncedAt: a, dirty: true })).toBe('ask')
    expect(decideSync({ driveSavedAt: b, lastSyncedAt: null, dirty: false })).toBe('ask')
  })
})
