export default function SubscriptionLoading() {
  return (
    <div style={{ backgroundColor: '#FFF9F5', minHeight: '100vh', padding: '24px 16px' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.5}}.sk{animation:shimmer 1.4s ease-in-out infinite}`}</style>
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="sk" style={{ width: '160px', height: '28px', borderRadius: '8px', backgroundColor: '#EDE5DC', margin: '0 auto' }} />
        <div className="sk" style={{ height: '200px', borderRadius: '20px', backgroundColor: '#EDE5DC' }} />
        <div className="sk" style={{ height: '200px', borderRadius: '20px', backgroundColor: '#EDE5DC' }} />
        <div className="sk" style={{ height: '52px', borderRadius: '14px', backgroundColor: '#FAA66B44' }} />
      </div>
    </div>
  )
}
