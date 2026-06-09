'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import GlobalNavDrawer from '@/app/components/GlobalNavDrawer'

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

type Todo = { id: string; content: string; completed: boolean; sort_order: number }
type Diary = { id: string; content: string; ai_content: string; created_at: string }

const MOOD_EMOJIS = ['😢', '😔', '😐', '🙂', '😊']
const HOUR_GREETING = () => {
  const h = new Date().getHours()
  if (h < 11) return 'おはようございます'
  if (h < 17) return 'こんにちは'
  if (h < 23) return 'こんばんは'
  return 'お疲れさまです'
}

export default function HomeClient({
  todos: initialTodos,
  recentDiaries,
  streak,
}: {
  todos: Todo[]
  recentDiaries: Diary[]
  streak: number
}) {
  const router = useRouter()
  const [todos, setTodos] = useState(initialTodos)
  const [dailyMessage, setDailyMessage] = useState<string | null>(null)
  const [messageLoading, setMessageLoading] = useState(true)
  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const [moodDone, setMoodDone] = useState(false)
  const [generatingTodos, setGeneratingTodos] = useState(false)
  const [globalMenuOpen, setGlobalMenuOpen] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [notifDone, setNotifDone] = useState(false)
  const [pwaDone, setPwaDone] = useState(false)

  useEffect(() => {
    fetch('/api/counseling/daily-message')
      .then(r => r.json())
      .then(d => setDailyMessage(d.content))
      .catch(() => setDailyMessage('今日も、あなたのペースで過ごしてくださいね。'))
      .finally(() => setMessageLoading(false))
  }, [])

  useEffect(() => {
    const ua = navigator.userAgent
    const isIOSDevice = /iPhone|iPad|iPod/i.test(ua)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
    if (isIOSDevice && isSafari) setIsIOS(true)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

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


  const recordMood = async (score: number) => {
    if (moodDone) return
    setSelectedMood(score)
    try {
      await fetch('/api/counseling/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood_score: score, emotion_labels: [], note: '' }),
      })
      setMoodDone(true)
    } catch {
      setSelectedMood(null)
    }
  }

  const toggleTodo = async (id: string, current: boolean) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !current } : t))
    try {
      await fetch(`/api/counseling/todo/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !current }),
      })
    } catch {
      setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: current } : t))
    }
  }

  const generateTodos = async () => {
    setGeneratingTodos(true)
    try {
      const res = await fetch('/api/counseling/todo/generate', { method: 'POST' })
      const data = await res.json()
      if (data.todos) setTodos(data.todos)
    } catch {
      /* noop */
    } finally {
      setGeneratingTodos(false)
    }
  }

  const completedCount = todos.filter(t => t.completed).length

  return (
    <div className="min-h-full pb-4" style={{ backgroundColor: '#FFF9F5' }}>
      <GlobalNavDrawer isOpen={globalMenuOpen} onClose={() => setGlobalMenuOpen(false)} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <div>
          <p className="text-xs" style={{ color: '#3F342D66' }}>
            {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
          <h1 className="text-lg font-bold mt-0.5" style={{ color: '#3F342D' }}>
            {HOUR_GREETING()}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image src="/potori/humming.webp" alt="ぽとり" width={44} height={44} className="object-contain" />
          <button
            onClick={() => setGlobalMenuOpen(true)}
            style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '3.5px', alignItems: 'center', justifyContent: 'center' }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: 'block', width: '18px', height: '2px', borderRadius: '2px', backgroundColor: '#3F342D99' }} />
            ))}
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* Daily message card */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, #FAA66B22 0%, #F9847A22 100%)', border: '1px solid #FAA66B33' }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: '#FAA66B' }}>✦ 今日のひとこと</p>
          {messageLoading ? (
            <div className="space-y-2">
              <div className="h-3 rounded-full w-full" style={{ backgroundColor: '#FAA66B22' }} />
              <div className="h-3 rounded-full w-4/5" style={{ backgroundColor: '#FAA66B22' }} />
            </div>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{dailyMessage}</p>
          )}
          <p className="text-xs mt-2 text-right" style={{ color: '#FAA66B99' }}>— ぽとり</p>
        </div>

        {/* Mood quick record */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#fff', boxShadow: '0 1px 6px rgba(63,52,45,0.06)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#3F342D' }}>
            {moodDone ? '✓ 気分を記録しました' : '今の気分は？'}
          </p>
          <div className="flex justify-between">
            {MOOD_EMOJIS.map((emoji, i) => {
              const score = i + 1
              const isSelected = selectedMood === score
              return (
                <button
                  key={score}
                  onClick={() => recordMood(score)}
                  disabled={moodDone}
                  className="flex flex-col items-center gap-1 transition-transform active:scale-90"
                  style={{ opacity: moodDone && !isSelected ? 0.4 : 1 }}
                >
                  <span
                    className="w-11 h-11 flex items-center justify-center rounded-full text-xl transition-all"
                    style={{
                      backgroundColor: isSelected ? '#FAA66B' : '#FFF2E8',
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    {emoji}
                  </span>
                  <span className="text-xs" style={{ color: isSelected ? '#FAA66B' : '#3F342D66' }}>{score}</span>
                </button>
              )
            })}
          </div>
          {moodDone && (
            <Link
              href="/counseling/record"
              className="block text-xs text-center mt-3"
              style={{ color: '#FAA66B' }}
            >
              詳しく記録する →
            </Link>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/counseling/chat"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl py-4"
            style={{ backgroundColor: '#FAA66B', color: '#fff' }}
          >
            <Image src="/potori/happy.webp" alt="ぽとり" width={32} height={32} className="object-contain" />
            <span className="text-sm font-medium">ぽとりと話す</span>
          </Link>
          <button
            onClick={() => router.push('/counseling/chat?crisis=1')}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl py-4"
            style={{ backgroundColor: '#FFF2E8', border: '1.5px solid #FAA66B44' }}
          >
            <span className="text-2xl">🤍</span>
            <span className="text-sm font-medium" style={{ color: '#3F342D' }}>しんどい時は…</span>
          </button>
        </div>

        {/* PWA / 通知ボタン */}
        <div className="space-y-2">
          {!pwaDone && (
            <button
              onClick={handlePwa}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium"
              style={{ backgroundColor: '#fff', border: '1.5px solid #FAA66B66', color: '#3F342D', boxShadow: '0 1px 6px rgba(63,52,45,0.06)' }}
            >
              <span className="text-lg">📱</span>
              <span>アプリをホームに追加する</span>
            </button>
          )}
          {!notifDone && (
            <button
              onClick={handleNotif}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium"
              style={{ backgroundColor: '#fff', border: '1.5px solid #FAA66B66', color: '#3F342D', boxShadow: '0 1px 6px rgba(63,52,45,0.06)' }}
            >
              <span className="text-lg">🔔</span>
              <span>通知を許可する</span>
            </button>
          )}
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-2xl"
            style={{ backgroundColor: '#FFF2E8' }}
          >
            <span className="text-xl">🔥</span>
            <div>
              <span className="text-sm font-bold" style={{ color: '#3F342D' }}>{streak}日連続</span>
              <span className="text-xs ml-1" style={{ color: '#3F342D99' }}>チェックイン中</span>
            </div>
          </div>
        )}

        {/* Todo section */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', boxShadow: '0 1px 6px rgba(63,52,45,0.06)' }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div>
              <p className="text-sm font-medium" style={{ color: '#3F342D' }}>今週のじぶんTODO</p>
              {todos.length > 0 && (
                <p className="text-xs mt-0.5" style={{ color: '#3F342D66' }}>
                  {completedCount}/{todos.length}件完了
                </p>
              )}
            </div>
            <Link href="/counseling/record?tab=todo" className="text-xs" style={{ color: '#FAA66B' }}>
              すべて見る →
            </Link>
          </div>

          {todos.length === 0 ? (
            <div className="px-4 pb-4">
              <p className="text-xs mb-3" style={{ color: '#3F342D66' }}>今週のTODOがまだありません</p>
              <button
                onClick={generateTodos}
                disabled={generatingTodos}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: generatingTodos ? '#F0EAE5' : '#FAA66B',
                  color: generatingTodos ? '#3F342D66' : '#fff',
                }}
              >
                {generatingTodos ? '生成中...' : 'AIにTODOを作ってもらう ✦'}
              </button>
            </div>
          ) : (
            <div className="pb-3">
              {/* Progress bar */}
              <div className="mx-4 mb-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EAE5' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(completedCount / todos.length) * 100}%`, backgroundColor: '#FAA66B' }}
                />
              </div>

              {todos.slice(0, 4).map(todo => (
                <button
                  key={todo.id}
                  onClick={() => toggleTodo(todo.id, todo.completed)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-orange-50 transition-colors"
                >
                  <span
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{
                      borderColor: todo.completed ? '#FAA66B' : '#D9D2CC',
                      backgroundColor: todo.completed ? '#FAA66B' : 'transparent',
                    }}
                  >
                    {todo.completed && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span
                    className="text-sm"
                    style={{
                      color: todo.completed ? '#3F342D66' : '#3F342D',
                      textDecoration: todo.completed ? 'line-through' : 'none',
                    }}
                  >
                    {todo.content}
                  </span>
                </button>
              ))}
              {todos.length > 4 && (
                <p className="text-xs text-center mt-1" style={{ color: '#3F342D66' }}>
                  他{todos.length - 4}件...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent diary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: '#3F342D' }}>最近の日記</p>
            <Link href="/counseling/record?tab=diary" className="text-xs" style={{ color: '#FAA66B' }}>
              すべて見る →
            </Link>
          </div>

          {recentDiaries.length === 0 ? (
            <div
              className="rounded-2xl p-4 text-center"
              style={{ backgroundColor: '#fff', boxShadow: '0 1px 6px rgba(63,52,45,0.06)' }}
            >
              <p className="text-xs mb-3" style={{ color: '#3F342D66' }}>まだ日記がありません</p>
              <Link
                href="/counseling/record?tab=diary&new=1"
                className="inline-block px-4 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#FAA66B', color: '#fff' }}
              >
                最初の日記を書く
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentDiaries.slice(0, 2).map(diary => (
                <div
                  key={diary.id}
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: '#fff', boxShadow: '0 1px 6px rgba(63,52,45,0.06)' }}
                >
                  <p className="text-xs mb-1.5" style={{ color: '#3F342D66' }}>
                    {new Date(diary.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-sm leading-relaxed line-clamp-2" style={{ color: '#3F342D' }}>
                    {diary.ai_content || diary.content}
                  </p>
                </div>
              ))}
              <Link
                href="/counseling/record?tab=diary&new=1"
                className="flex items-center justify-center gap-1 py-3 rounded-2xl text-sm font-medium"
                style={{ border: '1.5px dashed #FAA66B66', color: '#FAA66B' }}
              >
                <span>+</span>
                <span>日記を書く</span>
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
