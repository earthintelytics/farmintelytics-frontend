import { useState } from 'react';
import { useNavigate } from '../utils/portalRouter';
import { Sparkles, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { stepsFor } from '../utils/tutorial';
import { getRole, getUserEmail, estateLabel } from '../utils/access';

const doneKey = () => `fi_ffb_tour_done:${(getUserEmail() || '').toLowerCase()}`;

/** Shown once, the first time a person signs in on this browser. `forceOpen` replays it from the Help page. */
export function WelcomeTour({ forceOpen = false, onClose }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => {
    if (forceOpen) return true;
    try { return !localStorage.getItem(doneKey()); } catch { return false; }   // storage blocked: skip the tour
  });
  const [i, setI] = useState(0);

  if (!open) return null;
  const user = { role: getRole() === 'Edit' ? 'Manager' : getRole(), estate: estateLabel() };
  const steps = stepsFor(user.role);
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;

  const finish = () => {
    try { localStorage.setItem(doneKey(), '1'); } catch { /* ignore */ }
    setOpen(false);
    if (onClose) onClose();
  };
  const goThere = () => { const path = step.go.path; finish(); navigate(path); };
  const lines = step.body(user);

  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome tour" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '20px', padding: '32px', maxWidth: '520px', width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.25)', position: 'relative' }}>
        <button onClick={finish} aria-label="Skip the tour" title="Skip the tour" style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#0f172a', display: 'flex' }}>
          <X size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'transparent', color: '#3F8432', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={24} /></div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Step {i + 1} of {steps.length}</div>
            <h2 style={{ fontSize: '21px', fontWeight: 500, color: '#0F172A', margin: 0 }}>{step.title}</h2>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
          {lines.map((t, n) => <p key={n} style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: '#0f172a', fontWeight: n === 0 ? 700 : 500 }}>{t}</p>)}
        </div>
        {step.go && (
          <button onClick={goThere} style={{ border: 'none', background: 'transparent', color: '#3F8432', fontWeight: 500, fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {step.go.label} <ArrowRight size={15} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }} aria-hidden="true">
            {steps.map((s, n) => <span key={s.key} style={{ width: n === i ? '22px' : '8px', height: '8px', borderRadius: '4px', background: n === i ? '#3F8432' : '#E2E8F0' }} />)}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {i > 0 && (
              <button onClick={() => setI(i - 1)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0f172a', fontWeight: 500, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button onClick={last ? finish : () => setI(i + 1)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3F8432', color: '#FFFFFF', fontWeight: 500, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {last ? 'Finish' : 'Next'} {!last && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
