export default function HomeLoading() {
  return (
    <div style={{ backgroundColor: '#FFF9F5', minHeight: '100vh', padding: '0 16px' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.5}}.sk{animation:shimmer 1.4s ease-in-out infinite}`}</style>
      <div style={{ maxWidth: '480px', margin: '0 auto', paddingTop: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="sk" style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#EDE5DC', margin: '0 auto' }} />
        <div className="sk" style={{ width: '200px', height: '28px', borderRadius: '8px', backgroundColor: '#EDE5DC', margin: '0 auto' }} />
        <div className="sk" style={{ width: '160px', height: '16px', borderRadius: '6px', backgroundColor: '#EDE5DC', margin: '0 auto' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="sk" style={{ height: '100px', borderRadius: '16px', backgroundColor: '#EDE5DC' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
