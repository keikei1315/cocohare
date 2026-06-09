'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export default function SubscriptionSuccess() {
  const router = useRouter()
  const [notifResult, setNotifResult] = useState<'pending' | 'granted' | 'blocked' | 'unsupported' | 'skip'>('pending')

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setNotifResult('unsupported')
      return
    }

    fetch('/api/push/subscribe')
      .then(r => r.json())
      .then(({ subscribed }) => {
        if (subscribed) {
          setNotifResult('skip')
          return
        }
        if (Notification.permission === 'denied') {
          setNotifResult('blocked')
          return
        }
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            setNotifResult('granted')
            subscribeSilently()
          } else {
            setNotifResult('blocked')
          }
        })
      })
      .catch(() => setNotifResult('unsupported'))
  }, [])

  const subscribeSilently = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
    } catch {
      // silent
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: '#FFF9F5' }}
    >
      <Image src="/potori/humming.webp" alt="ぽとり" width={90} height={90} className="object-contain mb-6" />

      <h1 className="text-2xl font-bold mb-2" style={{ color: '#3F342D' }}>
        登録完了！
      </h1>
      <p className="text-sm mb-8 leading-relaxed" style={{ color: '#3F342D99' }}>
        ぽとりといっしょに、<br />毎日を整えていきましょう。
      </p>

      {notifResult === 'skip' && (
        <div className="rounded-2xl px-5 py-3 mb-8 text-sm" style={{ backgroundColor: '#FAA66B22', color: '#F07B3A' }}>
          🔔 通知はすでにオンです
        </div>
      )}

      {notifResult === 'granted' && (
        <div className="rounded-2xl px-5 py-3 mb-8 text-sm" style={{ backgroundColor: '#FAA66B22', color: '#F07B3A' }}>
          🔔 通知がオンになりました
        </div>
      )}

      {notifResult === 'blocked' && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          }}
        >
          <div style={{
            backgroundColor: '#fff', borderRadius: '20px', padding: '28px 24px',
            width: '100%', maxWidth: '320px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔔</p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#3F342D', marginBottom: '8px' }}>
              通知をオンにしてください
            </p>
            <p style={{ fontSize: '12px', color: '#3F342D88', lineHeight: 1.7, marginBottom: '20px' }}>
              ブラウザに通知がブロックされています。<br />
              アドレスバーの 🔒 をタップ →「通知」→「許可」に変更してください。
            </p>
            <button
              onClick={() => setNotifResult('unsupported')}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                backgroundColor: '#FAA66B', color: '#fff',
                fontSize: '14px', fontWeight: 700,
              }}
            >
              わかった
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => router.push('/counseling')}
        className="w-full max-w-xs py-4 rounded-2xl text-base font-bold"
        style={{ backgroundColor: '#FAA66B', color: '#fff' }}
      >
        ぽとりと話しはじめる
      </button>
    </div>
  )
}
