'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'

const REPORTS = [
  { icon: '✦', title: '総合自己分析レポート', body: '性格・才能・深層心理・スピリチュアルをひとつのストーリーに統合した、あなただけの完全個別レポート。' },
  { icon: '◈', title: '才能トップ5レポート', body: '20の才能から上位5つを特定。活きる場面・活きない場面・向いている方向性を詳細解説。' },
  { icon: '✧', title: 'スピリチュアル補足', body: '生年月日から数秘・星座を算出。今のあなたへの宇宙からのメッセージを届けます。' },
  { icon: '◇', title: '目標達成ロードマップ', body: '今日〜1年後までの期間別アクションを、あなたの強みと目標を踏まえてAIが生成。' },
  { icon: '◉', title: '自分大切シート', body: '疲れたときの回復アクション・自分のルール・強みを活かした自分の取扱説明書の3点セット。' },
]

export default function HighTicketClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const freeId = searchParams.get('freeId') ?? ''

  const [hasDiscount, setHasDiscount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [savedDiagnosisId, setSavedDiagnosisId] = useState<string | null>(null)
  const [showRetake, setShowRetake] = useState(false)

  useEffect(() => {
    const freeDiagId = localStorage.getItem('ht_free_diagnosis_id')
    const htDiagId = localStorage.getItem('ht_diagnosis_id')
    // freeIdがURLにある場合、保存済みIDがそれと一致するときだけ「購入済み」とみなす
    if (freeId) {
      if (freeDiagId === freeId) {
        setSavedDiagnosisId(freeDiagId)
        return
      }
    } else {
      const saved = freeDiagId ?? htDiagId ?? null
      if (saved) {
        setSavedDiagnosisId(saved)
        return
      }
    }
    if (!freeId) return
    setChecking(true)
    fetch('/api/stripe/create-checkout-high-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freeDiagnosisId: freeId, checkOnly: true }),
    })
      .then(r => r.json())
      .then(d => { if (d.hasDiscount) setHasDiscount(true) })
      .finally(() => setChecking(false))
  }, [freeId])

  const handlePurchase = async (isSecondTime = false) => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout-high-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeDiagnosisId: freeId, isSecondTime }),
      })
      const data = await res.json()
      if (data.url) router.push(data.url)
    } catch {
      setLoading(false)
    }
  }

  const price = hasDiscount ? 3480 : 4960

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#FFF9F5' }}>
      {/* ヘッダー */}
      <div className="px-4 pt-10 pb-8 text-center max-w-sm mx-auto">
        <div className="flex justify-center mb-4">
          <Image src="/potori/happy.png" alt="ぽとり" width={90} height={90} className="object-contain" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-xs mb-4 font-medium" style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}>
          完全版自己分析
        </div>
        <h1 className="text-xl font-bold mb-3 leading-snug" style={{ color: '#3F342D' }}>
          あなたのすべてを<br />言語化するレポート
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: '#3F342D99' }}>
          才能・深層心理・スピリチュアルを統合した<br />5種類の完全個別レポートをお届けします。
        </p>
      </div>

      <div className="px-4 max-w-sm mx-auto space-y-3">
        {/* レポート一覧 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium mb-4" style={{ color: '#FAA66B' }}>含まれるレポート（5種類）</p>
          <div className="space-y-4">
            {REPORTS.map((r, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-lg shrink-0 mt-0.5" style={{ color: '#FAA66B' }}>{r.icon}</span>
                <div>
                  <p className="text-sm font-bold mb-0.5" style={{ color: '#3F342D' }}>{r.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 設問ボリューム */}
        <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: '#FFF2E8' }}>
          <p className="text-xs font-medium mb-3" style={{ color: '#FAA66B' }}>診断のボリューム</p>
          <div className="space-y-2">
            {[
              { label: '才能診断', desc: '60問（4段階評価）' },
              { label: '深層心理診断', desc: '12問（直感4択）' },
              { label: 'スピリチュアル診断', desc: '6問（直感4択＋テキスト）' },
              { label: '悩み・目標入力', desc: '2問（テキスト自由記述）' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-xs" style={{ color: '#3F342D' }}>{item.label}</span>
                <span className="text-xs font-medium" style={{ color: '#FAA66B' }}>{item.desc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: '#3F342D66' }}>所要時間：約20〜30分</p>
        </div>

        {/* 受診済みバナー */}
        {savedDiagnosisId && !showRetake && (
          <div className="rounded-2xl p-5 shadow-sm bg-white">
            <p className="text-xs font-medium mb-3" style={{ color: '#FAA66B' }}>完全版診断を受診済みです</p>
            <button
              onClick={() => {
                const freeDiagId = localStorage.getItem('ht_free_diagnosis_id')
                const url = freeDiagId
                  ? `/diagnosis/free/result/${freeDiagId}`
                  : `/diagnosis/high-ticket/${savedDiagnosisId}/result`
                router.push(url)
              }}
              className="w-full py-4 rounded-2xl text-white font-medium text-sm mb-3"
              style={{ backgroundColor: '#FAA66B' }}
            >
              レポートを見る
            </button>
            <button
              onClick={() => setShowRetake(true)}
              className="w-full py-2 text-xs"
              style={{ color: '#3F342D66' }}
            >
              もう一度受ける（¥1,990）
            </button>
          </div>
        )}

        {/* 価格・購入（初回 or 再受診） */}
        {(!savedDiagnosisId || showRetake) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            {showRetake && (
              <div className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2" style={{ backgroundColor: '#FFF2E8' }}>
                <span className="text-xs font-medium" style={{ color: '#FAA66B' }}>再受診価格が適用されます</span>
              </div>
            )}
            {!showRetake && checking ? (
              <div className="text-center py-2">
                <p className="text-xs" style={{ color: '#3F342D66' }}>割引を確認中...</p>
              </div>
            ) : (
              <>
                {!showRetake && hasDiscount && (
                  <div className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2" style={{ backgroundColor: '#FFF2E8' }}>
                    <span className="text-xs font-medium" style={{ color: '#FAA66B' }}>¥1,480診断購入済み割引が適用されます</span>
                  </div>
                )}
                <div className="flex items-baseline gap-2 mb-1">
                  {!showRetake && hasDiscount && (
                    <span className="text-sm line-through" style={{ color: '#3F342D66' }}>¥4,960</span>
                  )}
                  <span className="text-2xl font-bold" style={{ color: '#3F342D' }}>
                    ¥{(showRetake ? 1990 : price).toLocaleString()}
                  </span>
                  <span className="text-xs" style={{ color: '#3F342D66' }}>（買い切り）</span>
                </div>
                <p className="text-xs mb-1" style={{ color: '#3F342D66' }}>一度購入すると何度でも確認できます</p>
                <p className="text-xs mb-4" style={{ color: '#3F342D66' }}>購入後7日以内全額返金保証</p>
                <button
                  onClick={() => handlePurchase(showRetake)}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl text-white font-medium text-sm"
                  style={{ backgroundColor: loading ? '#F0C89F' : '#FAA66B' }}
                >
                  {loading ? '処理中...' : `¥${(showRetake ? 1990 : price).toLocaleString()}で完全版診断を受ける`}
                </button>
                {showRetake && (
                  <button
                    onClick={() => setShowRetake(false)}
                    className="w-full py-2 mt-2 text-xs"
                    style={{ color: '#3F342D66' }}
                  >
                    戻る
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
