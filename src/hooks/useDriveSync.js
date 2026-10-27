import { useCallback, useEffect, useRef, useState } from 'react'
import { decideSync, makeBackup, parseBackup } from '../lib/backup.js'
import {
  DriveError, downloadBackup, driveUserEmail, findBackupFile,
  requestToken, revokeToken, uploadBackup,
} from '../lib/googleDrive.js'

// Set at build time; without it the Google section stays hidden.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const META_KEY = 'food.sync'
const SAVE_DELAY_MS = 1500

function readMeta() {
  try {
    return JSON.parse(window.localStorage.getItem(META_KEY)) || {}
  } catch (e) {
    return {}
  }
}

const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString() : 'an unknown time')

// Keeps the app's data in sync with the signed-in person's Google Drive.
//   snapshot  — the current data, keyed by localStorage key (see BACKUP_KEYS)
//   applyData — replaces the app's data with a loaded copy
// Status: 'unconfigured' | 'signedOut' | 'reconnect' | 'working' | 'synced' | 'error'
export function useDriveSync(snapshot, applyData) {
  const [meta, setMetaState] = useState(readMeta)
  const metaRef = useRef(meta)
  const updateMeta = useCallback((patch) => {
    metaRef.current = { ...metaRef.current, ...patch }
    try {
      window.localStorage.setItem(META_KEY, JSON.stringify(metaRef.current))
    } catch (e) {
      /* storage blocked — sync still works for this visit */
    }
    setMetaState(metaRef.current)
  }, [])

  const [status, setStatus] = useState(() =>
    !CLIENT_ID ? 'unconfigured' : meta.connected ? 'reconnect' : 'signedOut'
  )
  const [error, setError] = useState(null)

  const tokenRef = useRef(null)
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot
  const firstRun = useRef(true)
  const skipNext = useRef(false)
  const timer = useRef(null)
  const queue = useRef(Promise.resolve())

  const tokenValid = () => tokenRef.current && tokenRef.current.expiresAt - 60000 > Date.now()

  const fail = useCallback((e) => {
    if (e instanceof DriveError && e.status === 401) {
      tokenRef.current = null
      setStatus('reconnect')
    } else {
      setStatus('error')
    }
    setError(e.message)
  }, [])

  // Saves the current data to Drive. Queued so saves land in order.
  const push = useCallback(() => {
    queue.current = queue.current.then(async () => {
      if (!tokenValid()) {
        setStatus('reconnect')
        return
      }
      setStatus('working')
      try {
        const backup = makeBackup(snapshotRef.current)
        const fileId = await uploadBackup(tokenRef.current.token, metaRef.current.fileId, JSON.stringify(backup))
        updateMeta({ fileId, lastSyncedAt: backup.savedAt, dirty: false })
        setStatus('synced')
        setError(null)
      } catch (e) {
        fail(e)
      }
    })
    return queue.current
  }, [fail, updateMeta])

  // Every change marks the data unsaved and, when signed in, saves it shortly after.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    if (skipNext.current) {
      skipNext.current = false
      return
    }
    if (status === 'unconfigured') return
    if (!metaRef.current.dirty) updateMeta({ dirty: true })
    if (!tokenValid()) return
    clearTimeout(timer.current)
    timer.current = setTimeout(push, SAVE_DELAY_MS)
  }, [snapshot]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(timer.current), [])

  // Sign in (or reconnect), then reconcile this browser's list with Drive's.
  const connect = useCallback(async () => {
    setError(null)
    try {
      tokenRef.current = await requestToken(CLIENT_ID, metaRef.current.email)
      setStatus('working')
      const token = tokenRef.current.token
      const email = await driveUserEmail(token)
      if (email !== metaRef.current.email) {
        // A different Google account: nothing we know about its Drive applies.
        updateMeta({ email, fileId: null, lastSyncedAt: null })
      }
      updateMeta({ connected: true })

      const fileId = await findBackupFile(token)
      updateMeta({ fileId })
      let remote = null
      if (fileId) remote = parseBackup(await downloadBackup(token, fileId))

      let action = decideSync({
        driveSavedAt: remote?.savedAt,
        lastSyncedAt: metaRef.current.lastSyncedAt,
        dirty: metaRef.current.dirty,
      })
      if (action === 'ask') {
        action = window.confirm(
          `Your Google Drive has a saved list from ${fmtWhen(remote.savedAt)}.\n\n` +
          'OK — load it into this browser (replaces the list here).\n' +
          "Cancel — keep this browser's list and save it to Drive instead."
        ) ? 'download' : 'upload'
      }

      if (action === 'download') {
        skipNext.current = true
        applyData(remote.data)
        updateMeta({ lastSyncedAt: remote.savedAt, dirty: false })
        setStatus('synced')
      } else if (action === 'upload') {
        await push()
      } else {
        setStatus('synced')
      }
    } catch (e) {
      tokenRef.current = null
      setStatus(metaRef.current.connected ? 'reconnect' : 'signedOut')
      setError(e.message)
    }
  }, [applyData, push, updateMeta])

  const disconnect = useCallback(() => {
    clearTimeout(timer.current)
    if (tokenRef.current) revokeToken(tokenRef.current.token)
    tokenRef.current = null
    updateMeta({ connected: false })
    setStatus('signedOut')
    setError(null)
  }, [updateMeta])

  return {
    status,
    error,
    email: meta.email || null,
    lastSyncedAt: meta.lastSyncedAt || null,
    dirty: !!meta.dirty,
    connect,
    disconnect,
    saveNow: push,
  }
}
