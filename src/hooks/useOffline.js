import { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const HOUR = 60 * 60 * 1000

// Running as an installed app (its own window or home-screen icon).
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

// iPhone/iPad Safari has no install prompt; people use Share → Add to Home Screen.
export function isIos() {
  const ua = window.navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine !== false)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

// The offline copy of the app: whether it's ready, whether a new version is
// waiting, installing it, and keeping its storage from being cleared.
export function useOffline() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    // Look for a new version every hour and whenever the app comes back into view.
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine !== false) registration.update().catch(() => {})
      }
      setInterval(check, HOUR)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  const [installEvent, setInstallEvent] = useState(null)
  const [installed, setInstalled] = useState(isStandalone)
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setInstallEvent(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  const install = useCallback(async () => {
    if (!installEvent) return
    installEvent.prompt()
    await installEvent.userChoice.catch(() => null)
    setInstallEvent(null)
  }, [installEvent])

  // Persistent storage: the browser won't clear it to free up space.
  const [persisted, setPersisted] = useState(null) // null = unknown/unsupported
  const keepData = useCallback(async () => {
    if (!navigator.storage?.persist) return
    setPersisted(await navigator.storage.persist().catch(() => false))
  }, [])
  useEffect(() => {
    if (!navigator.storage?.persisted) return
    navigator.storage.persisted().then((p) => {
      setPersisted(p)
      // Installed apps are usually granted this without asking.
      if (!p && isStandalone()) keepData()
    }).catch(() => {})
  }, [keepData])

  return {
    ready: offlineReady || !!navigator.serviceWorker?.controller,
    needRefresh,
    dismissUpdate: () => setNeedRefresh(false),
    applyUpdate: () => updateServiceWorker(true),
    installed,
    canInstall: !!installEvent,
    install,
    ios: isIos(),
    persisted,
    keepData,
  }
}
