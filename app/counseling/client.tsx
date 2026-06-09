'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
  mode?: 'counseling' | 'coaching'
}

type Mode = 'counseling' | 'coaching'

const FIRST_MESSAGE: Message = {
  role: 'assistant',
  content: 'こんにちは。ぽとりです。\n今日はどんなことを話しましょうか？\n何でも、ゆっくり話してください。',
  mode: 'counseling',
}

export default function CounselingClient({
  initialMessages,
  hasDiagnosis,
}: {
  initialMessages: Message[]
  hasDiagnosis: boolean
}) {
  const messages = initialMessages.length > 0 ? initialMessages : [FIRST_MESSAGE]
  const [chatMessages, setChatMessages] = useState<Message[]>(messages)
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('counseling')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#FFF9F5' }}>

      {/* ヘッダー */}
      <div
        className="flex items-center justify-between px-4 h-12 shrink-0"
        style={{ backgroundColor: '#FFF9F5', borderBottom: '1px solid #F0EAE5' }}
      >
        <Link href="/" className="flex items-center gap-2">
          <Image src="/potori/humming.webp" alt="ぽとり" width={24} height={24} className="object-contain" />
          <span className="text-sm font-bold" style={{ color: '#3F342D' }}>ぽとり</span>
        </Link>

        {/* モード切替 */}
        <div className="flex rounded-full p-0.5" style={{ backgroundColor: '#F0EAE5' }}>
          <button
            onClick={() => setMode('counseling')}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: mode === 'counseling' ? '#FAA66B' : 'transparent',
              color: mode === 'counseling' ? '#fff' : '#3F342D99',
            }}
          >
            カウンセリング
          </button>
          <button
            onClick={() => setMode('coaching')}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: mode === 'coaching' ? '#FAA66B' : 'transparent',
              color: mode === 'coaching' ? '#fff' : '#3F342D99',
            }}
          >
            コーチング
          </button>
        </div>
      </div>

      {/* 診断未実施バナー */}
      {!hasDiagnosis && (
        <div
          className="mx-4 mt-3 px-4 py-3 rounded-2xl text-xs flex items-center justify-between"
          style={{ backgroundColor: '#FFF2E8' }}
        >
          <span style={{ color: '#3F342D99' }}>診断を受けると、より深くあなたに寄り添えます</span>
          <Link
            href="/diagnosis/free"
            className="text-xs font-medium ml-3 shrink-0"
            style={{ color: '#FAA66B' }}
          >
            診断を受ける →
          </Link>
        </div>
      )}

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <Image src="/potori/happy.webp" alt="ぽとり" width={32} height={32} className="object-contain shrink-0 mb-1" />
            )}
            <div
              className="max-w-xs rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
              style={
                msg.role === 'assistant'
                  ? { backgroundColor: '#fff', color: '#3F342D', borderRadius: '4px 18px 18px 18px' }
                  : { backgroundColor: '#FAA66B', color: '#fff', borderRadius: '18px 4px 18px 18px' }
              }
            >
              {msg.content || (
                <span className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: '#FAA66B', animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ backgroundColor: '#FFF9F5', borderTop: '1px solid #F0EAE5' }}
      >
        <div className="flex items-end gap-2 max-w-xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            maxLength={1000}
            placeholder="気持ちを話してみてください..."
            rows={1}
            className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none"
            style={{
              border: '1.5px solid #F0EAE5',
              backgroundColor: '#fff',
              color: '#3F342D',
              maxHeight: '120px',
            }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all"
            style={{ backgroundColor: input.trim() && !loading ? '#FAA66B' : '#F0EAE5' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill={input.trim() && !loading ? '#fff' : '#3F342D66'} />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: '#3F342D33' }}>
          Shift+Enterで改行
        </p>
      </div>
    </div>
  )
}
