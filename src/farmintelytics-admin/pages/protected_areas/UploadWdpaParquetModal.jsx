import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Database, Upload } from 'lucide-react';
import { Button, Field, Modal, Note } from '../../components/ui';
import { completeWdpaUpload, fetchWdpaReleases, startWdpaUpload, uploadWdpaPart } from '../../../services/adminApi';
import { useLoader } from '../../../components/page/useLoader';

/**
 * Upload the WDPA as a GeoParquet (owner, 24 Nov 2026): the file is sent in parts (32 MB each, retried on a dropped
 * connection), joined in storage, then the pipeline cuts it into 1-degree tiles that checks read only around a plot
 * (monitoring/services/wdpa_upload.py, pipeline wdpa_tiles.py). Nothing large passes through memory or the database.
 */
const HELP = {
  intro: 'Loads the World Database on Protected Areas from its GeoParquet download. Large files are fine: the file is sent in parts and processed by the pipeline.',
  items: [
    ['File', 'The WDPA polygons as GeoParquet (.parquet), from Protected Planet. Points are not used.'],
    ['Version', 'The release, as on the download (for example Nov2026). Shown with every check that used it.'],
    ['Countries', 'ISO3 codes to keep, separated by commas (NGA for Nigeria). Empty keeps the whole world (bigger, slower).'],
    ['Simplify to', 'Outlines simplified to about this many metres to keep checks fast; 10 m is far finer than the 30 m forest maps. 0 keeps them as published.'],
    ['What is kept', 'Areas whose status is not Proposed or Not Reported, and not purely marine.'],
  ],
};

const mb = (b) => `${(b / 1048576).toLocaleString(undefined, { maximumFractionDigits: 0 })} MB`;

export default function UploadWdpaParquetModal({ open, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState('');
  const [countries, setCountries] = useState('NGA');
  const [simplify, setSimplify] = useState('10');
  const [stage, setStage] = useState('idle');           // idle, uploading, joining, processing, done
  const [sent, setSent] = useState(0);
  const [job, setJob] = useState(null);
  const [live, setLive] = useState(null);                // the releases while following a job
  const [error, setError] = useState('');
  const cancelled = useRef(false);

  const load = useCallback(() => (open ? fetchWdpaReleases() : Promise.resolve(null)), [open]);
  const loader = useLoader(load);
  const releases = live || loader.data;
  useEffect(() => { cancelled.current = !open; return () => { cancelled.current = true; }; }, [open]);

  // While the pipeline builds the tiles: follow its job.
  useEffect(() => {
    if (stage !== 'processing' || !job) return undefined;
    const t = setInterval(async () => {
      try {
        const r = await fetchWdpaReleases();
        setLive(r);
        const mine = (r.items || []).find((i) => i.job_id === job);
        if (mine && ['done', 'completed'].includes(mine.status)) { setStage('done'); onDone?.(); }
        if (mine && mine.status === 'failed') { setStage('idle'); setError(mine.error || 'The pipeline could not read the file.'); }
      } catch { /* try again next tick */ }
    }, 5000);
    return () => clearInterval(t);
  }, [stage, job, onDone]);

  const upload = async () => {
    if (!file) return setError('Choose the WDPA GeoParquet file.');
    setError(''); setSent(0); setStage('uploading');
    try {
      const s = await startWdpaUpload({ filename: file.name, size: file.size, version: version || file.name.replace(/\.(geo)?parquet$/i, ''),
        countries: countries.split(',').map((c) => c.trim()).filter(Boolean), simplify_m: Number(simplify) || 0 });
      for (let n = 1; n <= s.parts; n += 1) {
        if (cancelled.current) return;
        const blob = file.slice((n - 1) * s.part_bytes, Math.min(n * s.part_bytes, file.size));
        let tries = 0;
        for (;;) {
          try { await uploadWdpaPart(s.id, n, blob); break; } catch (e) { tries += 1; if (tries >= 3) throw e; }
        }
        setSent(Math.min(file.size, n * s.part_bytes));
      }
      setStage('joining');
      const done = await completeWdpaUpload(s.id);
      setJob(done.job_id); setStage('processing');
      loader.reload();
    } catch (e) {
      setStage('idle'); setError(e.message || 'The upload did not finish.');
    }
  };

  if (!open) return null;
  const busy = ['uploading', 'joining', 'processing'].includes(stage);
  const pct = file ? Math.round((sent / file.size) * 100) : 0;
  const mine = job && (releases?.items || []).find((i) => i.job_id === job);
  const cur = releases?.current;
  return (
    <Modal help={HELP} size="lg" title="Upload the WDPA (GeoParquet)" onClose={busy ? undefined : onClose}
      text="The World Database on Protected Areas, sent in parts and cut into tiles by the pipeline."
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy && stage !== 'processing'}>{stage === 'processing' ? 'Close (it carries on)' : 'Close'}</Button>
        {stage !== 'done' && <Button onClick={upload} disabled={busy || !file}><Upload size={15} />{busy ? 'Working…' : 'Upload and process'}</Button>}
      </>}>
      {error && <Note tone="error">{error}</Note>}
      <div className="rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3">
        <Database size={18} className="mt-0.5 text-[var(--brand-primary)]" />
        <div className="text-sm text-gray-700">
          {cur ? <>In use: <strong>{cur.version}</strong> · {Number(cur.areas || 0).toLocaleString()} areas in {Number(cur.tiles || 0).toLocaleString()} tiles · {Array.isArray(cur.countries) ? cur.countries.join(', ') : 'whole world'} · built {String(cur.built_at || '').slice(0, 10)}</>
            : 'No WDPA GeoParquet is loaded yet: checks use only the protected areas the team added.'}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="WDPA GeoParquet file" help="The polygons file from Protected Planet, as .parquet. Any size." className="sm:col-span-2">
          <input type="file" accept=".parquet,.geoparquet" disabled={busy} onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-800 hover:file:bg-green-100" />
        </Field>
        <Field label="Version" help="As on the download, for example Nov2026. Empty: the file name.">
          <input className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" value={version} disabled={busy} onChange={(e) => setVersion(e.target.value)} placeholder="Nov2026" />
        </Field>
        <Field label="Countries (ISO3)" help="Comma separated, for example NGA, GHA, CIV. Empty: the whole world.">
          <input className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" value={countries} disabled={busy} onChange={(e) => setCountries(e.target.value)} />
        </Field>
        <Field label="Simplify outlines to (m)" help="About 10 m keeps checks fast and stays far finer than the 30 m forest maps. 0: as published.">
          <input type="number" min="0" max="200" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" value={simplify} disabled={busy} onChange={(e) => setSimplify(e.target.value)} />
        </Field>
      </div>

      {stage !== 'idle' && file && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="font-semibold text-gray-800">
            {stage === 'uploading' ? `Sending ${mb(sent)} of ${mb(file.size)}` : stage === 'joining' ? 'Joining the parts' : stage === 'processing' ? (mine?.step || 'The pipeline is cutting it into tiles') : 'Done'}
          </span><span className="font-mono text-gray-600">{stage === 'uploading' ? `${pct}%` : stage === 'processing' ? `${mine?.progress ?? 0}%` : ''}</span></div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-[var(--brand-primary)] transition-all" style={{ width: `${stage === 'uploading' ? pct : stage === 'processing' ? (mine?.progress ?? 5) : 100}%` }} />
          </div>
          {stage === 'done' && <p className="flex items-center gap-2 text-sm text-green-800"><CheckCircle2 size={16} />Loaded. Every check from now on uses this version.</p>}
          {stage === 'processing' && <p className="text-xs text-gray-500">You can close this window: the pipeline carries on, and the version switches over when it is ready.</p>}
        </div>
      )}
    </Modal>
  );
}
