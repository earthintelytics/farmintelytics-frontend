import { useEffect, useMemo, useState } from 'react';
import { X, Download, Trash2, AlertTriangle } from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchParcels, updateMember, exportMember, deleteMember } from '../../../services/smallholderApi';
import { StatusPill, SecondaryButton, PrimaryButton, ErrorNote } from '../../../components/page/PageKit';
import { stateFromError } from '../../../components/page/useLoader';
import { EUDR_STATUS, MEMBER_STATUS, PARCEL_CHECK } from '../smallholderLabels';
import SecurePhoto from '../../../components/SecurePhoto';

const FitTo = ({ data }) => {
  const map = useMap();
  useEffect(() => {
    const b = L.geoJSON(data).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
  }, [data, map]);
  return null;
};

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-2 border-b border-gray-100 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-900 text-right">{children || '—'}</span>
  </div>
);

/** One member: details, parcels on a map, and the checks run on each parcel. */
const MemberDrawer = ({ member, onClose, onSaved }) => {
  const [parcels, setParcels] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let live = true;
    fetchParcels({ member: member.id })
      .then((fc) => { if (live) { setParcels(fc); setState('ready'); } })
      .catch((e) => { if (live) { setState(stateFromError(e)); setError(e.message); } });
    return () => { live = false; };
  }, [member.id]);

  const features = useMemo(() => parcels?.features || [], [parcels]);
  const [statusLabel, statusTone] = MEMBER_STATUS[member.status] || [member.status, 'neutral'];
  const [eudrLabel, eudrTone] = EUDR_STATUS[member.eudr_status] || EUDR_STATUS.not_checked;
  // The photo is shown as a picture, not as a storage path in the list.
  const photo = member.fields?.photo;
  const extra = Object.entries(member.fields || {}).filter(([k, v]) => k !== 'photo' && (v == null || typeof v !== 'object'));

  const setStatus = async (status) => {
    setSaving(true); setError('');
    try { await updateMember(member.id, { status }); onSaved(); onClose(); } catch (e) { setError(e.message); setSaving(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const data = await exportMember(member.id);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `member_${member.code || member.id}_dossier.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(`Failed to export farmer dossier: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (purge = false) => {
    setDeleting(true);
    setError('');
    try {
      await deleteMember(member.id, purge ? { purge: 'true' } : {});
      setDeleteModal(false);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to delete farmer record');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-gray-900/30 flex justify-end" onClick={onClose}>
      <aside className="w-full max-w-xl h-full overflow-y-auto bg-white border-l border-gray-200 p-7 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          {photo && <SecurePhoto path={photo} alt={member.name} className="w-20 h-20 rounded-xl object-cover border border-gray-200 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">{member.code}</p>
            <h3 className="font-display text-2xl font-semibold text-gray-900">{member.name}</h3>
            <div className="flex gap-2 mt-2"><StatusPill tone={statusTone}>{statusLabel}</StatusPill><StatusPill tone={eudrTone}>EUDR: {eudrLabel}</StatusPill></div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>

        {error && <ErrorNote message={error} />}

        <section>
          <Row label="Phone">{member.phone}</Row>
          <Row label="Group">{member.group_name}</Row>
          <Row label="Parcels">{member.parcels_count ?? features.length}</Row>
          <Row label="Area">{member.area_ha != null ? `${Number(member.area_ha).toFixed(2)} ha` : null}</Row>
          {extra.map(([k, v]) => <Row key={k} label={k.replace(/_/g, ' ')}>{String(v)}</Row>)}
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold text-gray-800">Parcels</p>
          {state === 'not_connected' && <p className="text-sm text-gray-500">Parcel boundaries are not connected yet.</p>}
          {state === 'ready' && features.length === 0 && <p className="text-sm text-gray-500">No parcel boundary yet. Upload one, or approve a form submission with a walked boundary.</p>}
          {features.length > 0 && (
            <>
              <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
                <MapContainer center={[0, 0]} zoom={2} className="h-full w-full" scrollWheelZoom={false}>
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Esri" />
                  <GeoJSON data={parcels} style={{ color: '#ffffff', weight: 2, fillOpacity: 0.15 }} />
                  <FitTo data={parcels} />
                </MapContainer>
              </div>
              <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
                {features.map((f) => {
                  const p = f.properties || {};
                  const [checkLabel, checkTone] = PARCEL_CHECK[p.check?.status] || PARCEL_CHECK.pending;
                  return (
                    <li key={p.id} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{[p.crop, p.planting_year].filter(Boolean).join(', planted ') || 'Parcel'}</p>
                        <p className="text-xs text-gray-500 font-mono">{p.area_ha != null ? `${Number(p.area_ha).toFixed(2)} ha` : ''}{p.check?.overlap_with?.length ? ` · overlaps ${p.check.overlap_with.length} other parcel(s)` : ''}</p>
                      </div>
                      <StatusPill tone={checkTone}>{checkLabel}</StatusPill>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <div className="flex gap-2">
            <SecondaryButton disabled={exporting} onClick={handleExport}>
              <Download size={15} />Export dossier
            </SecondaryButton>
            <SecondaryButton disabled={deleting} onClick={() => setDeleteModal(true)}>
              <Trash2 size={15} className="text-red-600" />Delete / Erase
            </SecondaryButton>
          </div>
          <div className="flex gap-2">
            {member.status !== 'suspended' && <SecondaryButton disabled={saving} onClick={() => setStatus('suspended')}>Suspend</SecondaryButton>}
            {member.status !== 'active' && <PrimaryButton disabled={saving} onClick={() => setStatus('active')}>Make active</PrimaryButton>}
          </div>
        </div>
      </aside>

      {deleteModal && (
        <div className="fixed inset-0 z-[1100] bg-gray-900/40 flex items-center justify-center p-4" onClick={() => setDeleteModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-gray-200 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="font-display text-lg font-semibold text-gray-900">Member deletion &amp; privacy</h4>
                <p className="text-xs text-gray-500">NDPA 2023 Article 38 / Right to erasure</p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Choose how to handle data for <strong>{member.name}</strong> ({member.code}):
            </p>

            <div className="space-y-3 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(false)}
                className="w-full text-left p-3.5 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-semibold text-gray-900">Anonymise personal data (Recommended)</p>
                <p className="text-xs text-gray-500 mt-1">
                  Erases name, phone, NIN, and personal fields per NDPA 2023. Agricultural parcels and boundaries are preserved anonymously for co-operative records.
                </p>
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(true)}
                className="w-full text-left p-3.5 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                <p className="text-sm font-semibold text-red-900">Permanently delete member &amp; land records</p>
                <p className="text-xs text-red-700 mt-1">
                  Permanently purges member record, all associated parcels, photos, and form submission answers. Cannot be recovered.
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <SecondaryButton onClick={() => setDeleteModal(false)} disabled={deleting}>
                Cancel
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDrawer;
