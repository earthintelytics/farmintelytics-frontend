
export function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      width: '100%',
      gap: '16px',
      color: 'var(--color-text-secondary, #64748b)'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '2.5px solid #E2E8F0',
        borderTop: '2.5px solid #3F8432',
        borderRadius: '50%',
        animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
      }} />
      <span style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.01em' }}>
        Loading FarmIntelytics Portal...
      </span>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
