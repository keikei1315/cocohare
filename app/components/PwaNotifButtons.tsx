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

const IconPhone = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="2" width="14" height="20" rx="3" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const IconBell = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

const IconShare = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M12 2v12M8 6l4-4 4 4" stroke="#FAA66B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 14v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6" stroke="#FAA66B" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

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
    setIsIOS(ios)
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)

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

  const showNotifButton = !notifDone && (!isIOS || isStandalone)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {!pwaDone && (
          <button
            onClick={handlePwa}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderRadius: 16, textAlign: 'left',
              background: 'linear-gradient(135deg, #FAA66B, #F9847A)',
              boxShadow: '0 4px 14px rgba(250,166,107,0.4)',
              color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{
              width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconPhone />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>ホーム画面に追加する</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                {isIOS ? 'アプリのように使えます' : 'ワンタップでインストール'}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {showNotifButton && (
          <button
            onClick={handleNotif}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderRadius: 16, textAlign: 'left',
              background: 'linear-gradient(135deg, #FAA66B, #F9847A)',
              boxShadow: '0 4px 14px rgba(250,166,107,0.4)',
              color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{
              width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconBell />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>通知を許可する</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>ぽとりからのお知らせを受け取る</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {isIOS && !isStandalone && (
          <p style={{ fontSize: 11, textAlign: 'center', color: '#3F342D66' }}>
            ※ iPhoneの通知はホーム画面追加後に設定できます
          </p>
        )}
      </div>

      {/* iOS Safari ガイドオーバーレイ */}
      {showIOSGuide && (
        <div
          onClick={() => setShowIOSGuide(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200 }}
        >
          {/* 上部ブラックアウト */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)' }} />

          {/* 説明バナー（画面最下部、セーフエリア対応） */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: '#fff',
              borderTop: '2px solid #FAA66B',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 0',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <IconShare />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#3F342D' }}>
                  画面下、URLの下にある共有（
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}>
                    <path d="M12 2v12M8 6l4-4 4 4" stroke="#3F342D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20 14v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6" stroke="#3F342D" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                  ）をタップ
                </p>
                <p style={{ fontSize: 12, color: '#3F342D88', marginTop: 4 }}>
                  次に「ホーム画面に追加」を選択してください
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 24, display: 'inline-block', animation: 'bounce 1s infinite' }}>↓</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
      `}</style>
    </>
  )
}
