export default function ChatLoading() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      backgroundColor: '#F7F2ED',
    }}>
      {/* Header */}
      <div style={{
        height: '52px', backgroundColor: '#fff',
        borderBottom: '1px solid #EDE5DC', flexShrink: 0,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px',
      }}>
        <div style={{ width: '60px', height: '28px', borderRadius: '20px', backgroundColor: '#EDE5DC' }} className="skeleton" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '60px', height: '14px', borderRadius: '6px', backgroundColor: '#EDE5DC' }} className="skeleton" />
          <div style={{ width: '100px', height: '10px', borderRadius: '6px', backgroundColor: '#EDE5DC' }} className="skeleton" />
        </div>
        <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#EDE5DC' }} className="skeleton" />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#EDE5DC', flexShrink: 0 }} className="skeleton" />
          <div style={{ width: '200px', height: '64px', borderRadius: '4px 16px 16px 16px', backgroundColor: '#fff' }} className="skeleton" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '140px', height: '40px', borderRadius: '16px 4px 16px 16px', backgroundColor: '#FAA66B44' }} className="skeleton" />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#EDE5DC', flexShrink: 0 }} className="skeleton" />
          <div style={{ width: '160px', height: '48px', borderRadius: '4px 16px 16px 16px', backgroundColor: '#fff' }} className="skeleton" />
        </div>
      </div>

      {/* Input area */}
      <div style={{ backgroundColor: '#fff', flexShrink: 0, borderTop: '1px solid #EDE5DC', padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ flex: 1, height: '44px', borderRadius: '22px', backgroundColor: '#F5EEE9' }} className="skeleton" />
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#EDE5DC' }} className="skeleton" />
        </div>
      </div>

      <style>{`
        .skeleton {
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
