'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordBanner() {
  const [show, setShow] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const shouldShow = (user: { user_metadata?: Record<string, unknown> } | null) =>
      !!user &&
      user.user_metadata?.needs_password === true &&
      user.user_metadata?.password_prompt_dismissed !== true

    // 初回チェック（ページロード時にすでにログイン済みの場合）
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (shouldShow(user)) setShow(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (shouldShow(session?.user ?? null)) setShow(true)
      }
      if (event === 'USER_UPDATED') {
        if (!shouldShow(session?.user ?? null)) setShow(false)
      }
      if (event === 'SIGNED_OUT') {
        setShow(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleDismiss = async () => {
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { password_prompt_dismissed: true } })
    setShow(false)
    setShowConfirm(false)
  }

  if (!show) return null

  return (
    <>
      <div style={{
        position: 'fixed', bottom: '80px', right: '16px', zIndex: 50,
        display: 'flex', alignItems: 'center', gap: '8px',
        backgroundColor: '#fff', border: '1px solid #EDE5DC',
        borderRadius: '12px', padding: '10px 12px',
        boxShadow: '0 2px 12px rgba(63,52,45,0.12)', maxWidth: '220px',
      }}>
        <button onClick={() => router.push(`/mypage/set-password?returnTo=${encodeURIComponent(window.location.pathname)}`)} style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#FAA66B', marginBottom: '2px' }}>
            パスワードを設定する
          </div>
          <div style={{ fontSize: '10px', color: '#3F342D99', lineHeight: 1.4 }}>
            次回のログインに必要です
          </div>
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          style={{
            flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%',
            backgroundColor: '#EDE5DC', color: '#3F342D', fontSize: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
            width: '100%', maxWidth: '300px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '14px', color: '#3F342D', marginBottom: '8px', fontWeight: 600 }}>
              今後表示しませんか？
            </p>
            <p style={{ fontSize: '12px', color: '#3F342D88', marginBottom: '20px', lineHeight: 1.6 }}>
              パスワード未設定の場合、次回のログインにはメールリンクが必要です
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  fontSize: '13px', color: '#3F342D',
                  border: '1px solid #EDE5DC', backgroundColor: '#fff',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  fontSize: '13px', color: '#fff', backgroundColor: '#FAA66B',
                }}
              >
                表示しない
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
