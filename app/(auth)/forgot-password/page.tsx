'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'

function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError('送信に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-2xl mb-4">📧</p>
        <h2 className="text-base font-medium mb-2" style={{ color: '#3F342D' }}>メールを送信しました</h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: '#3F342D99' }}>
          {email} にパスワード再設定用のリンクを送りました。<br />
          メールをご確認ください。
        </p>
        <Link href="/login" className="text-sm" style={{ color: '#FAA66B' }}>
          ログインページに戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <h1 className="text-lg font-medium mb-2 text-center" style={{ color: '#3F342D' }}>パスワードをお忘れですか？</h1>
      <p className="text-sm text-center mb-4" style={{ color: '#3F342D99' }}>
        登録済みのメールアドレスを入力してください。<br />
        パスワード再設定用のリンクをお送りします。
      </p>

      <div className="rounded-xl px-4 py-3 mb-6 text-xs leading-relaxed" style={{ backgroundColor: '#FFF3E8', color: '#3F342DAA' }}>
        有料診断・AIカウンセリングサービスを会員登録前にご購入された方は、決済時に入力されたメールアドレスをご入力ください。<br />
        またはログイン後、画面右上の「お知らせ」よりパスワードの設定が可能です。
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: '#3F342D' }}>メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
            style={{ borderColor: '#E5DDD8', color: '#3F342D' }}
            placeholder="example@email.com"
          />
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-white text-sm font-medium transition"
          style={{ backgroundColor: loading ? '#FAA66B99' : '#FAA66B' }}
        >
          {loading ? '送信中...' : '再設定メールを送る'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm" style={{ color: '#3F342D66' }}>
          ログインに戻る
        </Link>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="CocoHare" width={120} height={36} className="mx-auto mb-2" />
          <p className="text-sm" style={{ color: '#3F342D99' }}>こころ晴れる毎日を</p>
        </div>

        <Suspense fallback={<div className="bg-white rounded-2xl shadow-sm p-8" />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
