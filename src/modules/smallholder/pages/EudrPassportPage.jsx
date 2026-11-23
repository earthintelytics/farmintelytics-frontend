import { useEffect, useMemo, useState } from 'react';
import { Download, Search, ShieldCheck } from 'lucide-react';
import { checkParcelsEudr, fetchEudrFileForEu, fetchEudrSummary, fetchMembers, fetchParcels } from '../../../services/smallholderApi';
import { PageHeader, Card, NotConnectedNote, ErrorNote, EmptyState, StatusPill, SecondaryButton, PrimaryButton } from '../../../components/page/PageKit';
import { useLoader } from '../../../components/page/useLoader';
import { EUDR_STATUS } from '../smallholderLabels';

/**
 * EUDR passport: per member, the geolocation and deforestation-check result a
 * buyer asks for. A result is shown only after a real check has run (G29);
 * the export carries the check result as recorded, never an assumed one.
 * "Check all parcels" runs the smallholder EUDR check (points over their area,
 * polygons as drawn); "Download for the EU system" gives the members' plots as
 * GeoJSON by the EU information system's rules, with what it had to leave out.
 */
const loadMembers = () => fetchMembers({ page_size: 500 });
const RUNNING = ['queued', 'running'];
const download = (data, name) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/geo+json' }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
};

const EudrPassportPage = () => {
  const { data, state, error: loadError, reload } = useLoader(loadMembers);
  const rows = useMemo(() => data?.rows || [], [data]);
  const [exportError, setError] = useState('');
  const error = exportError || loadError;
  const [q, setQ] = useState('');
  const summaryLoader = useLoader(fetchEudrSummary);
  const summary = summaryLoader.data;
  const reloadSummary = summaryLoader.reload;
  const [note, setNote] = useState('');
  const checking = RUNNING.includes(summary?.last_check?.status);
  // While a check runs, look again every 15 seconds; when it ends, the members' statuses are reloaded.
  useEffect(() => {
    if (!checking) return undefined;
    const t = setInterval(() => { reloadSummary(); reload(); }, 15000);
    return () => clearInterval(t);
  }, [checking, reloadSummary, reload]);

  const checkAll = async () => {
    setError(''); setNote('');
    try {
      const r = await checkParcelsEudr();
      setNote(r.job_id ? `Checking ${r.parcels} parcel${r.parcels === 1 ? '' : 's'}${r.without_location?.length ? ` (${r.without_location.length} without a location are left out)` : ''}. Results appear here when it finishes.` : r.message);
      reloadSummary();
    } catch (e) { setError(e.message); }
  };
  const downloadForEu = async () => {
    setError(''); setNote('');
    try {
      const fc = await fetchEudrFileForEu();
      download({ type: fc.type, features: fc.features }, 'eudr-plots-for-eu.geojson');
      if (fc.excluded?.length) setNote(`${fc.features.length} plots in the file. ${fc.excluded.length} left out because the EU system would refuse them: ${fc.excluded.slice(0, 3).map((x) => x.message).join(' ')}`);
    } catch (e) { setError(e.message); }
  };

  const shown = useMemo(() => rows.filter((r) => !q || `${r.name} ${r.code} ${r.group_name || ''}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const counts = useMemo(() => rows.reduce((c, r) => ({ ...c, [r.eudr_status || 'not_checked']: (c[r.eudr_status || 'not_checked'] || 0) + 1 }), {}), [rows]);

  // GeoJSON of all parcels with the recorded check, for the buyer's due-diligence system.
  const exportGeojson = async () => {
    try {
      const fc = await fetchParcels({});
      download(fc, 'eudr-parcels.geojson');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="p-10 space-y-8">
      <PageHeader
        title="EUDR passport"
        text="For each member: where the land is and whether forest was cleared after 31 December 2020. Buyers in the EU need this for each delivery."
        actions={(
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={checkAll} disabled={!rows.length || checking}><ShieldCheck size={15} />{checking ? 'Checking…' : 'Check all parcels'}</PrimaryButton>
            <SecondaryButton onClick={downloadForEu} disabled={!rows.length}><Download size={15} />Download for the EU system</SecondaryButton>
            <SecondaryButton onClick={exportGeojson} disabled={!rows.length}><Download size={15} />Parcels with results</SecondaryButton>
          </div>
        )}
      />
      {note && <p className="text-sm text-gray-700 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">{note}</p>}
      {summary?.last_check && (
        <p className="text-sm text-gray-600">
          Last check: {new Date(summary.last_check.created_at).toLocaleString()}, {summary.last_check.parcels} parcels, {summary.last_check.status === 'done' ? 'finished' : summary.last_check.status}.
          {' '}{summary.parcels.total} parcels in all: {summary.parcels.pass} pass, {summary.parcels.review} to review, {summary.parcels.fail} fail.
        </p>
      )}

      {state === 'not_connected' && <NotConnectedNote what="The member register" />}
      {(state === 'error' || exportError) && <ErrorNote message={error} onRetry={reload} />}

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(EUDR_STATUS).map(([k, [label, tone]]) => (
            <Card key={k} className="p-5">
              <StatusPill tone={tone}>{label}</StatusPill>
              <p className="font-mono text-2xl text-gray-900 mt-3">{counts[k] || 0}</p>
            </Card>
          ))}
        </div>
      )}

      {state === 'ready' && rows.length === 0 && <EmptyState title="No members yet" text="Add members and their parcel boundaries under Members and parcels." />}

      {rows.length > 0 && (
        <>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 bg-white w-fit">
            <Search size={15} className="text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members" className="text-sm outline-none w-52" />
          </label>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white text-left text-xs font-semibold text-gray-600">
                <tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Group</th><th className="px-5 py-3">Parcels</th><th className="px-5 py-3">Area</th><th className="px-5 py-3">Check result</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((m) => {
                  const [label, tone] = EUDR_STATUS[m.eudr_status] || EUDR_STATUS.not_checked;
                  return (
                    <tr key={m.id}>
                      <td className="px-5 py-3"><p className="font-semibold text-gray-900">{m.name}</p><p className="text-xs text-gray-500">{m.code}</p></td>
                      <td className="px-5 py-3 text-gray-700">{m.group_name || '—'}</td>
                      <td className="px-5 py-3 font-mono text-gray-700">{m.parcels_count ?? 0}</td>
                      <td className="px-5 py-3 font-mono text-gray-700">{m.area_ha != null ? `${Number(m.area_ha).toFixed(2)} ha` : '—'}</td>
                      <td className="px-5 py-3"><StatusPill tone={tone}>{label}</StatusPill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
};

export default EudrPassportPage;
