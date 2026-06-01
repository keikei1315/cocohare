import { createClient } from '@/lib/supabase/server'
import CounselingNav from './nav'

export default async function CounselingLayout({ children }: { children: React.ReactNode }) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#FFF9F5' }}>
      <div className="flex-1 pb-16">
        {children}
      </div>
      {user && <CounselingNav />}
    </div>
  )
}
