import { AlertTriangle, CheckCircle, Info, XCircle, X, Terminal } from 'lucide-react';

export function ToastContainer({ toasts, removeToast, onViewLogs }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '420px',
      width: '90%'
    }}>
      {toasts.map((toast) => {
        let bg = '#0F172A';
        let border = '#334155';
        let icon = <Info size={20} color="#38BDF8" />;

        if (toast.type === 'error') {
          bg = '#7F1D1D';
          border = '#F87171';
          icon = <XCircle size={20} color="#FCA5A5" />;
        } else if (toast.type === 'success') {
          bg = '#064E3B';
          border = '#34D399';
          icon = <CheckCircle size={20} color="#6EE7B7" />;
        } else if (toast.type === 'warning') {
          bg = '#78350F';
          border = '#FBBF24';
          icon = <AlertTriangle size={20} color="#FDE68A" />;
        }

        return (
          <div
            key={toast.id}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              color: '#FFFFFF',
              padding: '14px 18px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              animation: 'fadeInSlide 0.3s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 500, lineHeight: 1.4, flexWrap: 'wrap' }}>
              {icon}
              <span style={{ flex: '1 1 200px' }}>{toast.message}</span>
              {toast.type === 'error' && onViewLogs && (
                <button
                  onClick={() => { removeToast(toast.id); onViewLogs(); }}
                  style={{
                    background: '#FFFFFF',
                    color: '#7F1D1D',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Terminal size={14} /> View logs
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ConfirmModal({ isOpen, title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '28px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        border: '1px solid #E2E8F0',
        animation: 'popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            background: 'transparent',
            padding: '10px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={24} color={isDanger ? '#DC2626' : '#4F46E5'} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#0F172A', margin: 0 }}>
            {title || 'Confirmation Required'}
          </h3>
        </div>

        <p style={{ fontSize: '14px', color: '#0f172a', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0f172a',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              background: isDanger ? '#DC2626' : '#3F8432',
              color: '#FFFFFF',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Result of an action (saved / could not save), as a dialog the person closes with OK. */
export function NoticeModal({ isOpen, title, message, type = 'success', onClose }) {
  if (!isOpen) return null;
  const ok = type === 'success';
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', margin: '0 auto 14px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
          {ok ? <CheckCircle size={30} color="#3F8432" /> : <XCircle size={30} color="#DC2626" />}
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#0F172A', margin: '0 0 8px 0' }}>{title}</h3>
        <p style={{ fontSize: '14px', color: '#0f172a', lineHeight: 1.6, margin: '0 0 22px 0' }}>{message}</p>
        <button
          onClick={onClose}
          autoFocus
          style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', background: ok ? '#3F8432' : '#DC2626', color: '#FFFFFF', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
