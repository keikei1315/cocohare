'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const resetSuccess = searchParams.get('reset') === 'success'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <h1 className="text-lg font-medium mb-6 text-center" style={{ color: '#3F342D' }}>ログイン</h1>

      <form onSubmit={handleLogin} className="space-y-4">
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
          <label className="block text-sm mb-1" style={{ color: '#3F342D' }}>パスワード</label>
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

        {resetSuccess && (
          <p className="text-sm text-center" style={{ color: '#F07B3A' }}>
            パスワードを再設定しました。新しいパスワードでログインしてください。
          </p>
        )}
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-white text-sm font-medium transition"
          style={{ backgroundColor: loading ? '#FAA66B99' : '#FAA66B' }}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/forgot-password" className="text-sm" style={{ color: '#3F342D88' }}>
          パスワードを忘れた方
        </Link>
      </div>

      <div className="mt-3 rounded-xl px-4 py-3 text-xs leading-relaxed" style={{ backgroundColor: '#FFF3E8', color: '#3F342DAA' }}>
        有料診断・AIカウンセリングサービスを会員登録前にご購入された方は、決済時に入力されたメールアドレスをご入力ください。<br />
        またはログイン後、画面右上の「お知らせ」よりパスワードの設定が可能です。
      </div>

      <div className="mt-4 text-center">
        <Link href="/signup" className="text-sm" style={{ color: '#FAA66B' }}>
          アカウントをお持ちでない方はこちら
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="CocoHare" width={120} height={36} className="mx-auto mb-2" />
          <p className="text-sm" style={{ color: '#3F342D99' }}>こころ晴れる毎日を</p>
        </div>

        <Suspense fallback={<div className="bg-white rounded-2xl shadow-sm p-8" />}>
          <LoginForm />
        </Suspense>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm" style={{ color: '#3F342D66' }}>
            トップに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
