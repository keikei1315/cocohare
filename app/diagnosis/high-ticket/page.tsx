import { Suspense } from 'react'
import HighTicketClient from './client'

export default function HighTicketPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#FFF9F5' }} />}>
      <HighTicketClient />
    </Suspense>
  )
}
