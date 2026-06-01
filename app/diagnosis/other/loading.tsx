export default function OtherDiagnosisLoading() {
  return (
    <div style={{ backgroundColor: '#FFF9F5', minHeight: '100vh', padding: '24px 16px' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.5}}.sk{animation:shimmer 1.4s ease-in-out infinite}`}</style>
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="sk" style={{ width: '160px', height: '24px', borderRadius: '8px', backgroundColor: '#EDE5DC', margin: '0 auto' }} />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="sk" style={{ height: '80px', borderRadius: '14px', backgroundColor: '#EDE5DC' }} />
        ))}
      </div>
    </div>
  )
}
