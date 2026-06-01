'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` }
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('rate limit') || msg.includes('email rate')) {
        setError('しばらく時間をおいてから再度お試しください')
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('このメールアドレスはすでに登録されています')
      } else if (msg.includes('invalid email')) {
        setError('メールアドレスの形式が正しくありません')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    // 既存メールの場合、Supabaseはエラーを返さずidentitiesを空にする
    if (data.user && data.user.identities?.length === 0) {
      setError('このメールアドレスはすでに登録されています')
      setLoading(false)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">📩</div>
          <h2 className="text-lg font-medium mb-2" style={{ color: '#3F342D' }}>確認メールを送りました</h2>
          <p className="text-sm leading-relaxed" style={{ color: '#3F342D99' }}>
            {email} に確認メールを送りました。<br />
            メール内のリンクをクリックして登録を完了してください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="CocoHare" width={120} height={36} className="mx-auto mb-2" />
          <p className="text-sm" style={{ color: '#3F342D99' }}>こころ晴れる毎日を</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-lg font-medium mb-6 text-center" style={{ color: '#3F342D' }}>アカウント登録</h1>

          <form onSubmit={handleSignup} className="space-y-4">
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

            <div>
              <label className="block text-sm mb-1" style={{ color: '#3F342D' }}>パスワード（8文字以上）</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{ borderColor: '#E5DDD8', color: '#3F342D' }}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: '#3F342D' }}>パスワード（確認）</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{ borderColor: '#E5DDD8', color: '#3F342D' }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-medium transition"
              style={{ backgroundColor: loading ? '#FAA66B99' : '#FAA66B' }}
            >
              {loading ? '登録中...' : 'アカウントを作成する'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm" style={{ color: '#FAA66B' }}>
              すでにアカウントをお持ちの方はこちら
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
