'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ManagePlanButton() {
  const [loading, setLoading] = useState(false)

  const handleCancel = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Link
        href="/subscription"
        className="block w-full py-3 rounded-2xl text-sm font-medium text-center"
        style={{ backgroundColor: '#FFF2E8', color: '#FAA66B' }}
      >
        プランの変更はこちら
      </Link>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="w-full py-3 rounded-2xl text-sm"
        style={{ border: '1px solid #E5DDD8', color: '#3F342D66' }}
      >
        {loading ? '移動中...' : '解約はこちら'}
      </button>
    </div>
  )
}
