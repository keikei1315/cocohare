'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

export default function AlertTab() {
  const router = useRouter()
  const pathname = usePathname()
  const isTop = pathname === '/'
  const [panelOpen, setPanelOpen] = useState(false)
  const [hiddenByTodo, setHiddenByTodo] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPwa, setShowPwa] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  // 通知
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'denied') return
    fetch('/api/push/subscribe')
      .then(r => r.json())
      .then(({ subscribed }) => { if (!subscribed) setShowNotif(true) })
      .catch(() => {})
  }, [])

  // パスワード
  useEffect(() => {
    const supabase = createClient()
    const check = (user: { user_metadata?: Record<string, unknown> } | null) => {
      setShowPassword(
        !!user &&
        user.user_metadata?.needs_password === true &&
        user.user_metadata?.password_prompt_dismissed !== true
      )
    }
    supabase.auth.getUser().then(({ data: { user } }) => check(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      check(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // PWA
  useEffect(() => {
    if (localStorage.getItem('pwa_install_dismissed')) return
    if (window.matchMedia('(display-mode: standalone)').matches) return
    const ua = navigator.userAgent
    if (!/Android|iPhone|iPad|iPod/i.test(ua)) return

    const isIOSDevice = /iPhone|iPad|iPod/i.test(ua)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
    if (isIOSDevice && isSafari) {
      setIsIOS(true)
      setShowPwa(true)
      return
    }
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPwa(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const open = (e as CustomEvent<{ open: boolean }>).detail.open
      setHiddenByTodo(open)
      if (open) setPanelOpen(false)
    }
    window.addEventListener('todo-panel-toggle', handler)
    return () => window.removeEventListener('todo-panel-toggle', handler)
  }, [])

  const count = [showNotif, showPassword, showPwa].filter(Boolean).length
  if (count === 0 || hiddenByTodo) return null

  const handleNotifAction = async () => {
    if (!('Notification' in window)) return
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
      setShowNotif(false)
    }
  }

  const handlePasswordAction = () => {
    router.push(`/mypage/set-password?returnTo=${encodeURIComponent(window.location.pathname)}`)
  }

  const handlePasswordDismiss = async () => {
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { password_prompt_dismissed: true } })
    setShowPassword(false)
  }

  const handlePwaAction = async () => {
    if (isIOS) {
      await navigator.share?.({ url: window.location.origin }).catch(() => {})
    } else if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPwa(false)
        setDeferredPrompt(null)
      }
    }
  }

  const handlePwaDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', '1')
    setShowPwa(false)
  }

  return (
    <>
      {/* タブ */}
      <button
        onClick={() => setPanelOpen(v => !v)}
        style={{
          position: 'fixed', right: 0, top: isTop ? '80px' : pathname === '/counseling/chat' ? '85px' : '80px', zIndex: 55,
          backgroundColor: '#FAA66B',
          borderRadius: '8px 0 0 8px',
          boxShadow: '-2px 2px 8px rgba(63,52,45,0.15)',
          ...(isTop ? {
            padding: '12px 7px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          } : {
            padding: '8px 7px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
          }),
        }}
      >
        {/* ベルアイコン */}
        <svg width={isTop ? 14 : 12} height={isTop ? 14 : 12} viewBox="0 0 14 14" fill="none">
          <path d="M7 1.5C4.79 1.5 3 3.29 3 5.5v3.25L2 10h10l-1-1.25V5.5C11 3.29 9.21 1.5 7 1.5z" fill="#fff" />
          <path d="M5.5 10.5a1.5 1.5 0 003 0" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
        </svg>

        {isTop && (
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', writingMode: 'vertical-rl', letterSpacing: '0.1em' }}>
            お知らせ
          </span>
        )}

        {/* バッジ */}
        <div style={{
          width: isTop ? 16 : 14,
          height: isTop ? 16 : 14,
          borderRadius: '50%',
          backgroundColor: '#fff', color: '#FAA66B',
          fontSize: isTop ? '10px' : '9px', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {count}
        </div>
      </button>

      {/* オーバーレイ */}
      {panelOpen && (
        <div
          onClick={() => setPanelOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 56 }}
        />
      )}

      {/* パネル */}
      <div style={{
        position: 'fixed',
        right: panelOpen ? 0 : '-300px',
        top: '80px',
        zIndex: 57,
        width: '260px',
        backgroundColor: '#fff',
        borderRadius: '12px 0 0 12px',
        boxShadow: '-4px 4px 20px rgba(63,52,45,0.15)',
        transition: 'right 0.25s ease',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #F5EEE9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#3F342D' }}>お知らせ</span>
          <button onClick={() => setPanelOpen(false)} style={{ fontSize: '12px', color: '#3F342D66' }}>✕</button>
        </div>

        {showNotif && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F5EEE9' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3F342D', marginBottom: '3px' }}>🔔 通知を許可する</div>
            <div style={{ fontSize: '10px', color: '#3F342D88', marginBottom: '8px', lineHeight: 1.5 }}>ぽとりからのお知らせを受け取れます</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleNotifAction}
                style={{ flex: 1, padding: '7px', backgroundColor: '#FAA66B', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#fff' }}
              >
                許可する
              </button>
              <button
                onClick={() => setShowNotif(false)}
                style={{ padding: '7px 10px', backgroundColor: '#F5EEE9', borderRadius: '6px', fontSize: '11px', color: '#3F342D88' }}
              >
                後で
              </button>
            </div>
          </div>
        )}

        {showPassword && (
          <div style={{ padding: '12px 16px', borderBottom: showPwa ? '1px solid #F5EEE9' : 'none' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3F342D', marginBottom: '3px' }}>🔑 パスワードを設定する</div>
            <div style={{ fontSize: '10px', color: '#3F342D88', marginBottom: '8px', lineHeight: 1.5 }}>次回のログインに必要です</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handlePasswordAction}
                style={{ flex: 1, padding: '7px', backgroundColor: '#FAA66B', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#fff' }}
              >
                設定する
              </button>
              <button
                onClick={handlePasswordDismiss}
                style={{ padding: '7px 10px', backgroundColor: '#F5EEE9', borderRadius: '6px', fontSize: '11px', color: '#3F342D88' }}
              >
                後で
              </button>
            </div>
          </div>
        )}

        {showPwa && (
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3F342D', marginBottom: '3px' }}>📱 ホーム画面に追加する</div>
            <div style={{ fontSize: '10px', color: '#3F342D88', marginBottom: '8px', lineHeight: 1.5 }}>
              {isIOS ? '「共有」→「ホーム画面に追加」でアプリのように使えます' : 'アプリとしてインストールできます'}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handlePwaAction}
                style={{ flex: 1, padding: '7px', backgroundColor: '#FAA66B', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#fff' }}
              >
                {isIOS ? '共有シートを開く' : 'ホーム画面に追加'}
              </button>
              <button
                onClick={handlePwaDismiss}
                style={{ padding: '7px 10px', backgroundColor: '#F5EEE9', borderRadius: '6px', fontSize: '11px', color: '#3F342D88' }}
              >
                後で
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
