import { useState } from 'react';
import { boundaryServiceOptions } from './serviceOptions';
import { updateFarm } from '../../../services/adminApi';
import { Button, Chip, Field, Modal } from '../../components/ui';

import { MODAL_HELP } from '../../../components/page/modalHelpText';
/**
 * Which services an estate's boundary is for. None chosen = every service of
 * the organisation. A rice-only boundary then appears only in rice monitoring.
 */
export const ServicesPicker = ({ org, value = [], onChange, disabled = false }) => {
  const options = boundaryServiceOptions(org);
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <Field label="Which services is this boundary for?" hint={value.length ? `${value.length} chosen. It appears only in these.` : 'None chosen: it appears in every service of the organisation.'}>
      <div className="flex flex-wrap gap-2">
        <Chip on={!value.length} onClick={() => !disabled && onChange([])}>All services</Chip>
        {options.map((o) => <Chip key={o.id} on={value.includes(o.id)} onClick={() => !disabled && toggle(o.id)}>{o.label}</Chip>)}
      </div>
    </Field>
  );
};

/** Change the services of an existing estate, and the radar orbit track its monitoring uses. */
const BoundaryServicesModal = ({ org, farm, onClose, onSaved }) => {
  const [services, setServices] = useState(farm.services || []);
  const [track, setTrack] = useState(farm.sar_relative_orbit ? String(farm.sar_relative_orbit) : '');
  // Services need a monitoring start date; ask for it here when the estate has none yet.
  const [start, setStart] = useState(farm.start_date || '');
  const needsStart = !farm.start_date;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true); setError('');
    if (needsStart && !start) { setError('Choose the monitoring start date: satellite results are kept from that date.'); setBusy(false); return; }
    const n = track.trim() === '' ? 0 : Number(track);
    if (!Number.isInteger(n) || n < 0 || n > 175) { setError('The radar orbit track is a whole number from 1 to 175, or empty.'); setBusy(false); return; }
    try { const updated = await updateFarm(farm.farm_id, { services, sar_relative_orbit: n, ...(needsStart ? { start_date: start } : {}) }); onSaved(updated || { ...farm, services, sar_relative_orbit: n || null }); } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <Modal help={MODAL_HELP.boundaryServices} title={`${farm.farm_name}: services`} text="Choose where this estate's boundary is used." onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      {error && <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
      <ServicesPicker org={org} value={services} onChange={setServices} disabled={busy} />
      {needsStart && (
        <Field label={<>Monitoring start date <span className="text-red-600">*</span></>} hint="Satellite results are kept from this date. Pictures start on 23 June 2015.">
          <input type="date" min="2015-06-23" max={new Date().toISOString().slice(0, 10)} value={start} onChange={(e) => setStart(e.target.value)} disabled={busy}
            className="w-48 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600" />
        </Field>
      )}
      <Field label="Radar orbit track (optional)"
        hint="Sentinel-1 passes from one track only, so radar readings stay comparable. Leave empty and the pipeline picks the track that covers this estate best.">
        <input type="number" min="1" max="175" inputMode="numeric" value={track} onChange={(e) => setTrack(e.target.value)} disabled={busy}
          placeholder="Automatic" className="w-40 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600" />
      </Field>
    </Modal>
  );
};

export default BoundaryServicesModal;
