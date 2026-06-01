export default function MypageLoading() {
  return (
    <div style={{ backgroundColor: '#FFF9F5', minHeight: '100vh', padding: '24px 16px' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.5}}.sk{animation:shimmer 1.4s ease-in-out infinite}`}</style>
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <div className="sk" style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#EDE5DC', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <div className="sk" style={{ width: '120px', height: '18px', borderRadius: '6px', backgroundColor: '#EDE5DC' }} />
            <div className="sk" style={{ width: '160px', height: '14px', borderRadius: '6px', backgroundColor: '#EDE5DC' }} />
          </div>
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="sk" style={{ height: '56px', borderRadius: '14px', backgroundColor: '#EDE5DC' }} />
        ))}
      </div>
    </div>
  )
}
