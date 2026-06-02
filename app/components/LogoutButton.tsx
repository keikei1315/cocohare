'use client'

import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
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
