import { useCallback, useState } from 'react';
import { useLoader } from '../../../components/page/useLoader';
import InfoTip from '../../../components/page/InfoTip';
import { Button, Note } from '../../components/ui';
import { inputCls } from '../../components/formHelpers';
import { fetchSubscriptionEstimate, updateSubscriptionPrice } from '../../../services/adminApi';
import { naira } from '../../../utils/money';

/**
 * The organisation's monthly crop-monitoring subscription, priced by size: each estate's mapped hectares (from its
 * uploaded boundary) x the price per hectare a month. The price is one for every organisation, set here by the team
 * (NGN 5,000 a hectare a month to start); changing it changes every organisation's estimate at once.
 */
export default function OrgSubscription({ org }) {
  const load = useCallback(() => fetchSubscriptionEstimate(org.id), [org.id]);
  const loader = useLoader(load);
  const d = loader.data;
  const [draft, setDraft] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!d) return loader.error ? <Note tone="error">{loader.error}</Note> : <p className="text-sm text-gray-500">Loading…</p>;
  const price = draft ?? String(d.price_per_ha_month_minor / 100);
  const save = async () => {
    const v = Math.round(Number(price) * 100);
    if (!Number.isFinite(v) || v < 0) { setMsg('Type a price of zero or more.'); return; }
    setBusy(true); setMsg('');
    try { await updateSubscriptionPrice('crop-monitoring', { price_per_ha_month_minor: v }); setDraft(null); setMsg('Price saved for every organisation.'); loader.reload(); }
    catch (e) { setMsg(e.message); }
    setBusy(false);
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">Monthly subscription: crop monitoring
          <InfoTip text="Crop monitoring is billed monthly by size: the mapped hectares of the organisation's estates (from their uploaded boundaries) x the price per hectare a month." /></p>
        <p className="font-display text-xl font-semibold tabular-nums">{d.applies ? naira(d.monthly_minor) : '—'}<span className="text-sm font-normal text-gray-500"> a month</span></p>
      </div>
      {!d.applies && <Note tone="info">No crop service is switched on for this organisation, so there is no crop-monitoring subscription.</Note>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-[#F1F8EC] border border-[#CFE6BF] px-3 py-2"><p className="text-xs text-gray-600">Mapped hectares</p><p className="font-semibold tabular-nums">{Number(d.mapped_ha).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
        <div className="rounded-xl bg-[#FFF8EB] border border-[#F6D9A0] px-3 py-2"><p className="text-xs text-gray-600">Price a hectare a month</p><p className="font-semibold tabular-nums">{naira(d.price_per_ha_month_minor)}</p></div>
        <div className="rounded-xl bg-[#EEF6FD] border border-[#BFDDF6] px-3 py-2"><p className="text-xs text-gray-600">Estates with a boundary</p><p className="font-semibold tabular-nums">{d.estates.filter((e) => e.has_boundary).length} of {d.estates.length}</p></div>
      </div>
      {d.estates.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-600"><tr><th className="px-3 py-2">Estate</th><th className="px-3 py-2">Crop</th><th className="px-3 py-2 text-right">Hectares</th><th className="px-3 py-2 text-right">A month</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {d.estates.map((e) => (
                <tr key={e.farm_id}><td className="px-3 py-2">{e.name}</td><td className="px-3 py-2">{e.crop || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{e.area_ha == null ? (e.has_boundary ? 'not worked out' : 'no boundary yet') : e.area_ha.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{e.area_ha == null || !d.applies ? '—' : naira(Math.round(e.area_ha * d.price_per_ha_month_minor))}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-gray-100">
        <label className="text-sm flex-1 min-w-[200px]"><span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">Price per hectare a month (NGN) <InfoTip text="One price for every organisation. Changing it changes every organisation's monthly estimate at once." /></span>
          <input className={inputCls} inputMode="decimal" value={price} onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ''))} /></label>
        <Button onClick={save} disabled={busy || draft == null}>{busy ? 'Saving…' : 'Save price'}</Button>
      </div>
      {msg && <p className="text-xs text-gray-600">{msg}</p>}
    </div>
  );
}
