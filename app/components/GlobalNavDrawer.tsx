'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type Props = {
  isOpen: boolean
  onClose: () => void
}

const IC = ({ children }: { children: React.ReactNode }) => (
  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{children}</span>
)

const icons = {
  home: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="#3F342D" strokeWidth="1.5" strokeLinejoin="round" /></svg></IC>,
  chat: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4h12a1 1 0 011 1v7a1 1 0 01-1 1H7l-4 3V5a1 1 0 011-1z" stroke="#3F342D" strokeWidth="1.5" strokeLinejoin="round" /></svg></IC>,
  diagnosis: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="8" r="4" stroke="#3F342D" strokeWidth="1.5" /><path d="M4 17c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" /></svg></IC>,
  diary: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="3" width="12" height="14" rx="2" stroke="#3F342D" strokeWidth="1.5" /><path d="M7 7h6M7 10h6M7 13h4" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" /></svg></IC>,
  mood: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#3F342D" strokeWidth="1.5" /><path d="M7 11c.5 1.5 5.5 1.5 6 0" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" /><circle cx="7.5" cy="8.5" r="0.75" fill="#3F342D" /><circle cx="12.5" cy="8.5" r="0.75" fill="#3F342D" /></svg></IC>,
  report: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke="#3F342D" strokeWidth="1.5" /><path d="M4 14l4-4 3 3 5-6" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></IC>,
  note: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="2" width="9" height="16" rx="1.5" stroke="#3F342D" strokeWidth="1.5" /><path d="M13 5h2a1 1 0 011 1v11a1 1 0 01-1 1H7" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" /><path d="M7 7h4M7 10h4M7 13h2" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" /></svg></IC>,
  mypage: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="#3F342D" strokeWidth="1.5" /><path d="M3.5 17c0-3.038 2.91-5.5 6.5-5.5s6.5 2.462 6.5 5.5" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" /></svg></IC>,
  result: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke="#3F342D" strokeWidth="1.5" /><path d="M7 10l2 2 4-4" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></IC>,
  share: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="15" cy="5" r="2" stroke="#3F342D" strokeWidth="1.5" /><circle cx="5" cy="10" r="2" stroke="#3F342D" strokeWidth="1.5" /><circle cx="15" cy="15" r="2" stroke="#3F342D" strokeWidth="1.5" /><path d="M7 9l6-3M7 11l6 3" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" /></svg></IC>,
  paid: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#3F342D" strokeWidth="1.5" /><path d="M10 6v1.5M10 12.5V14M7.5 8.5a2.5 2 0 015 0c0 1.5-2.5 2-2.5 3.5" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" /></svg></IC>,
  login: <IC><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 4H5a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" /><path d="M13 7l3 3-3 3M16 10H8" stroke="#3F342D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></IC>,
}

export default function GlobalNavDrawer({ isOpen, onClose }: Props) {
  const router = useRouter()
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [hasHighTicket, setHasHighTicket] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('cocohare_last_diagnosis_id')
      || document.cookie.match(/cocohare_last_diagnosis_id=([^;]+)/)?.[1]
      || null
    setDiagnosisId(id)
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) return
      setIsLoggedIn(true)
      const meta = user.user_metadata
      const isSubscribed = meta?.subscribed === true
      const userPlan = (meta?.plan as string) ?? null
      setSubscribed(isSubscribed)
      setPlan(userPlan)
      if (isSubscribed) {
        const { data: htDiag } = await supabase
          .from('diagnoses')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'high_ticket')
          .limit(1)
          .maybeSingle()
        setHasHighTicket(!!htDiag)
      }
    })
  }, [])

  const go = (href: string) => { router.push(href); onClose() }

  const itemStyle: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 20px', fontSize: '15px', fontWeight: 500,
    color: '#3F342D', textAlign: 'left', borderBottom: '1px solid #F5F0EC',
    cursor: 'pointer',
  }

  if (!isOpen) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(63,52,45,0.3)', zIndex: 60 }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '72%', maxWidth: '300px',
        backgroundColor: '#FFF9F5', zIndex: 70,
        display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid #F0EAE5',
        boxShadow: '-4px 0 20px rgba(63,52,45,0.12)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 16px 16px', borderBottom: '1px solid #F0EAE5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image src="/potori/humming.webp" alt="" width={28} height={28} className="object-contain" />
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#3F342D' }}>CocoHare</span>
          </div>
          <button onClick={onClose} style={{ padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="#3F342D99" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <button style={itemStyle} onClick={() => go('/')}>{icons.home}ホーム</button>
          <button style={itemStyle} onClick={() => go('/diagnosis/free')}>{icons.diagnosis}無料診断を受ける</button>

          {isLoggedIn && (
            <>
              {subscribed && (
                <button style={itemStyle} onClick={() => go('/counseling/chat')}>{icons.chat}ぽとりと話す</button>
              )}
              {(plan === 'take' || plan === 'matsu') && (
                <>
                  <button style={itemStyle} onClick={() => go('/counseling/diary')}>{icons.diary}ぽとりの日記</button>
                  <button style={itemStyle} onClick={() => go('/counseling/mood-check')}>{icons.mood}気分チェック</button>
                  <button style={itemStyle} onClick={() => go('/counseling/diary/reports')}>{icons.report}週間レポート</button>
                </>
              )}
              {(plan === 'matsu' || hasHighTicket) && (
                <button style={itemStyle} onClick={() => go('/counseling/jibunn-note')}>{icons.note}じぶんノート</button>
              )}
              <button style={itemStyle} onClick={() => go('/mypage')}>{icons.mypage}マイページ</button>
            </>
          )}

          {diagnosisId && (
            <>
              <button style={itemStyle} onClick={() => go(`/diagnosis/free/result/${diagnosisId}`)}>{icons.result}診断結果を見る</button>
              <button style={itemStyle} onClick={() => go(`/diagnosis/other?diagnosisId=${diagnosisId}`)}>{icons.share}他者診断を依頼する</button>
              <button style={itemStyle} onClick={() => go(`/diagnosis/paid?diagnosisId=${diagnosisId}`)}>{icons.paid}詳細レポート（¥1,480）</button>
            </>
          )}

          {!isLoggedIn && (
            <button style={{ ...itemStyle, color: '#3F342D66' }} onClick={() => go('/login')}>{icons.login}ログイン</button>
          )}
        </div>

        {/* Subscription CTA */}
        {isLoggedIn && !subscribed && (
          <div style={{ padding: '16px', borderTop: '1px solid #F0EAE5' }}>
            <button
              onClick={() => go('/subscription')}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #FAA66B 0%, #F07B3A 100%)',
                fontSize: '14px', fontWeight: 700, color: '#fff',
              }}
            >
              サブスクに登録する
            </button>
          </div>
        )}
        {isLoggedIn && subscribed && (
          <div style={{ padding: '16px', borderTop: '1px solid #F0EAE5' }}>
            <button
              onClick={() => go('/subscription')}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: plan === 'matsu'
                  ? 'linear-gradient(135deg, #F0EAE5 0%, #E5DDD6 100%)'
                  : 'linear-gradient(135deg, #C8B8A8 0%, #A89880 100%)',
                fontSize: '14px', fontWeight: 700,
                color: plan === 'matsu' ? '#3F342D' : '#fff',
              }}
            >
              {plan === 'matsu' ? 'プランを確認する' : 'プランをアップグレード'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
