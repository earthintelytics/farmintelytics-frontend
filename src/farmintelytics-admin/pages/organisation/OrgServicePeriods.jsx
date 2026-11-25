import { useCallback, useState } from 'react';
import { useLoader } from '../../../components/page/useLoader';
import InfoTip from '../../../components/page/InfoTip';
import { Button } from '../../components/ui';
import { inputCls } from '../../components/formHelpers';
import { fetchServicePeriods, updateServicePeriod } from '../../../services/adminApi';
import { SERVICE_GROUPS } from '../../../constants/servicePhotos';

/**
 * When each switched-on service runs for this organisation, and how it is paid: first and last day, and
 * subscription, trial, free or paused. A service outside its dates, or paused, does not open for the organisation
 * (the server refuses it too). Empty dates: it runs as long as it is switched on.
 */
const STATE = {
  active: ['Running', 'text-[#2D6A2C] bg-[#EEF6EC] border-[#D8EBD3]'], not_started: ['Not started', 'text-[#9A6A00] bg-[#FFF5DD] border-[#F0E0B5]'],
  ended: ['Ended', 'text-red-700 bg-red-50 border-red-200'], paused: ['Paused', 'text-gray-700 bg-gray-100 border-gray-200'],
};
const nameOf = (id) => SERVICE_GROUPS.flatMap((g) => g.services).find((s) => s.id === id)?.label || (id.startsWith('rs-') ? `${id.slice(3).replace(/_/g, ' ')} monitoring` : id);

export default function OrgServicePeriods({ org }) {
  const load = useCallback(() => fetchServicePeriods(org.id), [org.id]);
  const rows = useLoader(load);
  const [edit, setEdit] = useState({});
  const [msg, setMsg] = useState('');
  const data = rows.data?.data || [];
  const val = (r, k) => (edit[r.service]?.[k] ?? r[k] ?? '');
  const save = async (r) => {
    setMsg('');
    try {
      await updateServicePeriod(org.id, r.service, { starts_on: val(r, 'starts_on') || null, ends_on: val(r, 'ends_on') || null, billing: val(r, 'billing') || 'subscription', notes: val(r, 'notes') });
      setEdit((e) => ({ ...e, [r.service]: undefined })); setMsg(`${nameOf(r.service)} saved.`); rows.reload?.();
    } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">Service dates and billing <InfoTip text="When each switched-on service runs for this organisation and how it is paid. Outside its dates, or paused, a service does not open for the organisation. Leave the dates empty for no limit." /></p>
      {rows.state === 'loading' ? <p className="text-sm text-gray-500">Loading…</p> : !data.length ? <p className="text-sm text-gray-500">Switch a service on below first.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500"><tr><th className="py-2 pr-3">Service</th><th className="py-2 pr-3">From</th><th className="py-2 pr-3">Until</th><th className="py-2 pr-3">Billing</th><th className="py-2 pr-3">Now</th><th /></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((r) => {
                const [label, tone] = STATE[r.state] || STATE.active;
                const dirty = !!edit[r.service];
                return (
                  <tr key={r.service}>
                    <td className="py-2 pr-3 font-medium text-gray-900 capitalize">{nameOf(r.service)}</td>
                    <td className="py-2 pr-3"><input type="date" className={`${inputCls} py-1.5`} value={val(r, 'starts_on')} onChange={(e) => setEdit({ ...edit, [r.service]: { ...edit[r.service], starts_on: e.target.value } })} aria-label={`${nameOf(r.service)} from`} /></td>
                    <td className="py-2 pr-3"><input type="date" className={`${inputCls} py-1.5`} value={val(r, 'ends_on')} onChange={(e) => setEdit({ ...edit, [r.service]: { ...edit[r.service], ends_on: e.target.value } })} aria-label={`${nameOf(r.service)} until`} /></td>
                    <td className="py-2 pr-3">
                      <select className={`${inputCls} py-1.5`} value={val(r, 'billing') || 'subscription'} onChange={(e) => setEdit({ ...edit, [r.service]: { ...edit[r.service], billing: e.target.value } })} aria-label={`${nameOf(r.service)} billing`}>
                        <option value="subscription">Subscription</option><option value="trial">Trial</option><option value="free">Free</option><option value="paused">Paused</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3"><span className={`text-xs font-semibold ${tone.split(" ")[0]}`}>{label}</span></td>
                    <td className="py-2 text-right"><Button onClick={() => save(r)} disabled={!dirty}>Save</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {msg && <p className="text-xs text-gray-600">{msg}</p>}
    </div>
  );
}
