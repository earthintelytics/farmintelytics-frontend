// "I'm here: check this spot": at a weak patch or an alert, the person answers two questions, takes a
// photo and saves. The phone's GPS goes with it, so the farm record shows the spot was visited and whether
// the ground agreed with the satellite. Nothing is guessed: no GPS or photo is saved as "none".
import { useEffect, useRef, useState } from 'react';
import { Camera, Check, MapPin, RotateCcw } from 'lucide-react';
import Sheet from './Sheet';
import { createFieldCheck, uploadFieldCheckPhoto } from '../../services/organizationMonitorApi';
import { btnLine, btnPrimary, inputBox, muted } from './ui';

const WEAKER = [['yes', 'Yes'], ['no', 'No, it looks normal'], ['not_sure', 'Not sure']];
const SEEN = [
  ['dry_soil', 'Dry or cracked soil'], ['standing_water', 'Standing water'], ['yellow_leaves', 'Yellow or pale leaves'],
  ['pests_or_disease', 'Pests or disease'], ['weeds', 'Many weeds'], ['damaged_plants', 'Damaged or fallen plants'],
  ['looks_fine', 'Nothing wrong'], ['other', 'Something else'],
];

// A phone photo is several MB; 1600 px on the long side is plenty to see the crop.
async function shrink(file) {
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((ok) => canvas.toBlob((b) => ok(b || file), 'image/jpeg', 0.8));
  } catch {
    return file;
  }
}

function Choice({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={value === id}
          className={`${btnLine} px-3 text-sm ${value === id ? 'border-[var(--brand-primary)] bg-green-50 text-[var(--brand-primary)]' : ''}`}>
          {value === id && <Check size={16} aria-hidden="true" />}{label}
        </button>
      ))}
    </div>
  );
}

export default function FieldCheckSheet({ target, onClose, onSaved }) {
  const [weaker, setWeaker] = useState('');
  const [seen, setSeen] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [where, setWhere] = useState(() => ({ state: typeof navigator !== 'undefined' && navigator.geolocation ? 'finding' : 'none' }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cameraRef = useRef(null);

  // Only the phone's answer changes the state, so the first look-up can start when the panel opens.
  const lookUp = () => navigator.geolocation?.getCurrentPosition(
    (p) => setWhere({ state: 'ok', lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
    () => setWhere({ state: 'none' }),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 },
  );
  useEffect(() => { lookUp(); }, []);
  const locate = () => { if (!navigator.geolocation) return; setWhere({ state: 'finding' }); lookUp(); };
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!weaker || !seen) { setError('Answer both questions first.'); return; }
    setBusy(true);
    setError('');
    try {
      const photoPath = photo ? (await uploadFieldCheckPhoto(await shrink(photo))).photo_path : null;
      const res = await createFieldCheck({
        plot_id: target.plot_id, alert_id: target.alert_id || null, weaker_here: weaker, finding: seen, notes: notes.trim(),
        photo_path: photoPath,
        latitude: where.state === 'ok' ? where.lat : null, longitude: where.state === 'ok' ? where.lon : null,
        accuracy_m: where.state === 'ok' ? Math.round(where.accuracy) : null,
        spot_lat: target.lat ?? null, spot_lon: target.lon ?? null,
      });
      onSaved?.(res);
    } catch {
      setError('Not saved. Check the phone has internet, then press Save again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={`Check ${target.plot_id}${target.where ? `, ${target.where}` : ''}`} onClose={onClose}>
      <div className="space-y-5">
        <p className={`text-sm flex items-center gap-1.5 ${muted}`}>
          <MapPin size={16} aria-hidden="true" />
          {where.state === 'finding' && 'Finding where you are…'}
          {where.state === 'ok' && `Your position is recorded (within ${Math.round(where.accuracy)} m).`}
          {where.state === 'none' && (
            <span>Your position could not be found. <button type="button" onClick={locate} className="underline">Try again</button></span>
          )}
        </p>

        <div className="space-y-2">
          <p className="text-[15px] font-semibold">Does the crop here look weaker than around it?</p>
          <Choice options={WEAKER} value={weaker} onChange={setWeaker} />
        </div>

        <div className="space-y-2">
          <p className="text-[15px] font-semibold">What do you see?</p>
          <Choice options={SEEN} value={seen} onChange={setSeen} />
        </div>

        <div className="space-y-2">
          <p className="text-[15px] font-semibold">Photo of the spot</p>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={pick} className="hidden" />
          {preview ? (
            <div className="space-y-2">
              <img src={preview} alt="The photo you took of this spot" className="w-full max-h-56 object-cover rounded-xl border border-[var(--border-light)]" />
              <button type="button" onClick={() => cameraRef.current?.click()} className={btnLine}><RotateCcw size={18} aria-hidden="true" />Take again</button>
            </div>
          ) : (
            <button type="button" onClick={() => cameraRef.current?.click()} className={`${btnLine} w-full`}><Camera size={18} aria-hidden="true" />Take a photo</button>
          )}
        </div>

        <label className="block space-y-2">
          <span className="text-[15px] font-semibold">Anything else? <span className={`font-normal ${muted}`}>(optional)</span></span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputBox} placeholder="For example: the leaves are yellow at the edges" />
        </label>

        {error && <p className="text-sm text-[var(--status-critical)]" role="alert">{error}</p>}
        <button type="button" onClick={save} disabled={busy} className={`${btnPrimary} w-full`}>{busy ? 'Saving…' : 'Save check'}</button>
      </div>
    </Sheet>
  );
}
