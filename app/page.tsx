import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import PwaNotifButtons from '@/app/components/PwaNotifButtons'

export default async function Home() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  const isSubscribed = user?.user_metadata?.subscribed === true

  if (isSubscribed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="w-full max-w-sm text-center">
          <Image src="/logo.png" alt="CocoHare" width={120} height={36} className="mx-auto mb-2" />
          <p className="text-sm mb-7" style={{ color: '#3F342D99' }}>こころ晴れる毎日を</p>

          {/* ぽとりと話す（メイン） */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <div className="flex justify-center mb-3">
              <Image src="/potori/humming.png" alt="ぽとり" width={72} height={72} className="object-contain" />
            </div>
            <h2 className="text-sm font-medium mb-1.5" style={{ color: '#3F342D' }}>ぽとりと話す</h2>
            <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>
              今日のきもちを話してみましょう。<br />
              ぽとりがそっと寄り添います。
            </p>
            <Link
              href="/counseling/chat"
              className="block w-full py-3 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
              style={{ backgroundColor: '#FAA66B' }}
            >
              話しはじめる
            </Link>
          </div>

          <PwaNotifButtons />

          {/* 診断 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <div className="flex justify-center mb-3">
              <Image src="/potori/good.png" alt="ぽとり" width={72} height={72} className="object-contain" />
            </div>
            <h2 className="text-sm font-medium mb-1.5" style={{ color: '#3F342D' }}>無料性格診断</h2>
            <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>
              20問の質問に答えるだけで、<br />
              あなたの性格タイプとしんどさの傾向がわかります。
            </p>
            <Link
              href="/diagnosis/free"
              className="block w-full py-3 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
              style={{ backgroundColor: '#FAA66B' }}
            >
              性格診断を受ける
            </Link>
          </div>

          <div className="flex gap-3 text-xs" style={{ color: '#3F342D66' }}>
            <Link href="/mypage" className="flex-1 py-2.5 rounded-xl border text-center transition" style={{ borderColor: '#E5DDD8' }}>
              マイページ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="w-full max-w-sm text-center">
        <Image src="/logo.png" alt="CocoHare" width={120} height={36} className="mx-auto mb-2" />
        <p className="text-sm mb-7" style={{ color: '#3F342D99' }}>こころ晴れる毎日を</p>

        {/* 診断 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex justify-center mb-3">
            <Image src="/potori/good.png" alt="ぽとり" width={72} height={72} className="object-contain" />
          </div>
          <h2 className="text-sm font-medium mb-1.5" style={{ color: '#3F342D' }}>無料性格診断</h2>
          <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>
            20問の質問に答えるだけで、<br />
            あなたの性格タイプとしんどさの傾向がわかります。
          </p>
          <Link
            href="/diagnosis/free"
            className="block w-full py-3 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#FAA66B' }}
          >
            無料で診断する
          </Link>
          <p className="text-xs mt-2" style={{ color: '#3F342D66' }}>ログイン不要・約3〜5分</p>
        </div>

        {/* ぽとりと話す */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex justify-center mb-3">
            <Image src="/potori/humming.png" alt="ぽとり" width={72} height={72} className="object-contain" />
          </div>
          <h2 className="text-sm font-medium mb-1.5" style={{ color: '#3F342D' }}>ぽとりと話す</h2>
          <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>
            今日のきもちを話してみましょう。<br />
            ぽとりがそっと寄り添います。
          </p>
          <Link
            href="/counseling/chat"
            className="block w-full py-3 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#FAA66B' }}
          >
            話しはじめる
          </Link>
        </div>

        <PwaNotifButtons />

        <div className="flex gap-3 text-xs" style={{ color: '#3F342D66' }}>
          <Link href="/login" className="flex-1 py-2.5 rounded-xl border text-center transition" style={{ borderColor: '#E5DDD8' }}>
            ログイン
          </Link>
          <Link href="/signup" className="flex-1 py-2.5 rounded-xl border text-center transition" style={{ borderColor: '#E5DDD8' }}>
            会員登録
          </Link>
        </div>
      </div>
    </div>
  )
}
