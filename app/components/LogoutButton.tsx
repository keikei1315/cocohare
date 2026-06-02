'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full py-3 rounded-2xl text-sm"
      style={{ border: '1px solid #E5DDD8', color: '#3F342D66' }}
    >
      ログアウト
    </button>
  )
}
