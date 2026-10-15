import { useEffect, useState } from 'react';
import { X, Upload, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { checkProtectedAreaBoundary, saveProtectedAreaBoundary } from '../../../services/adminApi';
import { getCssToken } from '../../../utils/tokens';

const IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const EMPTY = { name: '', name_column: '', designation: '', iucn_category: '', status: 'Designated', country: '', source_name: '', source_url: '', source_date: '', source_reference: '', source_licence: '', notes: '' };
const input = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-green-600';
const ICON = { ok: <CheckCircle2 size={16} className="text-green-600" />, warn: <AlertTriangle size={16} className="text-amber-600" />, fail: <XCircle size={16} className="text-red-600" /> };

function Fit({ data }) {
  const map = useMap();
  useEffect(() => {
    try { const b = L.geoJSON(data).getBounds(); if (b.isValid()) map.fitBounds(b, { padding: [16, 16] }); } catch { /* preview only */ }
  }, [data, map]);
  return null;
}

const Field = ({ label, hint, children, required }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-800 mb-1">{label}{required && <span className="text-red-600"> *</span>}</span>
    {children}
    {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
  </label>
);

/**
 * Add a protected area from a boundary file we found (GeoJSON, KML or zipped shapefile), or replace
 * an area's boundary and details. The file is checked first; who published it is required (T66).
 */
export default function UploadBoundaryModal({ open, area, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    setFile(null); setReport(null); setError(''); // eslint-disable-line react-hooks/set-state-in-effect -- reset on open
    setF(area ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, area[k] ?? EMPTY[k]])) : EMPTY);
  }, [open, area]);

  if (!open) return null;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const pick = async (fl) => {
    setFile(fl); setReport(null); setError('');
    if (!fl) return;
    setChecking(true);
    try { setReport(await checkProtectedAreaBoundary(fl, area?.id)); } catch (e) { setError(e.message || 'The file could not be checked.'); } finally { setChecking(false); }
  };

  const urlBad = f.source_url && !/^https?:\/\//i.test(f.source_url.trim());
  const problems = [
    !area && !file && 'Choose a boundary file.',
    file && report && !report.ok && 'The file did not pass the checks.',
    file && !report && !checking && 'The file has not been checked.',
    !f.source_name.trim() && 'Say who published this boundary.',
    urlBad && 'The source link must start with http:// or https://.',
    !f.name.trim() && !f.name_column && 'Give the area a name.',
  ].filter(Boolean);

  const save = async (e) => {
    e.preventDefault();
    if (problems.length) { setError(problems.join(' ')); return; }
    setSaving(true); setError('');
    try { onSaved(await saveProtectedAreaBoundary(file, f, area?.id)); } catch (err) { setError(err.message || 'The boundary could not be saved.'); } finally { setSaving(false); }
  };

  const several = (report?.shapes?.length || 0) > 1;
  return (
    <div className="fixed inset-0 z-[1100] flex items-start sm:items-center justify-center p-4 bg-black/40 overflow-y-auto">
      <form onSubmit={save} className="bg-white rounded-2xl max-w-3xl w-full border border-gray-200 shadow-xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-display text-xl font-semibold text-gray-900">{area ? `Update ${area.name || 'protected area'}` : 'Add a protected area from a file'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-[var(--bg-subtle)]"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[75vh] overflow-y-auto">
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">1. Boundary file</h4>
            <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-green-600 cursor-pointer">
              <Upload size={18} className="text-gray-500 shrink-0" />
              <span className="text-sm text-gray-700">{file ? file.name : area ? 'Choose a new file to replace the boundary (optional)' : 'Choose a GeoJSON, KML or zipped shapefile (.zip with .shp, .shx, .dbf and .prj)'}</span>
              <input type="file" accept=".geojson,.json,.kml,.zip" className="sr-only" onChange={(e) => pick(e.target.files?.[0] || null)} />
            </label>
            {checking && <p className="text-sm text-gray-500">Checking the file…</p>}
            {report && (
              <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                <ul className="space-y-2">
                  {report.checks.map((c) => (
                    <li key={c.id} className="flex gap-2.5 text-sm"><span className="mt-0.5 shrink-0">{ICON[c.state]}</span><span><span className="font-medium text-gray-900">{c.label}.</span> <span className="text-gray-600">{c.detail}</span></span></li>
                  ))}
                </ul>
                {report.preview && (
                  <div className="h-48 rounded-xl overflow-hidden border border-gray-200 isolate">
                    <MapContainer center={[0, 0]} zoom={2} scrollWheelZoom={false} className="h-full w-full">
                      <TileLayer url={IMAGERY} maxZoom={18} />
                      <GeoJSON key={file?.name} data={report.preview} style={{ color: getCssToken('--status-critical', '#DC2626'), weight: 2, fillOpacity: 0.25 }} />
                      <Fit data={report.preview} />
                    </MapContainer>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">2. The area</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" required={!f.name_column} hint={several ? 'Used for the whole file, unless each shape is named from a column.' : ''}>
                <input className={input} value={f.name} onChange={set('name')} placeholder="e.g. Okomu Forest Reserve" />
              </Field>
              {several && !area && (
                <Field label="One area per shape, named from" hint={`${report.shapes.length} shapes in the file. Leave as one area to merge them.`}>
                  <select className={input} value={f.name_column} onChange={set('name_column')}>
                    <option value="">Save as one area</option>
                    {report.columns.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Designation" hint="e.g. Forest reserve, National park, Sacred grove"><input className={input} value={f.designation} onChange={set('designation')} /></Field>
              <Field label="Status"><select className={input} value={f.status} onChange={set('status')}>{['Designated', 'Proposed', 'Inscribed', 'Established'].map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Country code" hint="Three letters, e.g. NGA"><input className={input} value={f.country} onChange={set('country')} maxLength={3} /></Field>
              <Field label="IUCN category" hint="If the source gives one"><input className={input} value={f.iucn_category} onChange={set('iucn_category')} /></Field>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">3. Where it came from</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Published by" required hint="The agency, ministry or project that made the boundary"><input className={input} value={f.source_name} onChange={set('source_name')} placeholder="e.g. Edo State Ministry of Environment" /></Field>
              <Field label="Link to the source" hint={urlBad ? 'Must start with http:// or https://' : 'Where we found it'}><input className={`${input} ${urlBad ? 'border-red-400' : ''}`} value={f.source_url} onChange={set('source_url')} placeholder="https://…" /></Field>
              <Field label="Date of the boundary" hint="When it was published or gazetted"><input type="date" className={input} value={f.source_date} onChange={set('source_date')} /></Field>
              <Field label="Reference" hint="Gazette number, document title or dataset ID"><input className={input} value={f.source_reference} onChange={set('source_reference')} /></Field>
              <Field label="Licence or permission" hint="e.g. Open data, used with permission"><input className={input} value={f.source_licence} onChange={set('source_licence')} /></Field>
            </div>
            <Field label="Notes"><textarea className={`${input} min-h-[72px]`} value={f.notes} onChange={set('notes')} /></Field>
          </section>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">{problems[0] || 'Ready to save.'}</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-[var(--bg-subtle)]">Cancel</button>
            <button type="submit" disabled={saving || checking || problems.length > 0} className="px-5 py-2 rounded-xl text-sm font-semibold bg-green-700 text-white hover:bg-green-800 disabled:opacity-50">{saving ? 'Saving…' : area ? 'Save changes' : 'Add protected area'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
