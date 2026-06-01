'use client'

import { useState, useEffect } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export default function PwaNotifButtons() {
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [pwaDone, setPwaDone] = useState(false)
  const [notifDone, setNotifDone] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/i.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)) {
      setIsIOS(true)
    }
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handlePwa = async () => {
    if (isIOS) {
      await navigator.share?.({ url: window.location.origin }).catch(() => {})
    } else if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setPwaDone(true)
        setDeferredPrompt(null)
      }
    } else {
      alert('ブラウザのメニューから「ホーム画面に追加」してください')
    }
  }

  const handleNotif = async () => {
    if (!('Notification' in window)) {
      alert('このブラウザは通知に対応していません')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        })
        const json = sub.toJSON()
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        })
      } catch {}
      setNotifDone(true)
    }
  }

  return (
    <div className="space-y-2 mb-4">
      {!pwaDone && (
        <button
          onClick={handlePwa}
          className="w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left"
          style={{ backgroundColor: '#fff', border: '1.5px solid #FAA66B66', color: '#3F342D', boxShadow: '0 1px 6px rgba(63,52,45,0.06)' }}
        >
          <span className="text-lg mt-0.5">📱</span>
          <div>
            <p className="text-sm font-medium">アプリをホームに追加する</p>
            <p className="text-xs mt-0.5" style={{ color: '#3F342D66' }}>
              {isIOS
                ? '画面下の「共有」→「ホーム画面に追加」をタップ'
                : 'タップするとインストール画面が表示されます'}
            </p>
          </div>
        </button>
      )}
      {!notifDone && (
        <button
          onClick={handleNotif}
          className="w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left"
          style={{ backgroundColor: '#fff', border: '1.5px solid #FAA66B66', color: '#3F342D', boxShadow: '0 1px 6px rgba(63,52,45,0.06)' }}
        >
          <span className="text-lg mt-0.5">🔔</span>
          <div>
            <p className="text-sm font-medium">通知を許可する</p>
            <p className="text-xs mt-0.5" style={{ color: '#3F342D66' }}>ぽとりからのお知らせを受け取れます</p>
          </div>
        </button>
      )}
    </div>
  )
}
