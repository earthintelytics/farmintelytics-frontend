import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight, BookOpen, Check, Coins, Copy, KeyRound, LayoutDashboard, ReceiptText, RefreshCw, Rocket, Terminal, Trash2, Webhook,
} from 'lucide-react';
import { useLoader } from '../../components/page/useLoader';
import InfoTip from '../../components/page/InfoTip';
import { Button, Field, Note } from '../../farmintelytics-admin/components/ui';
import { PaymentReference } from '../../farmintelytics-admin/pages/ApiClients';
import { API_FIELD_HELP as H } from '../../components/page/apiHelpText';
import { createApiKey, fetchDeveloperOverview, fetchDeveloperStatement, revokeApiKey, rotateApiKey, saveWebhook } from '../../services/developerApi';
import { naira } from '../../utils/money';
import { copyText } from '../../utils/copyText';
import { useConfirm } from '../../components/ConfirmProvider';

/**
 * /org/<tenant>/developer: the Developer service (the FarmIntelytics API), opened from the services page under its
 * API tab. The money is always at the top: balance, spent this month, hectares checked and free tests used. Sub-pages
 * on the side: Overview (prices, how to pay, the latest transactions), Transactions (the statement month by month),
 * Keys, Callback and Get started. Every figure has an (i) that says what it means. Admins of the organisation make
 * and revoke keys and set the callback; everyone else can see.
 */
const inputCls = 'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-700 outline-none';
const SUBPAGES = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'keys', label: 'API keys', icon: KeyRound },
  { id: 'callback', label: 'Callback', icon: Webhook },
  { id: 'start', label: 'Get started', icon: Rocket },
];
const KIND = { topup: 'Top-up', hold: 'Held for a check', release: 'Released', charge: 'Charged', refund: 'Refund', adjustment: 'Adjustment' };
const thisMonth = () => new Date().toISOString().slice(0, 7);

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

// One figure of the money band.
function Figure({ label, value, sub, tip, tone, children }) {
  const tones = {
    main: 'bg-[#0F5132] border-[#0F5132] text-white', green: 'bg-[#F1F8EC] border-[#CFE6BF]', amber: 'bg-[#FFF8EB] border-[#F6D9A0]', sky: 'bg-[#EEF6FD] border-[#BFDDF6]',
  };
  const dark = tone === 'main';
  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <p className={`text-xs font-semibold flex items-center gap-1.5 ${dark ? 'text-[#CFE9D8]' : 'text-gray-600'}`}>{label} <InfoTip text={tip} side="bottom" /></p>
      <p className={`font-display text-2xl sm:text-3xl font-semibold mt-1 tabular-nums ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${dark ? 'text-[#CFE9D8]' : 'text-gray-500'}`}>{sub}</p>}
      {children}
    </div>
  );
}

function Statement({ entries }) {
  if (!entries?.length) return <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-300 rounded-xl">Nothing in this month.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm min-w-[560px]">
        <thead className="bg-[#0F5132] text-white text-left"><tr>
          <th className="px-4 py-2.5 font-semibold">Date</th><th className="px-4 py-2.5 font-semibold">What</th><th className="px-4 py-2.5 font-semibold">Reference</th>
          <th className="px-4 py-2.5 font-semibold text-right">Amount</th><th className="px-4 py-2.5 font-semibold text-right">Balance after</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {[...entries].reverse().map((e, i) => (
            <tr key={i}>
              <td className="px-4 py-2.5 whitespace-nowrap">{new Date(e.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
              <td className="px-4 py-2.5">{KIND[e.kind] || e.kind}{e.note ? <span className="text-gray-500"> · {e.note}</span> : null}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{e.reference}</td>
              <td className={`px-4 py-2.5 text-right font-mono ${e.amount_minor < 0 ? 'text-gray-900' : 'text-green-800'}`}>{e.amount_minor > 0 ? '+' : ''}{naira(e.amount_minor)}</td>
              <td className="px-4 py-2.5 text-right font-mono">{naira(e.balance_after_minor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OrgDeveloperPage({ profile }) {
  const isAdmin = profile.role === 'admin';
  const confirm = useConfirm();
  const [page, setPage] = useState(() => (SUBPAGES.some((s) => s.id === window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'overview'));
  const [month, setMonth] = useState(thisMonth);
  const load = useCallback(async () => {
    const [overview, current] = await Promise.all([fetchDeveloperOverview(), fetchDeveloperStatement()]);
    return { overview, current };
  }, []);
  const loader = useLoader(load);
  const data = loader.data?.overview;
  const current = loader.data?.current;
  const [picked, setPicked] = useState(null);     // the statement of another month, on Transactions
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [shown, setShown] = useState(null);
  const [keyName, setKeyName] = useState('');
  const [keyMode, setKeyMode] = useState('test');
  const [hookDraft, setHook] = useState(null);
  const hook = hookDraft ?? data?.callback_url ?? '';

  useEffect(() => { window.history.replaceState(null, '', `#${page}`); }, [page]);
  useEffect(() => {
    if (page !== 'transactions' || month === thisMonth()) return undefined;
    let live = true;
    fetchDeveloperStatement(month).then((s) => { if (live) setPicked(s); }).catch((e) => { if (live) setErr(e.message); });
    return () => { live = false; };
  }, [page, month]);
  const statement = month === thisMonth() ? current : picked;

  const act = async (name, fn) => {
    setBusy(name); setErr('');
    try { await fn(); setHook(null); loader.reload(); } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };

  if (!data) return loader.error ? <Note tone="info">{loader.error}</Note> : <p className="text-sm text-gray-500">Loading…</p>;

  const product = data.products?.[0];
  const used = product?.test_used || { requests: 0, hectares: 0 };
  const testPct = product?.test_max_requests ? Math.min(100, (used.requests / product.test_max_requests) * 100) : 0;
  const base = `${window.location.origin}${data.base_url}`;
  const curl = `curl -X POST ${base}/eudr/checks \\
  -H "Authorization: Bearer <your test key>" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-1001" \\
  -d '{"commodity":"cocoa","reference":"PO-1001","geojson":{"type":"FeatureCollection","features":[
       {"type":"Feature","properties":{"ref":"farm-1","ProducerName":"Ada Obi","ProducerCountry":"NG"},
        "geometry":{"type":"Polygon","coordinates":[[[8.330001,7.880001],[8.331001,7.880001],[8.331001,7.881001],[8.330001,7.881001],[8.330001,7.880001]]]}}]}}'`;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--brand-primary-dark)]">Developer · API</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-900 mt-1">The FarmIntelytics API for {profile.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/public-api/v1/redoc" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"><BookOpen size={16} />API reference<ArrowUpRight size={15} /></a>
          <a href="/public-api/v1/docs" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 bg-white hover:bg-gray-50"><Terminal size={16} />Swagger<ArrowUpRight size={15} /></a>
        </div>
      </div>

      {data.status !== 'active' && <Note tone="error">This API account is suspended: calls are refused. Contact FarmIntelytics.</Note>}
      {err && <Note tone="error">{err}</Note>}

      {/* The money, always at the top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Figure tone="main" label="Balance" value={naira(data.balance_minor)} sub="Prepaid wallet"
          tip="What is in your wallet now. Each live check holds its cost first; when it finishes only the area really checked is charged and the rest comes back." />
        <Figure tone="green" label="Spent this month" value={naira(data.usage?.spend_minor)} sub={current?.month}
          tip="Charges for finished live checks this month, after any part of a hold that came back." />
        <Figure tone="sky" label="Hectares checked this month" value={(data.usage?.hectares_checked ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          sub={product ? `${naira(product.price_per_unit_minor, product.currency)} per hectare` : ''}
          tip="The total area of the plots checked with live keys this month. A plot under a hectare counts its fraction." />
        <Figure tone="amber" label="Free tests used" value={product ? `${used.requests} of ${product.test_max_requests}` : '—'}
          sub={product ? `${Number(used.hectares).toFixed(2)} of ${product.test_units_per_day} ha, up to ${product.test_max_ha_per_request} ha a request` : ''}
          tip="Test keys run the same real check, free, up to your plan's allowance in total (not per day). After that, use a live key.">
          {product && <div className="mt-3 h-2 rounded-sm bg-white/70 border border-[#F6D9A0] overflow-hidden"><div className="h-full bg-[#D97706]" style={{ width: `${testPct}%` }} /></div>}
        </Figure>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
        {/* Sub-pages */}
        <nav className="lg:sticky lg:top-20 rounded-2xl border border-gray-200 bg-white p-2" aria-label="Developer pages">
          {SUBPAGES.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setPage(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left ${page === id ? 'bg-[var(--brand-primary)] text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <div className="space-y-6 min-w-0">
          {page === 'overview' && (
            <>
              <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">Your products and prices <InfoTip text="What your plan lets you call, its price per hectare and its limits. Prices are set by FarmIntelytics in your plan." /></h2>
                {data.products.map((p) => (
                  <div key={p.code} className="rounded-xl border border-gray-200 p-4 grid gap-3 sm:grid-cols-3 text-sm">
                    <div><p className="text-xs text-gray-500">Product</p><p className="font-semibold">{p.name}</p></div>
                    <div><p className="text-xs text-gray-500 flex items-center gap-1">Price <InfoTip text={H.price || 'Price per hectare of the plots checked.'} /></p><p className="font-semibold">{naira(p.price_per_unit_minor, p.currency)} per hectare</p></div>
                    <div><p className="text-xs text-gray-500 flex items-center gap-1">Plots per request <InfoTip text="The most plots one request may hold. Larger files are refused before anything is charged." /></p><p className="font-semibold">Up to {p.max_units_per_request}</p></div>
                  </div>
                ))}
              </section>
              <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">Add money <InfoTip text="Pay by bank transfer quoting your payment reference. The balance updates when FarmIntelytics records the payment." /></h2>
                <PaymentReference value={data.payment_reference} />
                <p className="text-sm text-gray-600">A request costs the total area of its plots × the price per hectare. Plots refused by the EU rules, test keys and failed checks are never charged.</p>
              </section>
              <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold">Latest transactions</h2>
                  <button type="button" onClick={() => setPage('transactions')} className="text-sm font-semibold text-green-800 hover:underline">All transactions</button>
                </div>
                <Statement entries={(current?.entries || []).slice(-6)} />
              </section>
            </>
          )}

          {page === 'transactions' && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">Transactions <InfoTip text="Every top-up, hold, release and charge of the month, newest first, with the balance after each." /></h2>
                <label className="text-sm text-gray-700">Month <input type="month" value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value || thisMonth())} className="ml-2 px-3 py-2 rounded-xl border border-gray-300" /></label>
              </div>
              {statement?.usage && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {[['Live checks', statement.usage.eudr_checks?.checks ?? 0], ['Hectares checked', (statement.usage.hectares_checked ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })],
                    ['Spent', naira(statement.usage.spend_minor)], ['Topped up', naira(statement.usage.topups_minor)]].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2"><p className="text-xs text-gray-500">{k}</p><p className="font-semibold tabular-nums">{v}</p></div>
                  ))}
                </div>
              )}
              {statement ? <Statement entries={statement.entries} /> : <p className="text-sm text-gray-500">Loading…</p>}
            </section>
          )}

          {page === 'keys' && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">API keys <InfoTip text="Test keys (fi_test_…) run the same real checks free, within your plan's test allowance. Live keys (fi_live_…) are charged from your wallet. A key is shown in full only once, when it is made." /></h2>
              {shown && <Secret label={shown.label} value={shown.value} />}
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {data.keys.length === 0 && <p className="text-sm text-gray-500 p-4">No keys yet.</p>}
                {data.keys.map((k) => (
                  <div key={k.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                    <KeyRound size={16} className="text-gray-400" />
                    <span className="text-sm font-semibold">{k.name}</span>
                    <code className="text-xs text-gray-600">{k.shown}</code>
                    <span className={`text-xs font-semibold ${k.active ? (k.mode === 'live' ? 'text-green-800' : 'text-sky-800') : 'text-gray-500'}`}>{k.active ? (k.mode === 'live' ? 'Live' : 'Test') : 'Revoked'}</span>
                    <span className="text-xs text-gray-500 mr-auto">{k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleString()}` : 'Not used yet'}</span>
                    {isAdmin && k.active && (
                      <>
                        <Button variant="secondary" disabled={!!busy} onClick={() => act('rot', async () => { const r = await rotateApiKey(k.id); setShown({ label: `New key for ${r.name}`, value: r.key }); })}><RefreshCw size={14} />Rotate</Button>
                        <Button variant="secondary" disabled={!!busy} onClick={async () => { if (await confirm(`Revoke the key "${k.name}"? Calls with it stop at once.`, { typed: true, action: 'Revoke' })) act('rev', () => revokeApiKey(k.id)); }}><Trash2 size={14} />Revoke</Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {isAdmin && (
                <div className="flex flex-wrap items-end gap-3 pt-1">
                  <Field label="Key name" help={H.keyName} className="flex-1 min-w-[180px]"><input className={inputCls} value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. ERP server" /></Field>
                  <Field label="Mode" help={H.keyMode}><select className={inputCls} value={keyMode} onChange={(e) => setKeyMode(e.target.value)}><option value="test">Test (free)</option><option value="live">Live (charged)</option></select></Field>
                  <Button disabled={!!busy} onClick={() => act('new', async () => { const r = await createApiKey(keyName || 'Default', keyMode); setShown({ label: `Your ${r.mode} key "${r.name}"`, value: r.key }); setKeyName(''); })}>Create key</Button>
                </div>
              )}
            </section>
          )}

          {page === 'callback' && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">Callback <InfoTip text="We POST the result to this https address when a check finishes, signed with your secret in the FI-Signature header. If your server does not answer 2xx we try 5 more times over about 7 hours." /></h2>
              {shown && <Secret label={shown.label} value={shown.value} />}
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Callback URL" help={H.callback} className="flex-1 min-w-[240px]"><input className={inputCls} value={hook} disabled={!isAdmin} onChange={(e) => setHook(e.target.value)} placeholder="https://your-system.example/eudr-webhook" /></Field>
                {isAdmin && <Button disabled={!!busy} onClick={() => act('hook', async () => { const r = await saveWebhook(hook); if (r.webhook_secret) setShown({ label: 'Your webhook signing secret', value: r.webhook_secret }); })}>Save</Button>}
                {isAdmin && <Button variant="secondary" disabled={!!busy} onClick={() => act('sec', async () => { const r = await saveWebhook(hook, true); setShown({ label: 'Your new webhook signing secret', value: r.webhook_secret }); })}>New signing secret</Button>}
              </div>
            </section>
          )}

          {page === 'start' && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4 text-sm text-gray-700">
              <h2 className="font-display text-lg font-semibold text-gray-900 flex items-center gap-2">Get started <InfoTip text={`Base address ${base}. The full reference, with every field and error, is on the API reference page.`} /></h2>
              <ol className="grid gap-3 sm:grid-cols-2">
                {[['Make a test key', 'Under API keys. Free, within your plan’s test allowance.'],
                  ['Check your plots, free', 'POST /eudr/validate answers at once, plot by plot, with the EU information system’s rules.'],
                  ['Send them for the check', 'POST /eudr/checks answers 202 with a check id. Send an Idempotency-Key so a retry is never charged twice.'],
                  ['Read the result', 'GET /eudr/checks/{id}, or wait for your callback; then download the EU file with /geojson.']].map(([t, d], i) => (
                  <li key={t} className="rounded-xl border border-gray-200 p-4"><p className="text-xs font-semibold text-gray-500">Step {i + 1}</p><p className="font-semibold text-gray-900 mt-1">{t}</p><p className="mt-1">{d}</p></li>
                ))}
              </ol>
              <div>
                <p className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Coins size={15} /> A first request (a 1.2 ha plot as a polygon)</p>
                <pre className="overflow-x-auto rounded-xl bg-gray-50 border border-gray-200 p-4 text-xs leading-relaxed">{curl}</pre>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
