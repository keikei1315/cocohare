export default function MonthlyReportLoading() {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#FFF9F5', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.5}}.sk{animation:shimmer 1.4s ease-in-out infinite}`}</style>
      <div style={{ height: '52px', backgroundColor: '#fff', borderBottom: '1px solid #EDE5DC', flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px' }}>
        <div className="sk" style={{ width: '60px', height: '28px', borderRadius: '20px', backgroundColor: '#EDE5DC' }} />
        <div className="sk" style={{ width: '120px', height: '16px', borderRadius: '6px', backgroundColor: '#EDE5DC', margin: '0 auto' }} />
      </div>
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
        <div className="sk" style={{ height: '80px', borderRadius: '14px', backgroundColor: '#EDE5DC' }} />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="sk" style={{ height: '100px', borderRadius: '14px', backgroundColor: '#EDE5DC' }} />
        ))}
      </div>
    </div>
  )
}
