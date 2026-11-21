import { useState } from 'react';
import { Link } from '../utils/portalRouter';
import { HelpCircle, PlayCircle, ChevronRight } from 'lucide-react';
import { GUIDES } from '../utils/tutorial';
import { WelcomeTour } from '../components/WelcomeTour';
import { getRole, estateLabel, isManager } from '../utils/access';

export function HelpView() {
  const [tour, setTour] = useState(false);
  const manager = isManager();
  const guides = GUIDES.filter(g => g.who === 'all' || manager);

  return (
    <div className="view-container view-fade-in" style={{ padding: '32px', maxWidth: '980px' }}>
      <h1 className="view-title" style={{ fontSize: '26px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <HelpCircle size={28} style={{ color: '#034321' }} /> Help
      </h1>
      <p className="view-subtitle" style={{ marginTop: '6px' }}>
        You are signed in as {getRole() === 'Edit' ? 'Manager' : getRole()}, working on {estateLabel()}.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', background: '#E8F2E5', borderRadius: '16px', padding: '20px 24px', margin: '24px 0 32px' }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>Take the tour again</div>
          <div style={{ fontSize: '14px', color: '#0f172a', marginTop: '2px' }}>A one-minute walk through the portal.</div>
        </div>
        <button onClick={() => setTour(true)} className="btn btn--primary" style={{ height: '42px', fontWeight: 800, borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0 20px' }}>
          <PlayCircle size={17} /> Start the tour
        </button>
      </div>

      <h2 style={{ fontSize: '19px', fontWeight: 900, margin: '0 0 16px' }}>Step-by-step guides</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px', marginBottom: '36px' }}>
        {guides.map(g => (
          <div key={g.key} style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '22px', background: '#FFFFFF' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 12px', color: '#0F172A' }}>{g.title}</h3>
            <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#0f172a', fontSize: '14px', lineHeight: 1.55 }}>
              {g.steps.map((s, n) => <li key={n}>{s}</li>)}
            </ol>
          </div>
        ))}
      </div>

      <Link to="/help/common-questions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', textDecoration: 'none', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px 24px', background: '#FFFFFF', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A' }}>Common Questions</div>
          <div style={{ fontSize: '14px', color: '#0f172a', marginTop: '2px' }}>Short answers to what people ask most, with search.</div>
        </div>
        <ChevronRight size={20} color="#034321" />
      </Link>

      {tour && <WelcomeTour forceOpen onClose={() => setTour(false)} />}
    </div>
  );
}
