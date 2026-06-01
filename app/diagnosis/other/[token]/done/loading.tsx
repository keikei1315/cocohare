export default function OtherDoneLoading() {
  return (
    <div style={{ backgroundColor: '#FFF9F5', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.5}}.sk{animation:shimmer 1.4s ease-in-out infinite}`}</style>
      <div className="sk" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#EDE5DC' }} />
      <div className="sk" style={{ width: '160px', height: '24px', borderRadius: '8px', backgroundColor: '#EDE5DC' }} />
      <div className="sk" style={{ width: '220px', height: '16px', borderRadius: '6px', backgroundColor: '#EDE5DC' }} />
    </div>
  )
}
