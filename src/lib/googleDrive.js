// Google sign-in and Drive storage, entirely in the browser.
//
// The list is saved to the signed-in person's own Google Drive, in the hidden
// "app data" folder: only this app can see it, and it doesn't show up in their
// Drive file list. There's no server — the browser talks to Google directly.
//
// Sign-in uses Google Identity Services' token flow. Tokens last about an hour
// and there's no refresh token, so after that the user reconnects with a click.

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
export const DRIVE_FILENAME = 'food-storage.json'

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

let gisPromise = null
export function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = GIS_SRC
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        gisPromise = null
        reject(new Error("Couldn't load Google sign-in. Check your connection and try again."))
      }
      document.head.appendChild(s)
    })
  }
  return gisPromise
}

// Opens Google's sign-in popup and resolves with { token, expiresAt }.
// Must be called from a click, or the browser blocks the popup.
export async function requestToken(clientId, hint) {
  await loadGoogleIdentity()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      hint,
      callback: (res) => {
        if (res.error) reject(new Error(res.error_description || res.error))
        else resolve({ token: res.access_token, expiresAt: Date.now() + (Number(res.expires_in) || 3600) * 1000 })
      },
      error_callback: (err) => {
        reject(new Error(err.type === 'popup_closed' ? 'Sign-in was cancelled.' : 'Google sign-in failed.'))
      },
    })
    client.requestAccessToken({ prompt: hint ? '' : 'consent' })
  })
}

export function revokeToken(token) {
  window.google?.accounts?.oauth2?.revoke(token, () => {})
}

// An error from a Drive call. status 401 means the token expired.
export class DriveError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function call(token, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  })
  if (!res.ok) {
    const msg = res.status === 401
      ? 'Your Google sign-in expired.'
      : `Google Drive returned an error (${res.status}).`
    throw new DriveError(msg, res.status)
  }
  return res
}

// The signed-in person's email, to show who the list is syncing to.
export async function driveUserEmail(token) {
  const res = await call(token, `${API}/about?fields=user(emailAddress)`)
  return (await res.json()).user?.emailAddress || null
}

// The saved file's id, or null if this account has never saved.
export async function findBackupFile(token) {
  const q = encodeURIComponent(`name = '${DRIVE_FILENAME}'`)
  const res = await call(token, `${API}/files?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=1`)
  return (await res.json()).files?.[0]?.id || null
}

export async function downloadBackup(token, fileId) {
  const res = await call(token, `${API}/files/${fileId}?alt=media`)
  return res.text()
}

// Creates the file the first time, then overwrites it. Returns the file id.
export async function uploadBackup(token, fileId, text) {
  if (fileId) {
    await call(token, `${UPLOAD}/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: text,
    })
    return fileId
  }
  const boundary = `fs-${Math.random().toString(36).slice(2)}`
  const metadata = { name: DRIVE_FILENAME, parents: ['appDataFolder'], mimeType: 'application/json' }
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${text}\r\n--${boundary}--`
  const res = await call(token, `${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  return (await res.json()).id
}
