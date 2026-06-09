import Image from 'next/image'
import Link from 'next/link'

export default function OtherDiagnosisDonePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <Image src="/potori/good.webp" alt="ぽとり" width={110} height={110} className="object-contain" />
        </div>

        <h1 className="text-xl font-bold mb-3" style={{ color: '#3F342D' }}>
          送信されました！
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: '#3F342D99' }}>
          ありがとうございます。<br />
          あなたの回答が相手のレポートに届きます。
        </p>

        <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: '#FFF2E8' }}>
          <p className="text-sm font-medium mb-1" style={{ color: '#3F342D' }}>
            自分の性格も気になりますか？
          </p>
          <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>
            無料診断で、あなたのタイプを調べてみましょう。約3〜5分で完了します。
          </p>
          <Link
            href="/"
            className="block w-full py-3 rounded-xl text-white text-sm font-medium text-center"
            style={{ backgroundColor: '#FAA66B' }}
          >
            自分も無料で診断する
          </Link>
        </div>
      </div>
    </div>
  )
}
