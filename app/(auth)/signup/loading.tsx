export default function SignupLoading() {
  return (
    <div style={{ backgroundColor: '#FFF9F5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.5}}.sk{animation:shimmer 1.4s ease-in-out infinite}`}</style>
      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="sk" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#EDE5DC', margin: '0 auto 8px' }} />
        <div className="sk" style={{ height: '48px', borderRadius: '12px', backgroundColor: '#EDE5DC' }} />
        <div className="sk" style={{ height: '48px', borderRadius: '12px', backgroundColor: '#EDE5DC' }} />
        <div className="sk" style={{ height: '52px', borderRadius: '14px', backgroundColor: '#FAA66B44' }} />
      </div>
    </div>
  )
}
