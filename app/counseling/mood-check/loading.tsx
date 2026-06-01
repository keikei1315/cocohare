export default function MoodCheckLoading() {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#FFF9F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '24px' }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.5}}.sk{animation:shimmer 1.4s ease-in-out infinite}`}</style>
      <div className="sk" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#EDE5DC' }} />
      <div className="sk" style={{ width: '200px', height: '20px', borderRadius: '6px', backgroundColor: '#EDE5DC' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', maxWidth: '300px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="sk" style={{ height: '60px', borderRadius: '12px', backgroundColor: '#EDE5DC' }} />
        ))}
      </div>
    </div>
  )
}
