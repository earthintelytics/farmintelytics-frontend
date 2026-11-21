import React from 'react';

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
        width: '44px',
        height: '44px',
        border: '3px solid rgba(3, 67, 33, 0.15)',
        borderTop: '3px solid #034321',
        borderRadius: '50%',
        animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
      }} />
      <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em' }}>
        Loading Earthintelytics Portal...
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
