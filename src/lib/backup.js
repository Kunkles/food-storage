// Backups: everything the app keeps in localStorage, as one JSON document.
// Used by the export/import file buttons and by Google Drive sync, so a file
// you download and the copy in your Drive are the same format.

// The localStorage keys that hold the user's data. Anything not listed here
// (UI state, sync bookkeeping) stays out of backups.
export const BACKUP_KEYS = [
  'food.people',
  'food.days',
  'food.hygieneWater',
  'food.plan',
  'food.library',
  'food.stock',
  'food.inventory',
  'food.waterOnHand',
]

const APP_TAG = 'food-storage'
const VERSION = 1

export function makeBackup(data, now = new Date()) {
  const picked = {}
  for (const key of BACKUP_KEYS) {
    if (data[key] !== undefined) picked[key] = data[key]
  }
  return { app: APP_TAG, version: VERSION, savedAt: now.toISOString(), data: picked }
}

// Parses a backup from text. Throws an Error with a message fit to show the
// user when the text isn't a backup from this app.
export function parseBackup(text) {
  let doc
  try {
    doc = JSON.parse(text)
  } catch (e) {
    throw new Error("That file isn't a Food Storage backup (it isn't valid JSON).")
  }
  if (!doc || doc.app !== APP_TAG || typeof doc.data !== 'object' || doc.data === null) {
    throw new Error("That file isn't a Food Storage backup.")
  }
  if (doc.version > VERSION) {
    throw new Error('That backup is from a newer version of the app. Reload the page and try again.')
  }
  const data = {}
  for (const key of BACKUP_KEYS) {
    if (doc.data[key] !== undefined) data[key] = doc.data[key]
  }
  return { savedAt: doc.savedAt || null, data }
}

export function backupFilename(now = new Date()) {
  return `food-storage-${now.toISOString().slice(0, 10)}.json`
}

// What to do when connecting to Drive, from what we know about both copies:
//   driveSavedAt  — savedAt of the copy in Drive (null if there isn't one)
//   lastSyncedAt  — savedAt of the copy this browser last saved or loaded
//   dirty         — this browser has changes it hasn't saved to Drive
// Returns 'upload', 'download', 'none', or 'ask' when both sides changed (or
// this browser has never synced) and the user has to pick which list to keep.
export function decideSync({ driveSavedAt, lastSyncedAt, dirty }) {
  if (!driveSavedAt) return 'upload'
  if (driveSavedAt === lastSyncedAt) return dirty ? 'upload' : 'none'
  if (!lastSyncedAt || dirty) return 'ask'
  return 'download'
}
