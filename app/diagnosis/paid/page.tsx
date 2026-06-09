'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const FEATURES = [
  { icon: '🌱', title: 'しんどさの根っこ', body: 'なぜそのパターンになるのか。幼少期から積み重なった無意識のクセを丁寧に解説します。' },
  { icon: '🪜', title: '回復のヒント 3ステップ', body: 'あなたの特性に合わせた、無理のない小さな一歩から始められる具体的なアクション。' },
  { icon: '🏡', title: '向いている働き方・環境', body: 'あなたの特性が最も活かされる職場環境・コミュニケーションスタイルを具体的に。' },
  { icon: '🤝', title: '人間関係のパターン', body: '親しい人との関係で繰り返しやすい傾向と、それを乗り越えるヒント。' },
  { icon: '🗺️', title: '自己成長のロードマップ', body: '今すぐできる具体的な行動を3つ。小さな変化が大きな変容につながります。' },
  { icon: '💌', title: '今のあなたへの手紙', body: 'しんどい今のあなたに、ぽとりが丁寧に言葉を届けます。このままの自分を肯定できる手紙。' },
]

function PaidPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const diagnosisId = searchParams.get('diagnosisId')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)

  useEffect(() => {
    if (diagnosisId && localStorage.getItem(`paid_unlocked_${diagnosisId}`) === 'true') {
      setIsUnlocked(true)
    }
  }, [diagnosisId])

  const handlePurchase = async () => {
    if (!diagnosisId) { setError('診断IDが見つかりません'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosisId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(data.url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '決済ページの作成に失敗しました')
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    if (!diagnosisId) { setError('診断IDが見つかりません'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/diagnosis/paid/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosisId }),
      })
      if (!res.ok) throw new Error('アンロックに失敗しました')
      router.push(`/diagnosis/paid/${diagnosisId}/questions`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'アンロックに失敗しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#FFF9F5' }}>

      {/* ヘッダー */}
      <div className="px-4 pt-10 pb-8 text-center">
        <div className="flex justify-center mb-4">
          <Image src="/potori/humming.webp" alt="ぽとり" width={90} height={90} className="object-contain" />
        </div>
        <p className="text-xs mb-2" style={{ color: '#FAA66B' }}>詳細レポート</p>
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#3F342D' }}>もっと深く、自分を知る</h1>
        <p className="text-sm leading-relaxed" style={{ color: '#3F342D99' }}>
          無料診断では見えなかった「しんどさの根っこ」と「回復のヒント」を、あなたの特性に合わせてお届けします。
        </p>
      </div>

      <div className="px-4 max-w-xl mx-auto space-y-4">

        {/* 含まれる内容 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold mb-4" style={{ color: '#3F342D' }}>含まれる内容（6項目）</h2>
          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-xl shrink-0">{f.icon}</span>
                <div>
                  <p className="text-sm font-bold mb-0.5" style={{ color: '#3F342D' }}>{f.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#3F342D99' }}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 価格・購入 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          {isUnlocked ? (
            <>
              <div className="inline-block px-3 py-1 rounded-full text-xs mb-3 font-medium" style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}>
                完全版診断購入済み特典
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: '#3F342D' }}>詳細レポートが無料でご利用いただけます</p>
              <p className="text-xs mb-5" style={{ color: '#3F342D66' }}>¥4,960完全版診断のご購入ありがとうございます</p>
              {error && <p className="text-xs mb-3" style={{ color: '#E57373' }}>{error}</p>}
              <button
                onClick={handleUnlock}
                disabled={loading || !diagnosisId}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm transition"
                style={{ backgroundColor: loading || !diagnosisId ? '#E5DDD8' : '#FAA66B' }}
              >
                {loading ? '処理中...' : '詳細レポートを受け取る'}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs mb-1" style={{ color: '#3F342D66' }}>買い切り・一回限り</p>
              <p className="text-3xl font-bold mb-1" style={{ color: '#3F342D' }}>¥1,480</p>
              <p className="text-xs mb-5" style={{ color: '#3F342D66' }}>税込・購入後7日以内全額返金保証</p>
              {error && <p className="text-xs mb-3" style={{ color: '#E57373' }}>{error}</p>}
              <button
                onClick={handlePurchase}
                disabled={loading || !diagnosisId}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm transition"
                style={{ backgroundColor: loading || !diagnosisId ? '#E5DDD8' : '#FAA66B' }}
              >
                {loading ? '決済ページへ移動中...' : '詳細レポートを購入する'}
              </button>
              <p className="text-xs mt-3" style={{ color: '#3F342D66' }}>
                Stripeの安全な決済を使用しています
              </p>
            </>
          )}
        </div>

        {/* 戻るリンク */}
        {diagnosisId && (
          <Link
            href={`/diagnosis/free/result/${diagnosisId}`}
            className="block text-center text-xs py-2"
            style={{ color: '#3F342D66' }}
          >
            ← 無料診断結果に戻る
          </Link>
        )}
      </div>
    </div>
  )
}

export default function PaidDiagnosisPage() {
  return (
    <Suspense>
      <PaidPage />
    </Suspense>
  )
}
