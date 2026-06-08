'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface LinkStatus {
  token: string
  answered: boolean
}

const NAME_KEY = 'cocohare_requester_name'

function OtherDiagnosisContent() {
  const searchParams = useSearchParams()
  const diagnosisId = searchParams.get('diagnosisId')

  const [links, setLinks] = useState<LinkStatus[]>([])
  const [answerCount, setAnswerCount] = useState(0)
  const [creating, setCreating] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savedName, setSavedName] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    const saved = localStorage.getItem(NAME_KEY)
    if (saved) {
      setSavedName(saved)
      setNameInput(saved)
    }
  }, [])

  const fetchLinks = useCallback(async () => {
    if (!diagnosisId) return
    const res = await fetch(`/api/diagnosis/other/links?diagnosisId=${diagnosisId}`)
    if (res.ok) {
      const data = await res.json()
      setLinks(data.links ?? [])
      setAnswerCount(data.answerCount ?? 0)
    }
  }, [diagnosisId])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const handleSaveName = () => {
    if (!nameInput.trim()) return
    localStorage.setItem(NAME_KEY, nameInput.trim())
    setSavedName(nameInput.trim())
    setEditingName(false)
  }

  const handleCreate = async () => {
    if (!diagnosisId || !savedName) return
    setCreating(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/diagnosis/other/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosisId, requesterName: savedName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchLinks()
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'リンク作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async (token: string) => {
    const url = `${window.location.origin}/diagnosis/other/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const remaining = Math.max(0, 3 - answerCount)
  const nameReady = savedName && !editingName

  return (
    <div className="min-h-screen px-4 pt-10 pb-20" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="w-full max-w-sm mx-auto">

        <div className="flex justify-center mb-5">
          <Image src="/potori/humming.png" alt="ぽとり" width={90} height={90} className="object-contain" />
        </div>

        <h1 className="text-xl font-bold text-center mb-2" style={{ color: '#3F342D' }}>他者視点診断</h1>
        <p className="text-xs text-center mb-6 leading-relaxed" style={{ color: '#3F342D99' }}>
          友人・家族・職場の人にリンクを送り、<br />外から見たあなたを診断してもらいましょう。
        </p>

        {/* 進捗バー */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: '#3F342D' }}>
              {answerCount}人が回答済み
            </span>
            <span className="text-xs" style={{ color: answerCount >= 3 ? '#FAA66B' : '#3F342D66' }}>
              {answerCount >= 3
                ? '全セクション解放中！'
                : answerCount >= 1
                ? `あと${remaining}人で追加セクション解放`
                : '回答で項目が解放されます'}
            </span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#F0EAE5' }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((answerCount / 3) * 100, 100)}%`, backgroundColor: '#FAA66B' }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: '#3F342D66' }}>
            {answerCount === 0
              ? '1人でも回答してもらうと「他者から見たあなた」が解放されます。3人以上でさらに「みんなから見たあなた」も解放されます。'
              : answerCount < 3
              ? `${answerCount}人が回答済み。あと${remaining}人に依頼するとさらに多くの項目が見られます。`
              : 'すべてのセクションが解放されています。'}
          </p>
        </div>

        {/* 名前設定 */}
        {!nameReady ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 space-y-3">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: '#3F342D' }}>
                まず、あなたの名前を教えてください
              </p>
              <p className="text-xs leading-relaxed" style={{ color: '#3F342D66' }}>
                リンクを受け取った相手に「○○さんを診断する」と表示されます
              </p>
            </div>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              placeholder="例：田中、たっちゃん"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none"
              style={{
                borderColor: nameInput ? '#FAA66B' : '#E5DDD8',
                backgroundColor: '#FAFAFA',
                color: '#3F342D',
              }}
            />
            <div className="flex gap-2">
              {editingName && (
                <button
                  onClick={() => { setEditingName(false); setNameInput(savedName ?? '') }}
                  className="flex-1 py-2.5 rounded-xl text-xs border"
                  style={{ borderColor: '#E5DDD8', color: '#3F342D99' }}
                >
                  キャンセル
                </button>
              )}
              <button
                onClick={handleSaveName}
                disabled={!nameInput.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-white transition"
                style={{ backgroundColor: nameInput.trim() ? '#FAA66B' : '#E5DDD8' }}
              >
                確定する
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-1 mb-4">
            <span className="text-xs" style={{ color: '#3F342D66' }}>
              依頼者名：<span className="font-medium" style={{ color: '#3F342D' }}>{savedName}</span>
            </span>
            <button
              onClick={() => setEditingName(true)}
              className="text-xs underline"
              style={{ color: '#3F342D66' }}
            >
              変更
            </button>
          </div>
        )}

        {/* 発行済みリンク一覧 */}
        {nameReady && links.length > 0 && (
          <div className="space-y-3 mb-4">
            {links.map((link, i) => (
              <div key={link.token} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{
                        backgroundColor: link.answered ? '#E8F5E9' : '#FFF2E8',
                        color: link.answered ? '#4CAF50' : '#FAA66B',
                      }}
                    >
                      {link.answered ? '✓' : i + 1}
                    </div>
                    <span className="text-sm font-medium" style={{ color: link.answered ? '#4CAF50' : '#3F342D' }}>
                      {link.answered ? '回答済み' : '回答待ち'}
                    </span>
                  </div>
                  {!link.answered && (
                    <button
                      onClick={() => handleCopy(link.token)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                      style={{
                        backgroundColor: copiedToken === link.token ? '#E8F5E9' : '#FFF2E8',
                        color: copiedToken === link.token ? '#4CAF50' : '#FAA66B',
                      }}
                    >
                      {copiedToken === link.token ? 'コピー済み！' : 'コピー'}
                    </button>
                  )}
                </div>

                {/* URL表示 */}
                <div
                  className="rounded-lg px-3 py-2 text-xs break-all"
                  style={{ backgroundColor: '#F5F0EC', color: '#3F342D99', fontFamily: 'monospace' }}
                >
                  {origin}/diagnosis/other/{link.token}
                </div>

                {!link.answered && (
                  <p className="text-xs mt-2" style={{ color: '#3F342D66' }}>
                    ↑ このリンクをLINEやSNSで送り、回答してもらいましょう
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 新規リンク発行ボタン */}
        {nameReady && (
          <>
            {errorMsg && <p className="text-xs mb-2 text-center" style={{ color: '#E57373' }}>{errorMsg}</p>}
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-3.5 rounded-2xl text-sm font-medium mb-4 transition"
              style={{ backgroundColor: creating ? '#E5DDD8' : '#FAA66B', color: '#fff' }}
            >
              {creating ? '発行中...' : links.length === 0 ? '診断リンクを発行する' : `もう1人に依頼する（${links.length}人に依頼済み）`}
            </button>
          </>
        )}

        {diagnosisId && (
          <Link
            href={`/diagnosis/free/result/${diagnosisId}`}
            className="block w-full py-3 rounded-xl text-center text-sm border transition"
            style={{ borderColor: '#E5DDD8', color: '#3F342D99' }}
          >
            自分の診断結果に戻る
          </Link>
        )}
      </div>
    </div>
  )
}

export default function OtherDiagnosisPage() {
  return (
    <Suspense>
      <OtherDiagnosisContent />
    </Suspense>
  )
}
