'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import GlobalNavDrawer from '@/app/components/GlobalNavDrawer'

type Message = {
  role: 'user' | 'assistant'
  content: string
  mode?: Mode
  isMoodCheck?: boolean
  moodSelected?: string
  moodDate?: string
}

type Mode = 'counseling' | 'coaching' | 'casual'

type Todo = { id: string; content: string; completed: boolean }

const FIRST_MESSAGES: Record<Mode, string> = {
  counseling: 'こんにちは。ぽとりです。\n今日はどんなことを話しましょうか？\nゆっくり話してくださいね。',
  coaching: 'こんにちは。ぽとりです。\n今日はどんな目標や課題について一緒に考えましょうか？',
  casual: 'こんにちは。ぽとりです。\n今日はどんなことでも気軽に話しかけてくださいね。',
}

const MODE_LABELS: Record<Mode, string> = {
  counseling: 'カウンセリングモード',
  coaching: 'コーチングモード',
  casual: 'おしゃべりモード',
}

const SWITCH_MESSAGES: Record<Mode, string> = {
  counseling: 'カウンセリングモードに切り替えました。\n気持ちを、ゆっくり話してください。',
  coaching: 'コーチングモードに切り替えました。\n目標や課題について一緒に考えましょう。',
  casual: 'おしゃべりモードに切り替えました。\n気軽になんでも話しかけてくださいね。',
}

const MOOD_LEVELS = ['良かった', '普通', 'しんどかったけど頑張った', '悪かった']


export default function ChatClient({
  initialMessages,
  hasDiagnosis,
  isLoggedIn,
  isSubscribed,
  plan,
  hasHighTicket,
  showMoodCheck,
}: {
  initialMessages: Message[]
  hasDiagnosis: boolean
  isLoggedIn: boolean
  isSubscribed: boolean
  plan: string | null
  hasHighTicket: boolean
  showMoodCheck: boolean
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isCrisis = searchParams.get('crisis') === '1'

  const canCounseling = plan === 'take' || plan === 'matsu'
  const canCoaching = plan === 'matsu'
  const initialMode: Mode = canCounseling ? 'counseling' : 'casual'
  const [mode, setMode] = useState<Mode>(initialMode)
  const initMsg = (): Message => isCrisis
    ? { role: 'assistant', content: 'そばにいます。\nどんなことがあっても、ここで話してくれていいです。\n今、どんな気持ちですか？', mode: 'counseling' }
    : { role: 'assistant', content: FIRST_MESSAGES[mode], mode }

  const [chatMessages, setChatMessages] = useState<Message[]>(
    initialMessages.length > 0 ? initialMessages : [initMsg()]
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(true)
  const [globalMenuOpen, setGlobalMenuOpen] = useState(false)

  // TODO panel
  const [todos, setTodos] = useState<Todo[]>([])
  const [todoPanelOpen, setTodoPanelOpen] = useState(false)
  const [generatingTodos, setGeneratingTodos] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [addingTodo, setAddingTodo] = useState(false)
  const [newTodoContent, setNewTodoContent] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      el.scrollTop = el.scrollHeight
    }
  }, [chatMessages])

  // iOSキーボード表示時の位置補正
  // コンテナのheight/topをvisualViewport実測値に直接合わせることでズレをなくす
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const adjust = () => {
      if (!containerRef.current) return
      containerRef.current.style.height = `${vv.height}px`
      containerRef.current.style.top = `${vv.offsetTop}px`
    }
    adjust()
    vv.addEventListener('resize', adjust)
    vv.addEventListener('scroll', adjust)
    return () => {
      vv.removeEventListener('resize', adjust)
      vv.removeEventListener('scroll', adjust)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    fetch('/api/counseling/todo')
      .then(r => r.json())
      .then(d => {
        if (d.todos?.length) {
          setTodos(d.todos)
        }
      })
      .catch(() => {})
  }, [isLoggedIn])

  useEffect(() => {
    if (!showMoodCheck) return
    setChatMessages(prev => {
      if (prev.some(m => m.isMoodCheck)) return prev
      const todayJST = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
      return [...prev, {
        role: 'assistant' as const,
        content: '今日もお疲れ様でした🌙\n今日の気分はどうでしたか？',
        mode: 'counseling' as Mode,
        isMoodCheck: true,
        moodDate: todayJST,
      }]
    })
  }, [showMoodCheck])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const current = scrollRef.current.scrollTop
    if (current < lastScrollY.current - 30) setMenuOpen(false)
    lastScrollY.current = current
  }, [])

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    setTodos(updated)
    await fetch(`/api/counseling/todo/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    }).catch(() => setTodos(todos))
  }

  const startEdit = (id: string, content: string) => {
    setEditingId(id)
    setEditContent(content)
  }

  const saveEdit = async (id: string) => {
    const trimmed = editContent.trim()
    if (!trimmed) return
    setTodos(prev => prev.map(t => t.id === id ? { ...t, content: trimmed } : t))
    setEditingId(null)
    await fetch(`/api/counseling/todo/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmed }),
    })
  }

  const deleteTodo = async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/counseling/todo/${id}`, { method: 'DELETE' })
  }

  const addTodo = async () => {
    const trimmed = newTodoContent.trim()
    if (!trimmed) return
    setNewTodoContent('')
    setAddingTodo(false)
    const res = await fetch('/api/counseling/todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmed }),
    })
    const data = await res.json()
    if (data.todo) setTodos(prev => [...prev, data.todo])
  }

  const generateTodos = async () => {
    setGeneratingTodos(true)
    try {
      const res = await fetch('/api/counseling/todo/generate', { method: 'POST' })
      const data = await res.json()
      if (data.todos?.length) {
        setTodos(data.todos)
        setTodoPanelOpen(true)
        window.dispatchEvent(new CustomEvent('todo-panel-toggle', { detail: { open: true } }))
      }
    } catch {
      // noop
    } finally {
      setGeneratingTodos(false)
    }
  }

  const handleMoodSelect = async (level: string, msgIndex: number) => {
    const moodDate = chatMessages[msgIndex]?.moodDate
    setChatMessages(prev => [
      ...prev.map((m, i) => i === msgIndex ? { ...m, moodSelected: level } : m),
      { role: 'assistant', content: '', mode },
    ])
    setLoading(true)
    try {
      const res = await fetch('/api/counseling/mood/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood_level: level, date: moodDate }),
      })
      const data = await res.json()
      setChatMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: data.message ?? '気持ちを教えてくれてありがとうございます。', mode }
        return updated
      })
    } catch {
      setChatMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: '気持ちを教えてくれてありがとうございます。', mode }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const renderContent = (content: string): React.ReactNode => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index))
      parts.push(
        <Link key={match.index} href={match[2]} style={{ color: '#FAA66B', fontWeight: 600, textDecoration: 'underline' }}>
          {match[1]}
        </Link>
      )
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < content.length) parts.push(content.slice(lastIndex))
    return parts.length === 0 ? content : <>{parts}</>
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: Message = { role: 'user', content: text, mode }
    setChatMessages(prev => [...prev, userMsg, { role: 'assistant', content: '', mode }])
    setLoading(true)

    try {
      const res = await fetch('/api/counseling/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode }),
      })

      if (!res.ok || !res.body) throw new Error()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let content = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        content += decoder.decode(value, { stream: true })
        setChatMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content, mode }
          return updated
        })
      }
    } catch {
      setChatMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'ごめんなさい、うまく繋がれませんでした。もう一度試してみてください。',
          mode,
        }
        return updated
      })
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return
    setMode(newMode)
    setChatMessages(prev => [...prev, { role: 'assistant', content: SWITCH_MESSAGES[newMode], mode: newMode }])
  }

  type MenuCell = {
    id: string
    img: string
    title: string
    sub: string
    action: () => void
    active?: boolean
  }

  const isTakePlanUser = plan === 'take' || plan === 'matsu'
  const isMatsuUser = plan === 'matsu'
  const canJibunnNote = isMatsuUser || hasHighTicket

  const menuCells: MenuCell[] = [
    // Row 1: mode selectors
    {
      id: 'casual',
      img: '/potori/happy.png',
      title: '普通に話す',
      sub: isSubscribed ? 'おしゃべり' : 'プラン登録〜',
      action: () => isSubscribed ? switchMode('casual') : router.push('/subscription'),
      active: mode === 'casual',
    },
    {
      id: 'counseling',
      img: '/potori/comforting.png',
      title: 'カウンセリング',
      sub: canCounseling ? '気持ちをきく' : 'やすらぎ〜',
      action: () => canCounseling ? switchMode('counseling') : router.push('/subscription'),
      active: mode === 'counseling',
    },
    {
      id: 'coaching',
      img: '/potori/motivated.png',
      title: 'コーチング',
      sub: canCoaching ? '目標に向けて' : 'ぬくもり〜',
      action: () => canCoaching ? switchMode('coaching') : router.push('/subscription'),
      active: mode === 'coaching',
    },
    // Row 2: navigation
    {
      id: 'diary',
      img: '/potori/humming.png',
      title: 'ぽとりの日記',
      sub: isTakePlanUser ? 'DIARY' : 'やすらぎ〜',
      action: () => isTakePlanUser ? router.push('/counseling/diary') : router.push('/subscription'),
    },
    {
      id: 'reports',
      img: '/potori/good.png',
      title: 'レポート一覧',
      sub: isTakePlanUser ? 'REPORTS' : 'やすらぎ〜',
      action: () => isTakePlanUser ? router.push('/counseling/diary/reports') : router.push('/subscription'),
    },
    {
      id: 'jibunn-note',
      img: '/potori/peek.png',
      title: 'じぶんノート',
      sub: canJibunnNote ? 'NOTE' : 'ぬくもり〜',
      action: () => canJibunnNote ? router.push('/counseling/jibunn-note') : router.push('/subscription'),
    },
  ]

  const completedCount = todos.filter(t => t.completed).length

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '100svh',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F7F2ED',
      }}
    >
      <GlobalNavDrawer isOpen={globalMenuOpen} onClose={() => setGlobalMenuOpen(false)} />

      {/* Header */}
      <div
        style={{
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #EDE5DC',
          flexShrink: 0,
          gap: '12px',
        }}
      >
        <button
          onClick={() => router.push('/')}
          style={{
            color: '#FAA66B', flexShrink: 0, padding: '5px 10px',
            border: '1.5px solid #FAA66B', borderRadius: '20px',
            fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em',
          }}
        >
          HOME
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#3F342D', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Image src="/potori/humming.png" alt="" width={22} height={22} className="object-contain" />
            ぽとり
          </div>
          <div style={{ fontSize: '11px', color: '#3F342D66', letterSpacing: '0.03em' }}>
            {MODE_LABELS[mode]}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {!hasDiagnosis && (
            <Link href="/diagnosis/free" style={{ fontSize: '11px', color: '#FAA66B', padding: '4px', whiteSpace: 'nowrap' }}>
              診断を受ける
            </Link>
          )}
          {/* Hamburger → global overlay menu */}
          <button
            onClick={() => setGlobalMenuOpen(true)}
            style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '3.5px', alignItems: 'center', justifyContent: 'center' }}
          >
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  display: 'block',
                  width: '18px',
                  height: '2px',
                  backgroundColor: '#3F342D99',
                  borderRadius: '1px',
                }}
              />
            ))}
          </button>
        </div>
      </div>

      {/* TODO panel */}
      {isLoggedIn && (todos.length === 0 ? (
        <div style={{ backgroundColor: '#FAFAF8', borderBottom: '1px solid #EDE5DC', flexShrink: 0, padding: '8px 16px' }}>
          <button
            onClick={isTakePlanUser ? generateTodos : () => router.push('/subscription')}
            disabled={isTakePlanUser && generatingTodos}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1.5px dashed #FAA66B88',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: generatingTodos ? '#3F342D66' : '#FAA66B',
              cursor: generatingTodos ? 'not-allowed' : 'pointer',
            }}
          >
            {generatingTodos ? (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="6" cy="6" r="4.5" stroke="#FAA66B44" strokeWidth="1.5" />
                  <path d="M6 1.5A4.5 4.5 0 0110.5 6" stroke="#FAA66B" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                TODOを生成中...
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="1" width="10" height="10" rx="2" stroke="#FAA66B" strokeWidth="1.2" />
                  <path d="M6 4v4M4 6h4" stroke="#FAA66B" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                今週のTODOを作成する
              </>
            )}
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #EDE5DC', flexShrink: 0 }}>
          <button
            onClick={() => {
              const next = !todoPanelOpen
              setTodoPanelOpen(next)
              window.dispatchEvent(new CustomEvent('todo-panel-toggle', { detail: { open: next } }))
            }}
            style={{
              width: '100%',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#FAFAF8',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="2" stroke="#FAA66B" strokeWidth="1.2" />
              {completedCount > 0 && (
                <path d="M4 7l2 2 4-4" stroke="#FAA66B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#3F342D' }}>今週のTODO</span>
            <span
              style={{
                fontSize: '11px',
                color: completedCount === todos.length ? '#7ECB99' : '#FAA66B',
                marginLeft: 'auto',
                fontWeight: 600,
              }}
            >
              {completedCount}/{todos.length} 完了
            </span>
            <svg
              width="10" height="6" viewBox="0 0 10 6" fill="none"
              style={{ transform: todoPanelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <path d="M1 1l4 4 4-4" stroke="#3F342D66" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {todoPanelOpen && (
            <>
              <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '2px 16px 8px' }}>
                {todos.map(todo => (
                  <div
                    key={todo.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}
                  >
                    {/* チェックボックス */}
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      style={{
                        width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                        border: todo.completed ? 'none' : '1.5px solid #FAA66B',
                        backgroundColor: todo.completed ? '#FAA66B' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {todo.completed && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5 3.5-4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    {/* テキスト or 編集フォーム */}
                    {editingId === todo.id ? (
                      <input
                        autoFocus
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(todo.id); if (e.key === 'Escape') setEditingId(null) }}
                        style={{
                          flex: 1, fontSize: '12px', padding: '2px 6px',
                          border: '1px solid #FAA66B', borderRadius: '6px',
                          outline: 'none', color: '#3F342D',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          flex: 1, fontSize: '12px', lineHeight: 1.5,
                          color: todo.completed ? '#3F342D55' : '#3F342D',
                          textDecoration: todo.completed ? 'line-through' : 'none',
                        }}
                      >
                        {todo.content}
                      </span>
                    )}

                    {/* 保存/キャンセル or 編集/削除 */}
                    {editingId === todo.id ? (
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button
                          onClick={() => saveEdit(todo.id)}
                          style={{ fontSize: '11px', color: '#7ECB99', fontWeight: 700 }}
                        >保存</button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ fontSize: '11px', color: '#3F342D66' }}
                        >✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => startEdit(todo.id, todo.content)} style={{ padding: '2px' }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z" stroke="#3F342D88" strokeWidth="1.2" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button onClick={() => deleteTodo(todo.id)} style={{ padding: '2px' }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 3h8M5 3V2h2v1M4 3v6h4V3H4z" stroke="#F9847A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* 追加フォーム */}
                {addingTodo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                    <div style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                    <input
                      autoFocus
                      value={newTodoContent}
                      onChange={e => setNewTodoContent(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addTodo(); if (e.key === 'Escape') { setAddingTodo(false); setNewTodoContent('') } }}
                      placeholder="TODOを入力..."
                      style={{
                        flex: 1, fontSize: '12px', padding: '2px 6px',
                        border: '1px solid #FAA66B', borderRadius: '6px',
                        outline: 'none', color: '#3F342D',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        onClick={addTodo}
                        style={{ fontSize: '11px', color: '#7ECB99', fontWeight: 700 }}
                      >追加</button>
                      <button
                        onClick={() => { setAddingTodo(false); setNewTodoContent('') }}
                        style={{ fontSize: '11px', color: '#3F342D66' }}
                      >✕</button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '6px 16px 10px', borderTop: '1px solid #F5EEE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => { setAddingTodo(true); setEditingId(null) }}
                  style={{ fontSize: '11px', color: '#FAA66B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M5.5 1v9M1 5.5h9" stroke="#FAA66B" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  追加
                </button>
                <button
                  onClick={generateTodos}
                  disabled={generatingTodos}
                  style={{ fontSize: '11px', color: generatingTodos ? '#3F342D44' : '#3F342D88', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M9.5 5.5A4 4 0 1 1 5.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M7 1h2.5v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {generatingTodos ? '再生成中...' : 'やり直す'}
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '100%',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
              width: '100%',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              {msg.role === 'assistant' && (
                <Image
                  src="/potori/happy.png"
                  alt="ぽとり"
                  width={34}
                  height={34}
                  className="object-contain shrink-0"
                  style={{ marginBottom: '2px' }}
                />
              )}
              <div
                style={{
                  maxWidth: '68%',
                  padding: '11px 14px',
                  fontSize: '14px',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  ...(msg.role === 'assistant'
                    ? {
                        backgroundColor: '#fff',
                        color: '#3F342D',
                        borderRadius: '4px 16px 16px 16px',
                        boxShadow: '0 1px 3px rgba(63,52,45,0.08)',
                      }
                    : {
                        backgroundColor: '#FAA66B',
                        color: '#fff',
                        borderRadius: '16px 4px 16px 16px',
                        animation: 'fadeInRight 0.28s ease forwards',
                      }),
                }}
              >
                {msg.content ? renderContent(msg.content) : (
                  <span style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 0' }}>
                    {[0, 150, 300].map(d => (
                      <span
                        key={d}
                        className="animate-bounce"
                        style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          backgroundColor: '#FAA66B66',
                          animationDelay: `${d}ms`, display: 'inline-block',
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </div>
            {msg.isMoodCheck && (
              <div style={{ paddingLeft: '42px' }}>
                {!msg.moodSelected ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '220px' }}>
                    {MOOD_LEVELS.map(level => (
                      <button
                        key={level}
                        onClick={() => handleMoodSelect(level, i)}
                        disabled={loading}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '12px',
                          border: '1.5px solid #EDE5DC',
                          backgroundColor: '#fff',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: loading ? '#3F342D44' : '#3F342D',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          lineHeight: 1.4,
                          textAlign: 'center',
                        }}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#3F342D66',
                      padding: '6px 12px',
                      backgroundColor: '#F5EFE9',
                      borderRadius: '10px',
                      display: 'inline-block',
                    }}
                  >
                    ✓ {msg.moodSelected}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div style={{ height: '4px' }} />
      </div>

      {/* Bottom area */}
      <div style={{ backgroundColor: '#fff', flexShrink: 0, borderTop: '1px solid #EDE5DC' }}>

        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '10px 12px 10px' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={() => setMenuOpen(false)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            disabled={loading}
            maxLength={1000}
            placeholder="メッセージを入力..."
            rows={1}
            style={{
              flex: 1, resize: 'none', borderRadius: '22px',
              padding: '10px 16px', fontSize: '14px', outline: 'none',
              border: '1.5px solid #EDE5DC', backgroundColor: '#FAF7F4',
              color: '#3F342D', maxHeight: '100px', lineHeight: 1.5,
            }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 100)}px`
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              backgroundColor: input.trim() && !loading ? '#FAA66B' : '#EDE5DC',
              transition: 'background-color 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill={input.trim() && !loading ? '#fff' : '#3F342D44'} />
            </svg>
          </button>
        </div>

        {/* Menu toggle bar */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: '100%',
            padding: '6px 0',
            fontSize: '12px',
            color: '#3F342D66',
            backgroundColor: '#F5EFE9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            borderTop: '1px solid #EDE5DC',
          }}
        >
          <span style={{ letterSpacing: '0.04em' }}>メニュー</span>
          <svg
            width="10" height="6" viewBox="0 0 10 6" fill="none"
            style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path d="M1 1l4 4 4-4" stroke="#3F342D66" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Menu grid */}
        {menuOpen && (
          <div style={{ backgroundColor: '#E8DDD4', borderTop: '1px solid #E8DDD4' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
              {menuCells.map(cell => (
                <button
                  key={cell.id}
                  onClick={cell.action}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '8px 6px 7px',
                    backgroundColor: cell.active ? '#FAA66B' : '#fff',
                    cursor: 'pointer',
                    gap: '4px',
                    minHeight: '72px',
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                      src={cell.img}
                      alt={cell.title}
                      width={40}
                      height={40}
                      className="object-contain"
                      style={{ opacity: cell.active ? 0.95 : 1 }}
                    />
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, lineHeight: 1.2, textAlign: 'center',
                    color: cell.active ? '#fff' : '#3F342D',
                  }}>
                    {cell.title}
                  </span>
                  <span style={{
                    fontSize: '9px', letterSpacing: '0.06em',
                    color: cell.active ? '#fff9' : '#3F342D55',
                    textTransform: 'uppercase',
                  }}>
                    {cell.sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Subscription CTA */}
            {!isSubscribed && (
              <div style={{ padding: '2px 2px 2px' }}>
                <button
                  onClick={() => router.push('/subscription')}
                  style={{
                    width: '100%', padding: '9px 20px',
                    background: 'linear-gradient(135deg, #FAA66B 0%, #F07B3A 100%)',
                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                  }}
                >
                  <Image src="/potori/peek.png" alt="" width={28} height={28} className="object-contain" style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>サブスクに登録する</div>
                    <div style={{ fontSize: '10px', color: '#fff9', letterSpacing: '0.03em' }}>すべての機能を解放する</div>
                  </div>
                  <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
            {isSubscribed && (
              <div style={{ padding: '2px 2px 2px' }}>
                <button
                  onClick={() => router.push('/subscription')}
                  style={{
                    width: '100%', padding: '9px 20px',
                    background: isMatsuUser
                      ? 'linear-gradient(135deg, #E8DDD4 0%, #D4C4B4 100%)'
                      : 'linear-gradient(135deg, #C8B8A8 0%, #A89880 100%)',
                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                  }}
                >
                  <Image src="/potori/peek.png" alt="" width={28} height={28} className="object-contain" style={{ filter: 'brightness(0) invert(1)', opacity: 0.7 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: isMatsuUser ? '#3F342D' : '#fff' }}>
                      {isMatsuUser ? 'プランを確認する' : 'プランをアップグレード'}
                    </div>
                    <div style={{ fontSize: '10px', color: isMatsuUser ? '#3F342D88' : '#fff9', letterSpacing: '0.03em' }}>
                      {isMatsuUser ? '現在：ぬくもりプラン' : 'より多くの機能を使う'}
                    </div>
                  </div>
                  <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke={isMatsuUser ? '#3F342D88' : '#fff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
