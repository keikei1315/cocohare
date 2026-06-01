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
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [pwaDone, setPwaDone] = useState(false)
  const [notifDone, setNotifDone] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/i.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsIOS(ios)
    setIsStandalone(standalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handlePwa = async () => {
    if (isIOS) {
      setShowIOSGuide(true)
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

  // iOSのブラウザ表示中は通知ボタンを非表示（PWAインストール後のみ有効）
  const showNotifButton = !notifDone && (!isIOS || isStandalone)

  return (
    <>
      <div className="space-y-2 mb-4">
        {!pwaDone && (
          <button
            onClick={handlePwa}
            className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl text-left transition-opacity active:opacity-70"
            style={{ backgroundColor: '#FAA66B', color: '#fff' }}
          >
            <span className="text-lg mt-0.5">📱</span>
            <div>
              <p className="text-sm font-medium">アプリをホームに追加する</p>
              <p className="text-xs mt-0.5" style={{ color: '#ffffff99' }}>
                {isIOS ? 'iPhoneのホーム画面からすぐ開けます' : 'アプリとしてインストールできます'}
              </p>
            </div>
          </button>
        )}
        {showNotifButton && (
          <button
            onClick={handleNotif}
            className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl text-left transition-opacity active:opacity-70"
            style={{ backgroundColor: '#FAA66B', color: '#fff' }}
          >
            <span className="text-lg mt-0.5">🔔</span>
            <div>
              <p className="text-sm font-medium">通知を許可する</p>
              <p className="text-xs mt-0.5" style={{ color: '#ffffff99' }}>ぽとりからのお知らせを受け取れます</p>
            </div>
          </button>
        )}
        {isIOS && !isStandalone && !notifDone && (
          <p className="text-xs text-center" style={{ color: '#3F342D66' }}>
            ※ iPhoneの通知はホーム画面に追加後に設定できます
          </p>
        )}
      </div>

      {/* iOSホーム追加ガイドモーダル */}
      {showIOSGuide && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            style={{ width: '100%', backgroundColor: '#fff', borderRadius: '20px 20px 0 0', padding: '24px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, backgroundColor: '#E0D9D4', borderRadius: 2, margin: '0 auto 20px' }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#3F342D', marginBottom: 16 }}>ホーム画面への追加手順</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { step: '1', text: 'SafariのURL欄の下にある「共有」ボタン（□↑）をタップ' },
                { step: '2', text: 'メニューを下にスクロールして「ホーム画面に追加」をタップ' },
                { step: '3', text: '右上の「追加」をタップして完了' },
              ].map(({ step, text }) => (
                <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', backgroundColor: '#FAA66B',
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{step}</span>
                  <p style={{ fontSize: 14, color: '#3F342D', lineHeight: 1.5 }}>{text}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              style={{ width: '100%', marginTop: 24, padding: '12px', backgroundColor: '#FAA66B', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff' }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  )
}
