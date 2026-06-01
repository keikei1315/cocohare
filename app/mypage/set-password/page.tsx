'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function SetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/counseling/chat'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { needs_password: false, password_prompt_dismissed: false },
    })

    if (updateError) {
      setError('設定に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    router.push(returnTo)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-lg font-medium mb-2 text-center" style={{ color: '#3F342D' }}>パスワードを設定する</h1>
        <p className="text-sm text-center mb-6" style={{ color: '#3F342D99' }}>
          次回以降のログインに使用するパスワードを設定してください
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-medium transition"
            style={{ backgroundColor: loading ? '#FAA66B99' : '#FAA66B' }}
          >
            {loading ? '設定中...' : 'パスワードを設定する'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  )
}
