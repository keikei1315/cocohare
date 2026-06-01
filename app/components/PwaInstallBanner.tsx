'use client'

import { useState, useEffect } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInstallBanner() {
  const [show, setShow] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (localStorage.getItem('pwa_install_dismissed')) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const ua = navigator.userAgent

    // PCは対象外
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)
    if (!isMobile) return

    const isIOSDevice = /iPhone|iPad|iPod/i.test(ua)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)

    if (isIOSDevice && isSafari) {
      setIsIOS(true)
      setShow(true)
      return
    }

    // Android Chrome
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  const handleShare = async () => {
    if (!navigator.share) return
    await navigator.share({ url: window.location.origin }).catch(() => {})
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <>
    <div style={{
      position: 'fixed', bottom: '20px', right: '16px', zIndex: 49,
      backgroundColor: '#fff', border: '1px solid #EDE5DC',
      borderRadius: '12px', padding: '12px 14px',
      boxShadow: '0 2px 12px rgba(63,52,45,0.12)', maxWidth: '240px',
    }}>
      <button
        onClick={() => setShowConfirm(true)}
        style={{
          position: 'absolute', top: '8px', right: '8px',
          width: '18px', height: '18px', borderRadius: '50%',
          backgroundColor: '#EDE5DC', color: '#3F342D', fontSize: '11px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ×
      </button>

      <button
        onClick={isIOS ? handleShare : handleInstall}
        style={{
          width: '100%', padding: '8px 0', marginBottom: '8px',
          backgroundColor: '#FAA66B', borderRadius: '8px',
          fontSize: '12px', fontWeight: 700, color: '#fff',
        }}
      >
        ホーム画面にアプリを追加する
      </button>

      {isIOS && (
        <div style={{ fontSize: '10px', color: '#3F342D99', lineHeight: 1.5 }}>
          「共有」→「ホーム画面に追加」でアプリのように使えます
        </div>
      )}
    </div>

    {showConfirm && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}>
        <div style={{
          backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
          width: '100%', maxWidth: '300px', textAlign: 'center',
        }}>
          <p style={{ fontSize: '14px', color: '#3F342D', marginBottom: '8px', fontWeight: 600 }}>
            今後表示しませんか？
          </p>
          <p style={{ fontSize: '12px', color: '#3F342D88', marginBottom: '20px', lineHeight: 1.6 }}>
            ホーム画面への追加はいつでもブラウザのメニューから行えます
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                fontSize: '13px', color: '#3F342D',
                border: '1px solid #EDE5DC', backgroundColor: '#fff',
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleDismiss}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                fontSize: '13px', color: '#fff', backgroundColor: '#FAA66B',
              }}
            >
              表示しない
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
