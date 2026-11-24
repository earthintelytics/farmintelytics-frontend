import { useCallback, useState } from 'react';
import { useLoader } from '../../../components/page/useLoader';
import { Check, Copy, KeyRound, RefreshCw, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, Field, Note, Pill } from '../../../farmintelytics-admin/components/ui';
import { createApiKey, fetchDeveloperOverview, fetchDeveloperStatement, revokeApiKey, rotateApiKey, saveWebhook } from '../../../services/developerApi';
import { naira } from '../../../utils/money';
import { copyText } from '../../../utils/copyText';
import GuidePanel from '../../../components/page/GuidePanel';
import { API_CLIENT_GUIDE, API_FIELD_HELP as H } from '../../../components/page/apiHelpText';
import { PaymentReference } from '../../../farmintelytics-admin/pages/ApiClients';

/**
 * Developer and API: the organisation's FarmIntelytics API account (products and prices, balance, keys, callback,
 * usage and statement) and how to start. Admins can make, rotate and revoke keys and set the callback; everyone
 * else can see. Keys and the signing secret are shown once, when made.
 */
const inputCls = 'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-700 outline-none';

function Secret({ label, value }) {
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
      <p className="text-sm font-semibold text-amber-900">{label}: copy it now, it is shown only once.</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 break-all rounded-lg bg-white border border-amber-200 px-3 py-2 text-xs">{value}</code>
        <Button variant="secondary" onClick={() => copyText(value).then(() => setDone(true))}>{done ? <Check size={15} /> : <Copy size={15} />}{done ? 'Copied' : 'Copy'}</Button>
      </div>
    </div>
  );
}

export default function DeveloperCard({ isAdmin }) {
  const loadAll = useCallback(async () => {
    const [overview, statement] = await Promise.all([fetchDeveloperOverview(), fetchDeveloperStatement()]);
    return { overview, statement };
  }, []);
  const loader = useLoader(loadAll);
  const data = loader.data?.overview;
  const statement = loader.data?.statement;
  const [actError, setActError] = useState('');
  const error = actError || loader.error;
  const [busy, setBusy] = useState('');
  const [shown, setShown] = useState(null);       // a just-made key or secret
  const [keyName, setKeyName] = useState('');
  const [keyMode, setKeyMode] = useState('test');
  const [hookDraft, setHook] = useState(null);    // null: the saved callback
  const hook = hookDraft ?? data?.callback_url ?? '';

  const act = async (name, fn) => {
    setBusy(name); setActError('');
    try { await fn(); setHook(null); loader.reload(); } catch (e) { setActError(e.message); } finally { setBusy(''); }
  };

  if (error && !data) return <Card><CardHeader title="Developer and API" /><div className="p-6"><Note tone="info">{error}</Note></div></Card>;
  if (!data) return <Card><CardHeader title="Developer and API" /><div className="p-6 text-sm text-gray-500">Loading…</div></Card>;

  const base = `${window.location.origin}${data.base_url}`;
  const curl = `curl -X POST ${base}/eudr/checks \\
  -H "Authorization: Bearer <your test key>" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-1001" \\
  -d '{"commodity":"cocoa","reference":"PO-1001","geojson":{"type":"FeatureCollection","features":[
       {"type":"Feature","properties":{"ref":"farm-1","ProducerName":"Ada Obi","ProducerCountry":"NG"},
        "geometry":{"type":"Point","coordinates":[8.330123,7.880456]}}]}}'`;
  return (
    <div className="space-y-6">
      <GuidePanel guide={API_CLIENT_GUIDE} defaultOpen={data.keys.length === 0} />
      <Card>
        <CardHeader title="Developer and API" text="Use FarmIntelytics checks from your own systems. Money is shown in naira; the API reports it in kobo." />
        <div className="p-6 space-y-5">
          {error && <Note tone="error">{error}</Note>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><p className="text-xs text-gray-500">Balance</p><p className="font-mono text-lg font-semibold">{naira(data.balance_minor)}</p></div>
            <div><p className="text-xs text-gray-500">Billing</p><p className="text-sm font-semibold">Prepaid wallet, per hectare</p></div>
            <div><p className="text-xs text-gray-500">Hectares checked this month</p><p className="font-mono text-lg font-semibold">{(data.usage?.hectares_checked ?? 0).toLocaleString()}</p></div>
            <div><p className="text-xs text-gray-500">Spent this month</p><p className="font-mono text-lg font-semibold">{naira(data.usage?.spend_minor)}</p></div>
          </div>
          {data.status !== 'active' && <Note tone="error">This API account is suspended: calls are refused. Contact FarmIntelytics.</Note>}
          <div className="space-y-2">
            {data.products.map((p) => (
              <div key={p.code} className="rounded-xl border border-gray-200 p-4 text-sm flex flex-wrap items-center gap-x-6 gap-y-1">
                <span className="font-semibold text-gray-900">{p.name}</span>
                <span>{naira(p.price_per_unit_minor, p.currency)} per hectare</span>
                <span className="text-gray-500">Up to {p.max_units_per_request} plots per request · {p.test_units_per_day} free test hectares a day</span>
              </div>
            ))}
          </div>
          <PaymentReference value={data.payment_reference} />
          <p className="text-sm text-gray-600">To add money, pay by bank transfer quoting your payment reference above; the balance updates when FarmIntelytics records it. A request costs the total area of its plots × the price per hectare (a plot under a hectare costs its fraction). Plots refused by the EU rules, test keys and failed checks are never charged.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="API keys" text="Test keys (fi_test_…) run the same real checks, free, up to the daily limit. Live keys (fi_live_…) are charged." />
        <div className="p-6 space-y-4">
          {shown && <Secret label={shown.label} value={shown.value} />}
          <div className="divide-y divide-gray-100">
            {data.keys.length === 0 && <p className="text-sm text-gray-500">No keys yet.</p>}
            {data.keys.map((k) => (
              <div key={k.id} className="py-3 flex flex-wrap items-center gap-3">
                <KeyRound size={16} className="text-gray-400" />
                <span className="text-sm font-semibold">{k.name}</span>
                <code className="text-xs text-gray-600">{k.shown}</code>
                <Pill tone={k.active ? (k.mode === 'live' ? 'good' : 'info') : 'neutral'}>{k.active ? k.mode : 'revoked'}</Pill>
                <span className="text-xs text-gray-500 mr-auto">{k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleString()}` : 'Not used yet'}</span>
                {isAdmin && k.active && (
                  <>
                    <Button variant="secondary" disabled={!!busy} onClick={() => act('rot', async () => { const r = await rotateApiKey(k.id); setShown({ label: `New key for ${r.name}`, value: r.key }); })}><RefreshCw size={14} />Rotate</Button>
                    <Button variant="secondary" disabled={!!busy} onClick={() => act('rev', () => revokeApiKey(k.id))}><Trash2 size={14} />Revoke</Button>
                  </>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-end gap-3 pt-2">
              <Field label="Key name" help={H.keyName} className="flex-1 min-w-[180px]"><input className={inputCls} value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. ERP server" /></Field>
              <Field label="Mode" help={H.keyMode}><select className={inputCls} value={keyMode} onChange={(e) => setKeyMode(e.target.value)}><option value="test">Test (free)</option><option value="live">Live (charged)</option></select></Field>
              <Button disabled={!!busy} onClick={() => act('new', async () => { const r = await createApiKey(keyName || 'Default', keyMode); setShown({ label: `Your ${r.mode} key "${r.name}"`, value: r.key }); setKeyName(''); })}>Create key</Button>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Callback" text="We POST to this https address when a check finishes. Each call is signed: check the FI-Signature header with your signing secret." />
        <div className="p-6 flex flex-wrap items-end gap-3">
          <Field label="Callback URL" help={H.callback} className="flex-1 min-w-[240px]"><input className={inputCls} value={hook} disabled={!isAdmin} onChange={(e) => setHook(e.target.value)} placeholder="https://your-system.example/eudr-webhook" /></Field>
          {isAdmin && <Button disabled={!!busy} onClick={() => act('hook', async () => { const r = await saveWebhook(hook); if (r.webhook_secret) setShown({ label: 'Your webhook signing secret', value: r.webhook_secret }); })}>Save</Button>}
          {isAdmin && <Button variant="secondary" disabled={!!busy} onClick={() => act('sec', async () => { const r = await saveWebhook(hook, true); setShown({ label: 'Your new webhook signing secret', value: r.webhook_secret }); })}>New signing secret</Button>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Start here" text={`Base address ${base} · full reference at ${window.location.origin}${data.docs_url}`} />
        <div className="p-6 space-y-3 text-sm text-gray-700">
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Make a test key above.</li>
            <li>Check your plots first, free: <code>POST /eudr/validate</code> answers at once, plot by plot, with the EU information system's rules.</li>
            <li>Send them for the check: <code>POST /eudr/checks</code> answers <code>202</code> with a check id; send an <code>Idempotency-Key</code> so a retry is never charged twice.</li>
            <li>Read the result with <code>GET /eudr/checks/&#123;id&#125;</code> (or wait for your callback), then download the EU file with <code>/geojson</code>.</li>
          </ol>
          <pre className="overflow-x-auto rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs leading-relaxed">{curl}</pre>
        </div>
      </Card>

      {statement && (
        <Card>
          <CardHeader title={`Statement, ${statement.month}`} text="Every top-up, hold, release and charge this month." />
          <div className="p-6 overflow-x-auto">
            {statement.entries.length === 0 ? <p className="text-sm text-gray-500">Nothing this month yet.</p> : (
              <table className="w-full text-sm min-w-[520px]">
                <thead><tr className="text-left text-gray-500"><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">What</th><th className="pb-2 font-medium">Reference</th><th className="pb-2 font-medium text-right">Amount</th><th className="pb-2 font-medium text-right">Balance</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {statement.entries.map((e, i) => (
                    <tr key={i}><td className="py-2">{new Date(e.created_at).toLocaleDateString()}</td><td className="py-2 capitalize">{e.kind}{e.note ? ` · ${e.note}` : ''}</td>
                      <td className="py-2 font-mono text-xs">{e.reference}</td><td className="py-2 text-right font-mono">{naira(e.amount_minor)}</td><td className="py-2 text-right font-mono">{naira(e.balance_after_minor)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
