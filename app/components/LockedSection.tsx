import Link from 'next/link'

interface LockedSectionProps {
  unlockType: 'other' | 'other_multi' | 'paid'
  diagnosisId: string
  remaining?: number
  children: React.ReactNode
}

export default function LockedSection({
  unlockType,
  diagnosisId,
  remaining = 0,
  children,
}: LockedSectionProps) {
  const config = {
    other: {
      title: '相手から見た自分の強みや性格を知ってみませんか？',
      body: '【無料で簡単】リンクを送るだけで診断できます！仲の良い友達や家族に診断してもらい、1人以上の回答でジョハリの4つの窓が解放されます。自分の結果と相手からの結果をグラフで可視化！3人以上でさらに詳細なレポートが届きます。',
      cta: '無料で他者診断を依頼する →',
      href: `/diagnosis/other?diagnosisId=${diagnosisId}`,
    },
    other_multi: {
      title: `あと${remaining}人の回答で解放`,
      body: '3人以上が回答すると「みんなから見たあなた」の特別レポートが追加されます。',
      cta: 'もっと依頼する',
      href: `/diagnosis/other?diagnosisId=${diagnosisId}`,
    },
    paid: {
      title: '有料診断（¥1,480）で解放',
      body: 'しんどさの根っこ・回復のヒント・向いている働き方など、行動につながる6項目が届きます。',
      cta: '詳細レポートを見る (¥1,480)',
      href: `/diagnosis/paid?diagnosisId=${diagnosisId}`,
    },
  }[unlockType]

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* ぼかしコンテンツ */}
      <div style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}>
        {children}
      </div>
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 flex items-center justify-center px-4"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,249,245,0.2) 0%, rgba(255,249,245,0.75) 35%, rgba(255,249,245,0.75) 65%, rgba(255,249,245,0.2) 100%)',
        }}
      >
        <div
          className="bg-white rounded-2xl p-5 w-full max-w-xs text-center shadow-lg"
          style={{ border: '1px solid #F0E8E0' }}
        >
          <div
            className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3"
            style={{ backgroundColor: '#FFF2E8' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAA66B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-sm font-bold mb-2" style={{ color: '#3F342D' }}>{config.title}</p>
          <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>{config.body}</p>
          <Link
            href={config.href}
            className="block w-full py-2.5 rounded-xl text-white text-xs font-medium"
            style={{ backgroundColor: '#FAA66B' }}
          >
            {config.cta}
          </Link>
        </div>
      </div>
    </div>
  )
}
