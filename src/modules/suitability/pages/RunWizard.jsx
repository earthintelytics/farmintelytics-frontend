import { useEffect, useState } from 'react';
import { Download, CheckCircle2, X } from 'lucide-react';
import { submitSuitabilityRun } from '../../../services/suitabilityApi';
import { fetchFarms, fetchSuitabilityThresholds } from '../../../services/adminApi';
import { boundaryCheck } from '../../../farmintelytics-admin/components/validation';
import { readGeoFile } from '../../forms/geo';
import { Modal, Field, PrimaryButton, SecondaryButton, ErrorNote } from '../../../components/page/PageKit';
import { inputCls } from '../../../components/page/useLoader';
import { CROPS } from '../suitabilityLabels';
import { dataForCrop } from '../suitabilityData';
import { DATASET_DEFINITIONS } from '../../data/datasetDefinitions';
import { MODAL_HELP } from '../../../components/page/modalHelpText';

const STRICTNESS = [
  { id: 'estate', label: 'Commercial estate', text: 'Stricter: only the best land counts as well suited' },
  { id: 'standard', label: 'Standard', text: 'The default thresholds' },
  { id: 'smallholder', label: 'Smallholder', text: 'Marginal land can still be worth planting' },
];

/**
 * Parses point samples from CSV or GeoJSON for IDW spatial interpolation.
 */
const parsePointSamples = async (file) => {
  const text = await file.text();
  const name = (file.name || '').toLowerCase();

  if (name.endsWith('.geojson') || name.endsWith('.json')) {
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw new Error('Invalid GeoJSON/JSON file format.'); }
    const features = parsed.features || (parsed.type === 'Feature' ? [parsed] : []);
    const points = [];
    for (const f of features) {
      if (f.geometry && f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
        const [lon, lat] = f.geometry.coordinates;
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push({ lat: Number(lat), lon: Number(lon), ...(f.properties || {}) });
        }
      }
    }
    if (!points.length) {
      throw new Error('No valid Point features with [longitude, latitude] coordinates found in GeoJSON.');
    }
    return points;
  }

  // Parse CSV
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV file must have a header row and at least one data row.');
  }
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  const latIdx = headers.findIndex((h) => ['lat', 'latitude', 'y', 'gps_lat'].includes(h));
  const lonIdx = headers.findIndex((h) => ['lon', 'lng', 'longitude', 'long', 'x', 'gps_lon', 'gps_lng'].includes(h));

  if (latIdx === -1 || lonIdx === -1) {
    throw new Error("CSV must include 'latitude' (or lat) and 'longitude' (or lon) columns.");
  }

  const points = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/['"]/g, ''));
    if (cols.length <= Math.max(latIdx, lonIdx)) continue;
    const lat = parseFloat(cols[latIdx]);
    const lon = parseFloat(cols[lonIdx]);
    if (isNaN(lat) || isNaN(lon)) continue;

    const row = { lat, lon };
    headers.forEach((h, idx) => {
      if (idx !== latIdx && idx !== lonIdx && cols[idx] !== undefined && cols[idx] !== '') {
        const num = parseFloat(cols[idx]);
        row[h] = isNaN(num) ? cols[idx] : num;
      }
    });
    points.push(row);
  }

  if (!points.length) {
    throw new Error('No valid coordinate rows found in CSV.');
  }
  return points;
};

const downloadSampleTemplate = () => {
  const csv = [
    'latitude,longitude,soil_ph,soil_depth_cm,nitrogen_mg_kg,clay_pct',
    '6.5244,3.3792,5.8,120,45,28',
    '6.5310,3.3850,6.2,140,52,32',
    '6.5180,3.3920,5.4,95,38,24',
  ].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  Object.assign(document.createElement('a'), { href: url, download: 'field_samples_template.csv' }).click();
  URL.revokeObjectURL(url);
};

/**
 * New analysis: area (a registered estate or an uploaded boundary that is
 * actually sent), crop, and optional point observations (soil/weather). Starts a
 * real run; progress comes from the run status, nothing is simulated.
 */
const RunWizard = ({ orgs, initialCrop, onClose, onStarted }) => {
  const [companyId, setCompanyId] = useState('');
  const [farms, setFarms] = useState([]);
  const crop = initialCrop || CROPS[0].id;
  const cropName = CROPS.find((c) => c.id === crop)?.name || crop;
  const [orgText, setOrgText] = useState('');
  const registered = orgs.some((o) => o.company_id === companyId);
  const [variants, setVariants] = useState([]);
  const [form, setForm] = useState({ area: 'estate', farm_id: '', variant: '', irrigated: false, strictness: 'standard', use_soil_samples: true });
  const [geojson, setGeojson] = useState(null);
  const [fileNote, setFileNote] = useState('');
  const [fileError, setFileError] = useState('');
  const [pointSamples, setPointSamples] = useState([]);
  const [samplesNote, setSamplesNote] = useState('');
  const [samplesError, setSamplesError] = useState('');
  const [detectedKeys, setDetectedKeys] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tried, setTried] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    let live = true;
    if (!companyId || !orgs.some((o) => o.company_id === companyId)) return undefined;
    fetchFarms(companyId).then((f) => { if (live) setFarms(Array.isArray(f) ? f : []); }).catch(() => {});
    return () => { live = false; };
  }, [companyId, orgs]);

  // Variants come from the admin's suitability settings for the crop.
  useEffect(() => {
    let live = true;
    const admin = CROPS.find((c) => c.id === crop)?.admin || crop;
    fetchSuitabilityThresholds(admin, companyId)
      .then((d) => { if (live) setVariants(Array.isArray(d?.variants) ? d.variants : []); })
      .catch(() => { if (live) setVariants([]); });
    return () => { live = false; };
  }, [crop, companyId]);

  const pick = async (e) => {
    const f = e.target.files?.[0];
    setGeojson(null); setFileNote(''); setFileError('');
    if (!f) return;
    try {
      const { geometry, note } = await readGeoFile(f, 'area');
      const featColl = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry,
          properties: { id: f.name.replace(/\.[^/.]+$/, '') || 'Custom_Farm' },
        }],
      };
      setGeojson(featColl);
      setFileNote(note);
    } catch (err) {
      try {
        const parsed = JSON.parse(await f.text());
        const check = boundaryCheck(parsed, f.size);
        if (check.error) { setFileError(check.error); return; }
        setGeojson(parsed);
        setFileNote(`${check.polygons} polygon${check.polygons > 1 ? 's' : ''} read.`);
      } catch {
        setFileError(err.message || 'Could not read boundary file. Use GeoJSON, KML, KMZ or Shapefile (.zip).');
      }
    }
  };

  const pickSamples = async (e) => {
    const f = e.target.files?.[0];
    setPointSamples([]); setSamplesNote(''); setSamplesError(''); setDetectedKeys([]);
    if (!f) return;
    try {
      const pts = await parsePointSamples(f);
      const keys = new Set();
      pts.forEach((p) => {
        Object.keys(p).forEach((k) => {
          if (!['lat', 'lon', 'latitude', 'longitude'].includes(k.toLowerCase())) keys.add(k);
        });
      });
      const keyList = Array.from(keys);
      setPointSamples(pts);
      setDetectedKeys(keyList);
      setSamplesNote(`${pts.length} point sample${pts.length > 1 ? 's' : ''} loaded. IDW spatial interpolation will generate continuous raster surfaces.`);
    } catch (err) {
      setSamplesError(err.message || 'Could not parse sample points.');
    }
  };

  // Everything a run needs, checked when Start is clicked; each problem is shown on its field.
  const problems = {
    org: !companyId ? "Type the client's name." : null,
    area: (form.area === 'upload' || !registered) && !geojson ? (fileError || 'Choose the area file (GeoJSON polygons in longitude/latitude).') : null,
  };
  const missing = Object.values(problems).filter(Boolean);
  const start = async () => {
    setTried(true);
    if (missing.length) { setError(`The analysis cannot start yet: ${missing.join(' ')}`); return; }
    setBusy(true); setError('');
    try {
      const run = await submitSuitabilityRun({
        crop, company_id: companyId, client_name: orgText.trim(),
        farm_id: form.area === 'estate' && registered ? form.farm_id || null : null,
        area: form.area === 'upload' || !registered ? { geojson } : null,
        variant: form.variant || null, irrigated: form.irrigated, strictness: form.strictness,
        use_soil_samples: registered && form.use_soil_samples,
        soil_samples: pointSamples.length ? pointSamples : null,
      });
      onStarted(run, companyId);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <Modal help={MODAL_HELP.suitabilityRun} wide title={`New ${cropName.toLowerCase()} analysis`} onClose={onClose}
      footer={<><span className="mr-auto self-center text-xs text-gray-500"><span className="text-red-600">*</span> required</span><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Start the analysis'}</PrimaryButton></>}>
      {error && <ErrorNote message={error} />}
      <Field label="Client" required error={tried ? problems.org : null}
        hint={!companyId ? 'Any organisation or person. Registered organisations appear in the list.' : registered ? 'Registered organisation: its estates and uploaded data can be used.' : 'Not a registered organisation: upload the area to analyse.'}>
        <input className={inputCls} list="suit-orgs" value={orgText} placeholder="Type the client's name" autoComplete="off"
          onChange={(e) => {
            const v = e.target.value; setOrgText(v);
            // Capitals, spaces, underscores and dashes do not matter: "Sammy_Test" finds "Sammy Test" or sammy_test.
            const norm = (t) => String(t || '').toLowerCase().replace(/[\s_-]+/g, '');
            const want = norm(v);
            const hit = want ? orgs.find((o) => norm(o.company_name) === want || norm(o.company_id) === want) : null;
            // Any client: a registered organisation keeps its id; anyone else gets one made from the name.
            const slug = v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            const id = hit ? hit.company_id : (slug ? `client_${slug}` : '');
            if (id !== companyId) { setCompanyId(id); setFarms([]); set('farm_id', ''); if (!hit) set('area', 'upload'); }
          }} />
        <datalist id="suit-orgs">{orgs.map((o) => <option key={o.company_id} value={o.company_name || o.company_id} />)}</datalist>
      </Field>
      <p className="text-sm text-gray-600">Crop: <span className="font-semibold text-gray-900">{cropName}</span>. Rainfall, temperature, terrain, soil, flooding, forest in 2020 and protected areas are fetched by the pipeline.</p>

      <Field label="Where" required error={tried ? problems.area : null} hint="Select an existing estate or upload your own farm boundary (GeoJSON polygon).">
        <div className="flex gap-2 mb-3">
          {[['estate', 'A registered estate'], ['upload', 'Upload an area']].filter(([id]) => id === 'upload' || registered).map(([id, label]) => (
            <button key={id} type="button" onClick={() => set('area', id)} className={`px-3 py-2 rounded-xl border text-sm ${form.area === id ? 'border-green-600 bg-green-50 text-green-900 font-semibold' : 'border-gray-300 bg-white text-gray-700'}`}>{label}</button>
          ))}
        </div>
        {form.area === 'estate' && registered ? (
          <select className={inputCls} value={form.farm_id} onChange={(e) => set('farm_id', e.target.value)}>
            <option value="">All estates of the organisation</option>
            {farms.map((f) => <option key={f.farm_id} value={f.farm_id}>{f.farm_name}</option>)}
          </select>
        ) : (
          <>
            <input type="file" accept=".geojson,.json,.kml,.kmz,.zip,application/geo+json,application/zip" onChange={pick} className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-sm" />
            <p className={`text-xs mt-1 ${fileError ? 'text-red-700' : 'text-gray-500'}`}>{fileError || fileNote || 'Upload your farm boundary: GeoJSON, KML, KMZ or Shapefile (.zip) in WGS 84 (longitude/latitude).'}</p>
          </>
        )}
      </Field>

      {/* Optional Ground Sample Points / Soil & Weather Observations with IDW interpolation */}
      <Field
        label={
          <div className="flex items-center justify-between w-full">
            <span className="font-semibold text-gray-900">Field sample points</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Optional</span>
          </div>
        }
        hint="Have GPS soil lab test points (pH, depth, nitrogen) or weather stations? Upload a CSV or GeoJSON here. Our engine automatically applies IDW spatial interpolation across your farm to generate continuous raster surfaces. If omitted, global satellite and SoilGrids baselines are used automatically."
      >
        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/70 space-y-2">
          {!pointSamples.length ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <input
                type="file"
                accept=".csv,.geojson,.json"
                onChange={pickSamples}
                className="block w-full text-xs text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-xs file:font-medium hover:file:bg-gray-50"
              />
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="shrink-0 inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-semibold py-1 px-2 rounded-lg hover:bg-green-100/50"
                title="Download a CSV template with standard column names"
              >
                <Download size={13} />
                <span>Download CSV template</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-white border border-green-200 rounded-lg p-2.5 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-900">
                    <span className="font-bold text-green-800">{pointSamples.length} point samples</span> loaded for IDW interpolation
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {detectedKeys.length ? `Detected parameters: ${detectedKeys.join(', ')}` : 'Spatial coordinates verified'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setPointSamples([]); setSamplesNote(''); setSamplesError(''); setDetectedKeys([]); }}
                className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-gray-100"
                title="Remove uploaded samples"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {samplesError && <p className="text-xs text-red-600">{samplesError}</p>}
          {samplesNote && !samplesError && !pointSamples.length && <p className="text-xs text-gray-600">{samplesNote}</p>}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Variety or system" hint={variants.length ? null : 'No variants set for this crop in the admin.'}>
          <select className={inputCls} value={form.variant} onChange={(e) => set('variant', e.target.value)} disabled={!variants.length}>
            <option value="">Standard</option>
            {variants.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <div className="space-y-2 pt-7">
          <label className="flex items-center gap-2 text-sm text-gray-800"><input type="checkbox" checked={form.irrigated} onChange={(e) => set('irrigated', e.target.checked)} />Irrigated (rainfall limits are relaxed)</label>
          {registered && <label className="flex items-start gap-2 text-sm text-gray-800"><input type="checkbox" className="mt-0.5" checked={form.use_soil_samples} onChange={(e) => set('use_soil_samples', e.target.checked)} />
            <span>Use the organisation's own data where uploaded
              <span className="block text-xs text-gray-500">{dataForCrop(crop).map((d) => DATASET_DEFINITIONS.find((x) => x.id === d.dataset)?.name).filter(Boolean).join(', ')}</span>
            </span>
          </label>}
        </div>
      </div>

      <Field label="How strict">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {STRICTNESS.map((s) => (
            <button key={s.id} type="button" onClick={() => set('strictness', s.id)} className={`text-left px-3 py-2.5 rounded-xl border ${form.strictness === s.id ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}>
              <span className="block text-sm font-semibold text-gray-900">{s.label}</span>
              <span className="block text-xs text-gray-500">{s.text}</span>
            </button>
          ))}
        </div>
      </Field>
    </Modal>
  );
};

export default RunWizard;
