'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import GlobalNavDrawer from '@/app/components/GlobalNavDrawer'

type Mood = { id: string; mood_score: number; emotion_labels: string[]; note: string; created_at: string }
type Diary = { id: string; content: string; ai_content: string; created_at: string }
type Todo = { id: string; content: string; completed: boolean; sort_order: number }

type Tab = 'mood' | 'diary' | 'todo'

const MOOD_EMOJIS = ['😢', '😔', '😐', '🙂', '😊']
const MOOD_LABELS = ['つらい', 'しんどい', 'ふつう', 'まあまあ', 'いい感じ']
const EMOTION_OPTIONS = ['不安', '疲れ', '寂しい', '悲しい', 'イライラ', 'モヤモヤ', '楽しい', '充実', '穏やか', '元気', 'ドキドキ', '嬉しい']

export default function RecordClient({
  initialMoods,
  initialDiaries,
  initialTodos,
}: {
  initialMoods: Mood[]
  initialDiaries: Diary[]
  initialTodos: Todo[]
}) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as Tab | null
  const showNew = searchParams.get('new') === '1'

  const [tab, setTab] = useState<Tab>(tabParam ?? 'mood')
  const [globalMenuOpen, setGlobalMenuOpen] = useState(false)
  const [moods, setMoods] = useState(initialMoods)
  const [diaries, setDiaries] = useState(initialDiaries)
  const [todos, setTodos] = useState(initialTodos)

  // Mood recording state
  const [moodScore, setMoodScore] = useState<number | null>(null)
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [moodNote, setMoodNote] = useState('')
  const [savingMood, setSavingMood] = useState(false)
  const [moodFormOpen, setMoodFormOpen] = useState(false)

  // Diary state
  const [diaryContent, setDiaryContent] = useState('')
  const [aiDiary, setAiDiary] = useState(false)
  const [savingDiary, setSavingDiary] = useState(false)
  const [diaryFormOpen, setDiaryFormOpen] = useState(showNew)

  // Todo state
  const [newTodoText, setNewTodoText] = useState('')
  const [addingTodo, setAddingTodo] = useState(false)
  const [generatingTodos, setGeneratingTodos] = useState(false)

  useEffect(() => {
    if (tabParam) setTab(tabParam)
  }, [tabParam])

  const saveMood = async () => {
    if (!moodScore) return
    setSavingMood(true)
    try {
      const res = await fetch('/api/counseling/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood_score: moodScore, emotion_labels: selectedEmotions, note: moodNote }),
      })
      const data = await res.json()
      if (data.record) {
        setMoods(prev => [data.record, ...prev])
        setMoodScore(null)
        setSelectedEmotions([])
        setMoodNote('')
        setMoodFormOpen(false)
      }
    } finally {
      setSavingMood(false)
    }
  }

  const saveDiary = async () => {
    if (!diaryContent.trim()) return
    setSavingDiary(true)
    try {
      const res = await fetch('/api/counseling/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: diaryContent, generateAi: aiDiary }),
      })
      const data = await res.json()
      if (data.entry) {
        setDiaries(prev => [data.entry, ...prev])
        setDiaryContent('')
        setAiDiary(false)
        setDiaryFormOpen(false)
      }
    } finally {
      setSavingDiary(false)
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

  const addTodo = async () => {
    if (!newTodoText.trim()) return
    setAddingTodo(true)
    try {
      const res = await fetch('/api/counseling/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newTodoText.trim() }),
      })
      const data = await res.json()
      if (data.todo) {
        setTodos(prev => [...prev, data.todo])
        setNewTodoText('')
      }
    } finally {
      setAddingTodo(false)
    }
  }

  const deleteTodo = async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/counseling/todo/${id}`, { method: 'DELETE' })
  }

  const generateTodos = async () => {
    setGeneratingTodos(true)
    try {
      const res = await fetch('/api/counseling/todo/generate', { method: 'POST' })
      const data = await res.json()
      if (data.todos) setTodos(data.todos)
    } finally {
      setGeneratingTodos(false)
    }
  }

  const completedCount = todos.filter(t => t.completed).length

  const tabStyle = (t: Tab) => ({
    flex: 1,
    paddingTop: '10px',
    paddingBottom: '10px',
    fontSize: '13px',
    fontWeight: tab === t ? 600 : 400,
    color: tab === t ? '#FAA66B' : '#3F342D66',
    borderBottom: tab === t ? '2px solid #FAA66B' : '2px solid transparent',
    backgroundColor: 'transparent',
    transition: 'all 0.15s',
  } as React.CSSProperties)

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#FFF9F5' }}>

      <GlobalNavDrawer isOpen={globalMenuOpen} onClose={() => setGlobalMenuOpen(false)} />
      {/* Page header */}
      <div className="px-4 pt-12 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#3F342D' }}>きろく</h1>
        <button
          onClick={() => setGlobalMenuOpen(true)}
          style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '3.5px', alignItems: 'center', justifyContent: 'center' }}
        >
          {[0, 1, 2].map(i => (
            <span key={i} style={{ display: 'block', width: '18px', height: '2px', borderRadius: '2px', backgroundColor: '#3F342D99' }} />
          ))}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-0" style={{ borderColor: '#F0EAE5', backgroundColor: '#FFF9F5' }}>
        <button style={tabStyle('mood')} onClick={() => setTab('mood')}>気分</button>
        <button style={tabStyle('diary')} onClick={() => setTab('diary')}>日記</button>
        <button style={tabStyle('todo')} onClick={() => setTab('todo')}>TODO</button>
      </div>

      <div className="px-4 py-4">

        {/* ─── 気分タブ ─── */}
        {tab === 'mood' && (
          <div className="space-y-4">
            {!moodFormOpen ? (
              <button
                onClick={() => setMoodFormOpen(true)}
                className="w-full py-3 rounded-2xl text-sm font-medium"
                style={{ backgroundColor: '#FAA66B', color: '#fff' }}
              >
                + 気分を記録する
              </button>
            ) : (
              <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: '#fff', boxShadow: '0 1px 6px rgba(63,52,45,0.06)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: '#3F342D' }}>今の気分は？</p>
                  <button onClick={() => setMoodFormOpen(false)} style={{ color: '#3F342D66' }}>✕</button>
                </div>

                {/* Score selector */}
                <div className="flex justify-between">
                  {MOOD_EMOJIS.map((emoji, i) => {
                    const score = i + 1
                    const selected = moodScore === score
                    return (
                      <button
                        key={score}
                        onClick={() => setMoodScore(score)}
                        className="flex flex-col items-center gap-1"
                      >
                        <span
                          className="w-12 h-12 flex items-center justify-center rounded-full text-2xl transition-all"
                          style={{
                            backgroundColor: selected ? '#FAA66B' : '#FFF2E8',
                            transform: selected ? 'scale(1.1)' : 'scale(1)',
                          }}
                        >
                          {emoji}
                        </span>
                        <span className="text-xs" style={{ color: selected ? '#FAA66B' : '#3F342D66' }}>
                          {MOOD_LABELS[i]}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Emotion labels */}
                {moodScore && (
                  <div>
                    <p className="text-xs mb-2" style={{ color: '#3F342D66' }}>気持ちのラベル（複数選択可）</p>
                    <div className="flex flex-wrap gap-2">
                      {EMOTION_OPTIONS.map(e => {
                        const active = selectedEmotions.includes(e)
                        return (
                          <button
                            key={e}
                            onClick={() => setSelectedEmotions(prev =>
                              active ? prev.filter(x => x !== e) : [...prev, e]
                            )}
                            className="px-3 py-1 rounded-full text-xs transition-all"
                            style={{
                              backgroundColor: active ? '#FAA66B' : '#F0EAE5',
                              color: active ? '#fff' : '#3F342D99',
                            }}
                          >
                            {e}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Note */}
                {moodScore && (
                  <textarea
                    value={moodNote}
                    onChange={e => setMoodNote(e.target.value)}
                    placeholder="メモ（任意）"
                    rows={2}
                    className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ border: '1.5px solid #F0EAE5', backgroundColor: '#FFF9F5', color: '#3F342D' }}
                  />
                )}

                <button
                  onClick={saveMood}
                  disabled={!moodScore || savingMood}
                  className="w-full py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: moodScore && !savingMood ? '#FAA66B' : '#F0EAE5',
                    color: moodScore && !savingMood ? '#fff' : '#3F342D66',
                  }}
                >
                  {savingMood ? '記録中...' : '記録する'}
                </button>
              </div>
            )}

            {/* Mood history */}
            <div className="space-y-2">
              {moods.map(m => (
                <div
                  key={m.id}
                  className="rounded-2xl px-4 py-3 flex items-start gap-3"
                  style={{ backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(63,52,45,0.05)' }}
                >
                  <span className="text-2xl">{MOOD_EMOJIS[m.mood_score - 1]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: '#3F342D' }}>
                        {MOOD_LABELS[m.mood_score - 1]}
                      </span>
                      <span className="text-xs" style={{ color: '#3F342D66' }}>
                        {new Date(m.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {m.emotion_labels?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.emotion_labels.map((e: string) => (
                          <span key={e} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}>{e}</span>
                        ))}
                      </div>
                    )}
                    {m.note && <p className="text-xs mt-1 line-clamp-2" style={{ color: '#3F342D66' }}>{m.note}</p>}
                  </div>
                </div>
              ))}
              {moods.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: '#3F342D66' }}>
                  まだ記録がありません
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── 日記タブ ─── */}
        {tab === 'diary' && (
          <div className="space-y-4">
            {!diaryFormOpen ? (
              <button
                onClick={() => setDiaryFormOpen(true)}
                className="w-full py-3 rounded-2xl text-sm font-medium"
                style={{ backgroundColor: '#FAA66B', color: '#fff' }}
              >
                + 日記を書く
              </button>
            ) : (
              <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: '#fff', boxShadow: '0 1px 6px rgba(63,52,45,0.06)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: '#3F342D' }}>
                    {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}の日記
                  </p>
                  <button onClick={() => setDiaryFormOpen(false)} style={{ color: '#3F342D66' }}>✕</button>
                </div>
                <textarea
                  value={diaryContent}
                  onChange={e => setDiaryContent(e.target.value)}
                  placeholder="今日はどんな日でしたか？"
                  rows={5}
                  className="w-full resize-none rounded-xl px-3 py-3 text-sm outline-none leading-relaxed"
                  style={{ border: '1.5px solid #F0EAE5', backgroundColor: '#FFF9F5', color: '#3F342D' }}
                />

                {/* AI generation toggle */}
                <button
                  onClick={() => setAiDiary(!aiDiary)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl w-full text-left"
                  style={{ backgroundColor: aiDiary ? '#FFF2E8' : '#F9F5F0', border: `1.5px solid ${aiDiary ? '#FAA66B66' : '#F0EAE5'}` }}
                >
                  <span
                    className="w-8 h-4 rounded-full relative flex items-center transition-all shrink-0"
                    style={{ backgroundColor: aiDiary ? '#FAA66B' : '#D9D2CC' }}
                  >
                    <span
                      className="w-3 h-3 rounded-full bg-white absolute transition-all"
                      style={{ left: aiDiary ? '18px' : '2px' }}
                    />
                  </span>
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#3F342D' }}>ぽとり日記を生成する</p>
                    <p className="text-xs" style={{ color: '#3F342D66' }}>AIがあなたの気持ちを言語化します</p>
                  </div>
                </button>

                <button
                  onClick={saveDiary}
                  disabled={!diaryContent.trim() || savingDiary}
                  className="w-full py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: diaryContent.trim() && !savingDiary ? '#FAA66B' : '#F0EAE5',
                    color: diaryContent.trim() && !savingDiary ? '#fff' : '#3F342D66',
                  }}
                >
                  {savingDiary ? (aiDiary ? 'ぽとり日記を生成中...' : '保存中...') : '投稿する'}
                </button>
              </div>
            )}

            <div className="space-y-3">
              {diaries.map(d => (
                <div
                  key={d.id}
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(63,52,45,0.05)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: '#3F342D66' }}>
                      {new Date(d.created_at).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                    </span>
                    {d.ai_content && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}>
                        ✦ ぽとり日記
                      </span>
                    )}
                  </div>
                  {d.ai_content ? (
                    <>
                      <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{d.ai_content}</p>
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer" style={{ color: '#3F342D66' }}>元の日記を見る</summary>
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: '#3F342D99' }}>{d.content}</p>
                      </details>
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed" style={{ color: '#3F342D' }}>{d.content}</p>
                  )}
                </div>
              ))}
              {diaries.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: '#3F342D66' }}>
                  まだ日記がありません
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── TODOタブ ─── */}
        {tab === 'todo' && (
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: '#3F342D' }}>今週のじぶんTODO</p>
                {todos.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: '#3F342D66' }}>{completedCount}/{todos.length}件完了</p>
                )}
              </div>
              <button
                onClick={generateTodos}
                disabled={generatingTodos}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: generatingTodos ? '#F0EAE5' : '#FFF2E8',
                  color: generatingTodos ? '#3F342D66' : '#FAA66B',
                  border: '1px solid #FAA66B44',
                }}
              >
                {generatingTodos ? '生成中...' : '✦ AI生成'}
              </button>
            </div>

            {/* Progress bar */}
            {todos.length > 0 && (
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EAE5' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(completedCount / todos.length) * 100}%`, backgroundColor: '#FAA66B' }}
                />
              </div>
            )}

            {/* Todo list */}
            <div className="space-y-2">
              {todos.map(todo => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(63,52,45,0.05)' }}
                >
                  <button
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
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
                  </button>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: todo.completed ? '#3F342D66' : '#3F342D',
                      textDecoration: todo.completed ? 'line-through' : 'none',
                    }}
                  >
                    {todo.content}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-xs p-1"
                    style={{ color: '#3F342D33' }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {todos.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: '#3F342D66' }}>
                  まだTODOがありません
                </p>
              )}
            </div>

            {/* Add todo */}
            <div className="flex gap-2">
              <input
                value={newTodoText}
                onChange={e => setNewTodoText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
                placeholder="TODOを追加..."
                className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
                style={{ border: '1.5px solid #F0EAE5', backgroundColor: '#fff', color: '#3F342D' }}
              />
              <button
                onClick={addTodo}
                disabled={!newTodoText.trim() || addingTodo}
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 self-center"
                style={{ backgroundColor: newTodoText.trim() && !addingTodo ? '#FAA66B' : '#F0EAE5' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke={newTodoText.trim() && !addingTodo ? '#fff' : '#3F342D66'} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
