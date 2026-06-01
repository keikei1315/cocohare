export default function SuccessLoading() {
  return (
    <div style={{ backgroundColor: '#FFF9F5', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.5}}.sk{animation:shimmer 1.4s ease-in-out infinite}`}</style>
      <div className="sk" style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#EDE5DC' }} />
      <div className="sk" style={{ width: '140px', height: '28px', borderRadius: '8px', backgroundColor: '#EDE5DC' }} />
      <div className="sk" style={{ width: '200px', height: '16px', borderRadius: '6px', backgroundColor: '#EDE5DC' }} />
      <div className="sk" style={{ width: '100%', maxWidth: '320px', height: '52px', borderRadius: '14px', backgroundColor: '#FAA66B44', marginTop: '8px' }} />
    </div>
  )
}
