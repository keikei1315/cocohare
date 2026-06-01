'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import GlobalNavDrawer from '@/app/components/GlobalNavDrawer'

export type Note = { id: string; type: string; input_concern: string; content: string; created_at: string }
type ArticleSection = { heading: string; body: string }
type Article = { title: string; lead: string; sections: ArticleSection[]; closing: string }

function parseArticle(content: string): Article | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed.title && parsed.lead && Array.isArray(parsed.sections) && parsed.closing) {
      return parsed as Article
    }
    return null
  } catch {
    return null
  }
}

function renderText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*([^*]+)\*\*|==([^=]+)==)/g
  let lastIndex = 0
  let match
  let key = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    if (match[0].startsWith('**')) {
      parts.push(<strong key={key++} style={{ fontWeight: 700, color: '#3F342D' }}>{match[2]}</strong>)
    } else {
      parts.push(
        <mark key={key++} style={{ backgroundColor: '#FFF0D6', padding: '1px 3px', borderRadius: '3px', color: '#3F342D' }}>
          {match[3]}
        </mark>
      )
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length <= 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>
}

const BOOK_PALETTE = [
  { bg: '#FAA66B', spine: '#E8884A', text: '#fff' },
  { bg: '#F4C89A', spine: '#DFA86A', text: '#3F342D' },
  { bg: '#AAD4B8', spine: '#7CB898', text: '#2A3C30' },
  { bg: '#F0AAAA', spine: '#D88080', text: '#3F2A2A' },
  { bg: '#AABEE0', spine: '#809CC8', text: '#2A3448' },
  { bg: '#D8C4A0', spine: '#BEA478', text: '#3A3020' },
  { bg: '#C4D4A8', spine: '#A0B87C', text: '#2E3A1E' },
  { bg: '#E0C4A8', spine: '#C8A07C', text: '#3A2C1E' },
  { bg: '#C4AAD8', spine: '#A484BE', text: '#3A2C44' },
  { bg: '#F4D4A0', spine: '#E0B468', text: '#3A3018' },
]

const textareaStyle: React.CSSProperties = {
  width: '100%', resize: 'none', borderRadius: '12px',
  padding: '12px 14px', fontSize: '14px', outline: 'none',
  border: '1.5px solid #F0EAE5', backgroundColor: '#FFF9F5',
  color: '#3F342D', lineHeight: 1.6, boxSizing: 'border-box',
}

function FormField({
  label, hint, required, children,
}: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
        <label style={{ fontSize: '12px', fontWeight: 700, color: '#3F342D' }}>
          {label}{required && <span style={{ color: '#FAA66B', marginLeft: '2px' }}>*</span>}
        </label>
        {hint && <span style={{ fontSize: '11px', color: '#3F342D55' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export default function JibunnNoteClient({ initialNotes, initialLimit, initialUseMonthlyReset, initialNoteCredits, embedded = false }: {
  initialNotes: Note[]
  initialLimit: number
  initialUseMonthlyReset: boolean
  initialNoteCredits: number
  embedded?: boolean
}) {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [noteLimit] = useState(initialLimit)
  const [useMonthlyReset] = useState(initialUseMonthlyReset)
  const [noteCredits, setNoteCredits] = useState(initialNoteCredits)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [concern, setConcern] = useState('')
  const [situation, setSituation] = useState('')
  const [feeling, setFeeling] = useState('')
  const [thoughts, setThoughts] = useState('')
  const [bodyReaction, setBodyReaction] = useState('')
  const [selfCompass, setSelfCompass] = useState('')
  const [wantedFrom, setWantedFrom] = useState('')
  const [wantedToDo, setWantedToDo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [globalMenuOpen, setGlobalMenuOpen] = useState(false)
  const [savingMsgIndex, setSavingMsgIndex] = useState(0)
  const SAVING_MESSAGES = ['ノートを作成しています', '30秒〜1分ほど時間がかかります']

  useEffect(() => {
    if (!saving) { setSavingMsgIndex(0); return }
    const timer = setInterval(() => setSavingMsgIndex(i => (i + 1) % SAVING_MESSAGES.length), 4000)
    return () => clearInterval(timer)
  }, [saving])

  const resetForm = () => {
    setConcern(''); setSituation(''); setFeeling(''); setThoughts('')
    setBodyReaction(''); setSelfCompass(''); setWantedFrom(''); setWantedToDo('')
  }

  const saveNote = async () => {
    if (!concern.trim()) return
    setSaving(true)
    setSaveError('')
    const parts = [
      situation.trim() && `【状況・背景】\n${situation.trim()}`,
      feeling.trim() && `【そのときの気持ち】\n${feeling.trim()}`,
      thoughts.trim() && `【頭によぎった言葉・考え】\n${thoughts.trim()}`,
      bodyReaction.trim() && `【体の反応】\n${bodyReaction.trim()}`,
      wantedFrom.trim() && `【どうしてほしかったか】\n${wantedFrom.trim()}`,
      wantedToDo.trim() && `【どうしたかったか】\n${wantedToDo.trim()}`,
      selfCompass.trim() && `【大切な人への言葉】\n${selfCompass.trim()}`,
    ].filter(Boolean).join('\n\n')
    try {
      const res = await fetch('/api/counseling/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_concern: concern, input_situation: parts, generateAi: true }),
      })
      const data = await res.json()
      if (res.status === 429) {
        setSaveError('limit_reached')
      } else if (res.status === 403) {
        setSaveError('じぶんノートは完全版診断（¥4,960）またはサブスク（ぬくもりプラン）でご利用いただけます。')
      } else if (!res.ok) {
        setSaveError(`エラーが発生しました（${data.error ?? res.status}）`)
      } else if (data.note) {
        setNotes(prev => [data.note, ...prev])
        if (data.note_credits !== undefined) setNoteCredits(data.note_credits)
        resetForm()
        setFormOpen(false)
      } else {
        setSaveError('ノートの作成に失敗しました。もう一度お試しください。')
      }
    } finally {
      setSaving(false)
    }
  }

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    setSelectedNote(null)
    await fetch(`/api/counseling/note/${id}`, { method: 'DELETE' })
  }

  const purchaseExtraNote = async () => {
    setPurchaseLoading(true)
    try {
      const res = await fetch('/api/stripe/create-note-purchase', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setPurchaseLoading(false)
    }
  }

  const jstOffsetMs = 9 * 60 * 60 * 1000
  const jstNow = new Date(Date.now() + jstOffsetMs)
  const notesThisMonth = notes.filter(n => {
    const d = new Date(new Date(n.created_at).getTime() + jstOffsetMs)
    return d.getUTCFullYear() === jstNow.getUTCFullYear() && d.getUTCMonth() === jstNow.getUTCMonth()
  }).length
  const countForLimit = useMonthlyReset ? notesThisMonth : notes.length
  const isLimitReached = countForLimit >= noteLimit && noteCredits <= 0

  const bookColor = (i: number) => BOOK_PALETTE[i % BOOK_PALETTE.length]

  return (
    <div style={embedded
      ? { backgroundColor: '#FFF9F5' }
      : { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#FFF9F5', zIndex: 50 }
    }>

      {!embedded && <GlobalNavDrawer isOpen={globalMenuOpen} onClose={() => setGlobalMenuOpen(false)} />}

      {/* Header - standalone only */}
      {!embedded && (
        <div
          style={{
            height: '56px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 16px',
            borderBottom: '1px solid #F0EAE5', flexShrink: 0,
            backgroundColor: '#fff',
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              color: '#FAA66B', padding: '6px 10px',
              border: '1.5px solid #FAA66B', borderRadius: '20px',
              fontSize: '12px', fontWeight: 600,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11l-4-4 4-4" stroke="#FAA66B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            トーク
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Image src="/potori/humming.png" alt="" width={22} height={22} className="object-contain" />
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#3F342D' }}>じぶんノート</span>
          </div>
          <button
            onClick={() => setGlobalMenuOpen(true)}
            style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center' }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: 'block', width: '18px', height: '1.5px', backgroundColor: '#3F342D', borderRadius: '2px' }} />
            ))}
          </button>
        </div>
      )}

      {/* Main content */}
      <div style={embedded
        ? { padding: '0 16px 24px' }
        : { flex: 1, overflowY: 'auto', padding: '20px 16px 32px' }
      }>

        {notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Image src="/potori/peek.png" alt="" width={80} height={80} className="object-contain mx-auto mb-4" />
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#3F342D', marginBottom: '8px' }}>
              ノートがまだありません
            </p>
            <p style={{ fontSize: '13px', color: '#3F342D66', lineHeight: 1.7 }}>
              気になること・モヤモヤをぽとりと一緒に<br />言語化してみましょう
            </p>
            {isLimitReached ? (
              <button
                onClick={purchaseExtraNote}
                disabled={purchaseLoading}
                style={{
                  marginTop: '20px', padding: '12px 28px', borderRadius: '24px',
                  backgroundColor: '#FAA66B', color: '#fff', fontSize: '14px', fontWeight: 700,
                  opacity: purchaseLoading ? 0.6 : 1,
                }}
              >
                {purchaseLoading ? '処理中...' : '¥480で1冊追加'}
              </button>
            ) : (
              <button
                onClick={() => setFormOpen(true)}
                style={{
                  marginTop: '20px', padding: '12px 28px', borderRadius: '24px',
                  backgroundColor: '#FAA66B', color: '#fff', fontSize: '14px', fontWeight: 700,
                }}
              >
                最初のノートを作る
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Create button + remaining count */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#3F342D66', lineHeight: 1.6 }}>
                {useMonthlyReset ? '今月あと' : 'あと'}
                <span style={{ color: '#FAA66B', fontWeight: 700, fontSize: '14px', margin: '0 2px' }}>
                  {Math.max(0, noteLimit - countForLimit) + noteCredits}
                </span>
                冊作れます
              </p>
              {isLimitReached ? (
                <button
                  onClick={purchaseExtraNote}
                  disabled={purchaseLoading}
                  style={{
                    padding: '8px 18px', borderRadius: '20px',
                    backgroundColor: '#FAA66B', color: '#fff',
                    fontSize: '13px', fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(250,166,107,0.3)',
                    opacity: purchaseLoading ? 0.6 : 1,
                  }}
                >
                  {purchaseLoading ? '処理中...' : '¥480で1冊追加'}
                </button>
              ) : (
                <button
                  onClick={() => setFormOpen(true)}
                  style={{
                    padding: '8px 18px', borderRadius: '20px',
                    backgroundColor: '#FAA66B', color: '#fff',
                    fontSize: '13px', fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(250,166,107,0.3)',
                  }}
                >
                  ノートを作る
                </button>
              )}
            </div>

            {/* Bookshelf */}
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              border: '1px solid #F0EAE5',
              boxShadow: '0 2px 8px rgba(63,52,45,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 16px 0' }}>
                <p style={{
                  fontSize: '10px', color: '#3F342D44',
                  letterSpacing: '0.14em', fontWeight: 600, marginBottom: '16px',
                }}>
                  MY NOTES
                </p>

                {/* Books */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', alignItems: 'flex-end' }}>
                  {notes.map((note, i) => {
                    const color = bookColor(i)
                    const article = parseArticle(note.content)
                    const spineTitle = article?.title
                      ?? (note.input_concern.length > 10 ? note.input_concern.slice(0, 9) + '…' : note.input_concern)
                    const date = new Date(note.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
                    const heights = [168, 156, 180, 162, 172, 150, 176, 160, 168, 184]
                    const h = heights[i % heights.length]

                    return (
                      <button
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        style={{
                          width: '44px',
                          height: `${h}px`,
                          borderRadius: '3px 6px 6px 3px',
                          backgroundColor: color.bg,
                          boxShadow: `inset -5px 0 0 ${color.spine}, 0 2px 6px rgba(63,52,45,0.14)`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 0 10px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-6px)'
                          e.currentTarget.style.boxShadow = `inset -5px 0 0 ${color.spine}, 0 8px 18px rgba(63,52,45,0.2)`
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = `inset -5px 0 0 ${color.spine}, 0 2px 6px rgba(63,52,45,0.14)`
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: '5px', height: '3px',
                          backgroundColor: 'rgba(255,255,255,0.45)',
                        }} />
                        <p style={{
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: color.text,
                          letterSpacing: '0.08em',
                          flex: 1,
                          overflow: 'hidden',
                          opacity: 0.9,
                          textAlign: 'start',
                        }}>
                          {spineTitle}
                        </p>
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 700,
                          color: color.text,
                          opacity: 0.75,
                          marginTop: '6px',
                          letterSpacing: '0.01em',
                          lineHeight: 1,
                        }}>
                          {date}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Shelf plank */}
              <div style={{
                height: '14px',
                marginTop: '14px',
                background: 'linear-gradient(180deg, #EDD5B0 0%, #D8BA8C 100%)',
                borderTop: '1px solid #F0DCB8',
                boxShadow: '0 3px 6px rgba(63,52,45,0.12)',
              }} />
            </div>
          </>
        )}
      </div>

      {/* Note detail modal */}
      {selectedNote && (
        <>
          <div
            onClick={() => setSelectedNote(null)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60 }}
          />
          <div
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, top: '10%',
              zIndex: 70, backgroundColor: '#fff',
              borderRadius: '20px 20px 0 0',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 -4px 24px rgba(63,52,45,0.15)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#EDE5DC' }} />
            </div>

            {/* Modal header */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 20px 12px',
                borderBottom: '1px solid #F0EAE5',
              }}
            >
              <div>
                <p style={{ fontSize: '11px', color: '#3F342D66', marginBottom: '2px' }}>
                  {new Date(selectedNote.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {selectedNote.type === 'normal' && (
                    <span style={{ marginLeft: '8px', color: '#FAA66B', fontWeight: 600 }}>✦ ぽとり</span>
                  )}
                </p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#3F342D' }}>
                  「{selectedNote.input_concern}」
                </p>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                style={{ color: '#3F342D44', fontSize: '20px', padding: '4px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Note content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 4px' }}>
              {(() => {
                const article = parseArticle(selectedNote.content)
                if (!article) {
                  return (
                    <p style={{ fontSize: '15px', lineHeight: 1.9, color: '#3F342D', whiteSpace: 'pre-wrap' }}>
                      {selectedNote.content}
                    </p>
                  )
                }
                return (
                  <div>
                    <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#3F342D', marginBottom: '18px', lineHeight: 1.45 }}>
                      {article.title}
                    </h2>
                    <p style={{
                      fontSize: '14px', lineHeight: 1.95, color: '#5C4E44',
                      marginBottom: '28px', borderLeft: '3px solid #FAA66B',
                      paddingLeft: '14px', fontStyle: 'italic',
                    }}>
                      {renderText(article.lead)}
                    </p>
                    {article.sections.map((section, i) => (
                      <div key={i} style={{ marginBottom: '26px' }}>
                        <h3 style={{
                          fontSize: '15px', fontWeight: 700, color: '#FAA66B',
                          marginBottom: '8px', letterSpacing: '0.02em',
                        }}>
                          {section.heading}
                        </h3>
                        <p style={{ fontSize: '14px', lineHeight: 1.95, color: '#3F342D', whiteSpace: 'pre-wrap' }}>
                          {renderText(section.body)}
                        </p>
                      </div>
                    ))}
                    <div style={{
                      marginTop: '28px', marginBottom: '8px',
                      backgroundColor: '#FFF9F5', borderRadius: '12px',
                      padding: '16px 18px',
                      border: '1px solid #F0EAE5',
                    }}>
                      <p style={{ fontSize: '14px', lineHeight: 1.95, color: '#5C4E44' }}>
                        {renderText(article.closing)}
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Delete button */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #F0EAE5' }}>
              <button
                onClick={() => deleteNote(selectedNote.id)}
                style={{
                  width: '100%', padding: '11px', borderRadius: '12px',
                  backgroundColor: '#FFF0F0', color: '#E06060',
                  fontSize: '13px', fontWeight: 600,
                  border: '1px solid #F0DADA',
                }}
              >
                このノートを削除する
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create note form modal */}
      {formOpen && (
        <>
          <div
            onClick={() => setFormOpen(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60 }}
          />
          <div
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              zIndex: 70, backgroundColor: '#fff',
              borderRadius: '20px 20px 0 0',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 -4px 24px rgba(63,52,45,0.15)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#EDE5DC' }} />
            </div>

            {/* Form header */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 20px 16px', borderBottom: '1px solid #F0EAE5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Image src="/potori/comforting.png" alt="" width={28} height={28} className="object-contain" />
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#3F342D' }}>ノートを作る</span>
              </div>
              <button onClick={() => setFormOpen(false)} style={{ color: '#3F342D44', fontSize: '20px', lineHeight: 1 }}>✕</button>
            </div>

            {/* Form content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: '#3F342D66', lineHeight: 1.6, marginBottom: '20px' }}>
                うまく言葉にできなくても大丈夫です。気づいたことを、思いついたまま書いてみてください。ぽとりが一緒に整理します。
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                <FormField label="気になっていること・悩み" required>
                  <textarea
                    value={concern}
                    onChange={e => setConcern(e.target.value)}
                    placeholder="最近モヤモヤしていること、気になっていること..."
                    rows={3}
                    style={textareaStyle}
                  />
                </FormField>

                <FormField label="状況・背景" hint="言葉がまとまってなくていいです。断片でもOK">
                  <textarea
                    value={situation}
                    onChange={e => setSituation(e.target.value)}
                    placeholder="いつ頃から？どんな場面で起きた？誰がいた？"
                    rows={2}
                    style={textareaStyle}
                  />
                </FormField>

                <FormField label="そのときどんな気持ちでしたか？" hint="感情の名前が出てこなくてもOK">
                  <textarea
                    value={feeling}
                    onChange={e => setFeeling(e.target.value)}
                    placeholder="悲しかった、怖かった、なんかモヤモヤした、うまく言えないけど..."
                    rows={2}
                    style={textareaStyle}
                  />
                </FormField>

                <FormField label="そのとき頭によぎった言葉や考えは？" hint="「どうせ〜」「なんで自分ばかり〜」みたいなやつ">
                  <textarea
                    value={thoughts}
                    onChange={e => setThoughts(e.target.value)}
                    placeholder="どうせ自分には無理、また失敗した、なんでわかってくれないんだろう..."
                    rows={2}
                    style={textareaStyle}
                  />
                </FormField>

                <FormField label="体にどんな反応がありましたか？" hint="感情が体に出ていたこと">
                  <textarea
                    value={bodyReaction}
                    onChange={e => setBodyReaction(e.target.value)}
                    placeholder="胸が重かった、お腹が痛くなった、力が入らなかった、涙が出た..."
                    rows={2}
                    style={textareaStyle}
                  />
                </FormField>

                <FormField label="どうしてほしかったですか？" hint="正解はありません、思ったままで">
                  <textarea
                    value={wantedFrom}
                    onChange={e => setWantedFrom(e.target.value)}
                    placeholder="話を聞いてほしかった、認めてほしかった、そっとしておいてほしかった..."
                    rows={2}
                    style={textareaStyle}
                  />
                </FormField>

                <FormField label="本当はどうしたかったですか？" hint="できた・できなかったは関係なく">
                  <textarea
                    value={wantedToDo}
                    onChange={e => setWantedToDo(e.target.value)}
                    placeholder="その場から離れたかった、もっと話したかった、泣きたかった..."
                    rows={2}
                    style={textareaStyle}
                  />
                </FormField>

                <FormField label="同じ状況の大切な人がいたら、何と声をかけますか？" hint="自分には厳しくても、相手には優しくなれることがある">
                  <textarea
                    value={selfCompass}
                    onChange={e => setSelfCompass(e.target.value)}
                    placeholder="「それは辛かったね」「よく頑張ったと思うよ」など..."
                    rows={2}
                    style={textareaStyle}
                  />
                </FormField>

                {saveError === 'limit_reached' ? (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#E06060', lineHeight: 1.6, marginBottom: '8px' }}>
                      {useMonthlyReset ? '今月の' : ''}上限に達しました。¥480で1冊追加できます。
                    </p>
                    <button
                      onClick={purchaseExtraNote}
                      disabled={purchaseLoading}
                      style={{
                        padding: '10px 24px', borderRadius: '20px',
                        backgroundColor: '#FAA66B', color: '#fff',
                        fontSize: '13px', fontWeight: 700,
                        opacity: purchaseLoading ? 0.6 : 1,
                      }}
                    >
                      {purchaseLoading ? '処理中...' : '¥480で1冊追加する'}
                    </button>
                  </div>
                ) : saveError ? (
                  <p style={{ fontSize: '12px', color: '#E06060', textAlign: 'center', lineHeight: 1.6 }}>
                    {saveError}
                  </p>
                ) : null}

                <style>{`
                  @keyframes slideUpIn {
                    from { transform: translateY(100%); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                  }
                `}</style>
                <button
                  onClick={saveNote}
                  disabled={!concern.trim() || saving}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    fontSize: '14px', fontWeight: 700,
                    backgroundColor: concern.trim() && !saving ? '#FAA66B' : '#F0EAE5',
                    color: concern.trim() && !saving ? '#fff' : '#3F342D66',
                    transition: 'all 0.15s',
                    boxShadow: concern.trim() && !saving ? '0 2px 8px rgba(250,166,107,0.3)' : 'none',
                    overflow: 'hidden',
                  }}
                >
                  {saving ? (
                    <span
                      key={savingMsgIndex}
                      style={{ display: 'inline-block', animation: 'slideUpIn 0.5s cubic-bezier(0.22,1,0.36,1)' }}
                    >
                      {SAVING_MESSAGES[savingMsgIndex]}
                    </span>
                  ) : 'ノートを作る'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
