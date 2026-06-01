'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
      setError('再設定に失敗しました。リンクの有効期限が切れている可能性があります。')
      setLoading(false)
      return
    }

    router.push('/login?reset=success')
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <h1 className="text-lg font-medium mb-2 text-center" style={{ color: '#3F342D' }}>新しいパスワードを設定</h1>
      <p className="text-sm text-center mb-6" style={{ color: '#3F342D99' }}>
        新しいパスワードを入力してください
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: '#3F342D' }}>新しいパスワード（8文字以上）</label>
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
          {loading ? '設定中...' : 'パスワードを再設定する'}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="CocoHare" width={120} height={36} className="mx-auto mb-2" />
          <p className="text-sm" style={{ color: '#3F342D99' }}>こころ晴れる毎日を</p>
        </div>

        <Suspense fallback={<div className="bg-white rounded-2xl shadow-sm p-8" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
