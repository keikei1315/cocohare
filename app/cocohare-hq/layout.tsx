import AdminNav from './components/AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F0EC' }}>
      <aside style={{
        width: '200px', position: 'fixed', top: 0, left: 0, bottom: 0,
        backgroundColor: '#3F342D', zIndex: 20, overflowY: 'auto',
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ margin: 0, color: '#FAA66B', fontWeight: 700, fontSize: '13px' }}>CocoHare Admin</p>
        </div>
        <AdminNav />
      </aside>
      <main style={{ marginLeft: '200px', padding: '32px', flex: 1 }}>
        {children}
      </main>
    </div>
  )
}
