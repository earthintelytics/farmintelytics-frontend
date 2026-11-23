import { useCallback, useState } from 'react';
import { Check, Copy, Plus, RefreshCw } from 'lucide-react';
import { Page, Card, Button, Field, Pill, Modal, Empty, Loading, Note, Tabs } from '../components/ui';
import { inputCls } from '../components/formHelpers';
import ErrorBanner from '../components/ErrorBanner';
import { useLoader } from '../../components/page/useLoader';
import { fetchOrganizations } from '../../services/adminApi';
import {
  adjustApiWallet, createApiClient, createApiPlan, fetchApiClient, fetchApiClients, fetchApiPlans, fetchApiProducts,
  fetchApiStatement, issueApiKey, revokeApiKeyAdmin, setApiSubscription, topupApiWallet, updateApiClient, updateApiPlan,
} from '../../services/apiPlatformAdminApi';
import { naira, toMinor } from '../../utils/money';
import { copyText } from '../../utils/copyText';
import { teamRole } from '../../services/session';
import GuidePanel from '../../components/page/GuidePanel';
import { API_ADMIN_GUIDE, API_MODAL_HELP } from '../../components/page/apiHelpText';

/**
 * API clients: organisations that use FarmIntelytics through the public API (EUDR check first). Plans set the
 * price per plot in naira; each client has a prepaid wallet (or postpaid with a credit limit), keys, and a
 * statement. Prices and money can only be changed by a team owner (the server refuses the others too).
 */
const BLANK_PLAN = { product: 'eudr-check', name: '', price: '', monthly_fee: '0', included_units_per_month: 0, max_units_per_request: 1000,
  test_units_per_day: 50, low_balance_alert: '0', default_billing: 'prepaid', active: true, notes: '' };

function planPayload(f) {
  return { product: f.product, name: f.name.trim(), price_per_unit_minor: toMinor(f.price), monthly_fee_minor: toMinor(f.monthly_fee || 0),
    included_units_per_month: +f.included_units_per_month || 0, max_units_per_request: +f.max_units_per_request || 1000,
    test_units_per_day: +f.test_units_per_day || 0, low_balance_alert_minor: toMinor(f.low_balance_alert || 0), currency: 'NGN',
    default_billing: f.default_billing, active: !!f.active, notes: f.notes || '' };
}

function PlanModal({ plan, products, onClose, onSaved }) {
  const [f, setF] = useState(plan ? { ...plan, price: (plan.price_per_unit_minor / 100).toString(), monthly_fee: (plan.monthly_fee_minor / 100).toString(),
    low_balance_alert: (plan.low_balance_alert_minor / 100).toString() } : BLANK_PLAN);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const save = async () => {
    const p = planPayload(f);
    if (!p.name || !Number.isFinite(p.price_per_unit_minor) || p.price_per_unit_minor < 0) return setError('Give the plan a name and a price per plot.');
    setBusy(true); setError('');
    try { await (plan ? updateApiPlan(plan.id, p) : createApiPlan(p)); onSaved(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal help={API_MODAL_HELP.plan} title={plan ? `Edit plan: ${plan.name}` : 'New plan'} text="Prices in naira. Clients on this plan are charged per plot checked." onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save plan'}</Button></>}>
      {error && <Note tone="error">{error}</Note>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Product"><select className={inputCls} value={f.product} onChange={set('product')} disabled={!!plan}>{products.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</select></Field>
        <Field label="Plan name"><input className={inputCls} value={f.name} onChange={set('name')} placeholder="e.g. Standard" /></Field>
        <Field label="Price per plot (₦)"><input className={inputCls} value={f.price} onChange={set('price')} inputMode="decimal" /></Field>
        <Field label="Billing" hint="New clients start on this"><select className={inputCls} value={f.default_billing} onChange={set('default_billing')}><option value="prepaid">Prepaid wallet</option><option value="postpaid">Monthly invoice</option></select></Field>
        <Field label="Monthly fee (₦)" hint="0: pay as you go"><input className={inputCls} value={f.monthly_fee} onChange={set('monthly_fee')} inputMode="decimal" /></Field>
        <Field label="Plots included each month"><input type="number" min="0" className={inputCls} value={f.included_units_per_month} onChange={set('included_units_per_month')} /></Field>
        <Field label="Most plots in one request"><input type="number" min="1" className={inputCls} value={f.max_units_per_request} onChange={set('max_units_per_request')} /></Field>
        <Field label="Free test plots a day"><input type="number" min="0" className={inputCls} value={f.test_units_per_day} onChange={set('test_units_per_day')} /></Field>
        <Field label="Warn the client below (₦)"><input className={inputCls} value={f.low_balance_alert} onChange={set('low_balance_alert')} inputMode="decimal" /></Field>
        <Field label="Notes"><input className={inputCls} value={f.notes} onChange={set('notes')} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.active} onChange={set('active')} /> Plan can be given to clients</label>
    </Modal>
  );
}

function ClientModal({ plans, orgs, onClose, onSaved }) {
  const [f, setF] = useState({ company_id: '', new_name: '', plan_id: plans[0]?.id || '', credit: '0', contact_email: '', billing_email: '', billing: '' });
  const isNew = f.company_id === '__new__';
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    if (!f.plan_id || !f.company_id || (isNew && !f.new_name.trim())) return setError('Choose the organisation (or name a new one) and a plan.');
    setBusy(true); setError('');
    try {
      await createApiClient({ company_id: isNew ? '' : f.company_id, organisation_name: isNew ? f.new_name.trim() : '', plan_id: +f.plan_id, billing: f.billing || null, credit_limit_minor: toMinor(f.credit || 0), contact_email: f.contact_email, billing_email: f.billing_email });
      onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal help={API_MODAL_HELP.client} title="Add an API client" text="An existing organisation, or a new one from its name (its full onboarding can come later). The EUDR API service is switched on in its licence." onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? 'Adding…' : 'Add client'}</Button></>}>
      {error && <Note tone="error">{error}</Note>}
      {!plans.length && <Note tone="info">Make a plan first (Plans tab): it sets the price per plot.</Note>}
      <Field label="Organisation"><select className={inputCls} value={f.company_id} onChange={set('company_id')}><option value="">Choose</option><option value="__new__">New organisation…</option>{orgs.map((o) => <option key={o.schema_name} value={o.schema_name}>{o.display_name || o.schema_name}</option>)}</select></Field>
      {isNew && <Field label="New organisation's name" hint="Estates, boundaries and other services can be added later in Organisations."><input className={inputCls} value={f.new_name} onChange={set('new_name')} placeholder="e.g. Cocoa Buyers Ltd" /></Field>}
      <Field label="Plan"><select className={inputCls} value={f.plan_id} onChange={set('plan_id')}>{plans.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.product_name} · {p.name} · {naira(p.price_per_unit_minor)} per {p.unit}</option>)}</select></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Billing"><select className={inputCls} value={f.billing} onChange={set('billing')}><option value="">As the plan</option><option value="prepaid">Prepaid wallet</option><option value="postpaid">Monthly invoice</option></select></Field>
        <Field label="Credit limit (₦)" hint="Postpaid only"><input className={inputCls} value={f.credit} onChange={set('credit')} inputMode="decimal" /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Technical contact email"><input className={inputCls} value={f.contact_email} onChange={set('contact_email')} /></Field>
        <Field label="Billing contact email" hint="Gets the low-balance email"><input className={inputCls} value={f.billing_email} onChange={set('billing_email')} /></Field>
      </div>
    </Modal>
  );
}

function ContactRow({ c, busy, onSave }) {
  const [draft, setDraft] = useState(null);
  const f = draft || { contact_email: c.contact_email || '', billing_email: c.billing_email || '' };
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-900">Contacts</h3>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <Field label="Technical contact"><input className={inputCls} value={f.contact_email} onChange={(e) => setDraft({ ...f, contact_email: e.target.value })} /></Field>
        <Field label="Billing contact" hint="Gets the low-balance email"><input className={inputCls} value={f.billing_email} onChange={(e) => setDraft({ ...f, billing_email: e.target.value })} /></Field>
        <Button variant="secondary" disabled={busy || !draft} onClick={() => { onSave(f); setDraft(null); }}>Save</Button>
      </div>
    </section>
  );
}

function ClientPanel({ id, plans, owner, onClose, onChanged }) {
  const load = useCallback(async () => {
    const [c, s] = await Promise.all([fetchApiClient(id), fetchApiStatement(id)]);
    return { c, s };
  }, [id]);
  const L = useLoader(load);
  const [shownKey, setShownKey] = useState(null); const [copied, setCopied] = useState(false);
  const [money, setMoney] = useState({ amount: '', reference: '', note: '', kind: 'topup' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  const act = async (name, fn) => {
    setBusy(name); setError('');
    try { await fn(); L.reload(); onChanged(); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };
  const c = L.data?.c; const s = L.data?.s;
  return (
    <Modal size="lg" title={c ? c.organisation : 'API client'} text={c ? `${c.company_id} · ${c.billing === 'postpaid' ? `postpaid, limit ${naira(c.credit_limit_minor)}` : 'prepaid'}` : ''} onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {(error || L.error) && <Note tone="error">{error || L.error}</Note>}
      {!c ? <Loading /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><p className="text-xs text-gray-500">Balance</p><p className="font-mono text-lg font-semibold">{naira(c.balance_minor)}</p></div>
            <div><p className="text-xs text-gray-500">Plots checked this month</p><p className="font-mono text-lg font-semibold">{c.usage?.plots_checked ?? 0}</p></div>
            <div><p className="text-xs text-gray-500">Spent this month</p><p className="font-mono text-lg font-semibold">{naira(c.usage?.spend_minor)}</p></div>
            <div><p className="text-xs text-gray-500">Status</p><Pill tone={c.status === 'active' ? 'good' : 'critical'}>{c.status}</Pill></div>
          </div>

          <ContactRow c={c} busy={!!busy} onSave={(patch) => act('contact', () => updateApiClient(c.id, patch))} />

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Products and plan</h3>
            {c.subscriptions.map((sub) => (
              <div key={sub.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold">{sub.product_name}</span>
                <select className={`${inputCls} max-w-xs`} value={sub.plan_id} disabled={!owner || !!busy}
                  onChange={(e) => act('plan', () => setApiSubscription(c.id, +e.target.value))}>
                  {plans.filter((p) => p.product === sub.product).map((p) => <option key={p.id} value={p.id}>{p.name} · {naira(p.price_per_unit_minor)} per {p.unit}</option>)}
                </select>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Keys</h3>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={!!busy} onClick={() => act('test', async () => setShownKey(await issueApiKey(c.id, 'Test', 'test')))}><Plus size={14} />Test key</Button>
                <Button variant="secondary" disabled={!!busy} onClick={() => act('live', async () => setShownKey(await issueApiKey(c.id, 'Live', 'live')))}><Plus size={14} />Live key</Button>
              </div>
            </div>
            {shownKey && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-sm font-semibold text-amber-900">Send this {shownKey.mode} key to the client safely: it is shown only once.</p>
                <div className="flex items-center gap-2"><code className="flex-1 min-w-0 break-all bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs">{shownKey.key}</code>
                  <Button variant="secondary" onClick={() => copyText(shownKey.key).then(() => setCopied(true))}>{copied ? <Check size={14} /> : <Copy size={14} />}</Button></div>
              </div>
            )}
            <div className="divide-y divide-gray-100 text-sm">
              {c.keys.length === 0 && <p className="text-gray-500">No keys yet.</p>}
              {c.keys.map((k) => (
                <div key={k.id} className="py-2 flex flex-wrap items-center gap-3">
                  <span className="font-semibold">{k.name}</span><code className="text-xs text-gray-600">{k.shown}</code>
                  <Pill tone={k.active ? 'good' : 'neutral'}>{k.active ? k.mode : 'revoked'}</Pill>
                  <span className="text-xs text-gray-500 mr-auto">{k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleString()}` : 'Not used yet'}</span>
                  {k.active && <Button variant="secondary" disabled={!!busy} onClick={() => act('rev', () => revokeApiKeyAdmin(k.id))}>Revoke</Button>}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Money</h3>
            {!owner ? <p className="text-sm text-gray-500">Only a team owner records top-ups and adjustments.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <Field label="Type"><select className={inputCls} value={money.kind} onChange={(e) => setMoney((m) => ({ ...m, kind: e.target.value }))}><option value="topup">Top-up received</option><option value="adjust">Adjustment (+ or −)</option></select></Field>
                <Field label="Amount (₦)"><input className={inputCls} value={money.amount} onChange={(e) => setMoney((m) => ({ ...m, amount: e.target.value }))} inputMode="decimal" /></Field>
                <Field label="Reference" hint="Bank transfer reference"><input className={inputCls} value={money.reference} onChange={(e) => setMoney((m) => ({ ...m, reference: e.target.value }))} /></Field>
                <Field label="Note"><input className={inputCls} value={money.note} onChange={(e) => setMoney((m) => ({ ...m, note: e.target.value }))} /></Field>
                <Button disabled={!!busy || !money.amount || !money.reference} onClick={() => act('money', async () => {
                  const amt = toMinor(money.amount);
                  if (!Number.isFinite(amt) || amt === 0) throw new Error('Give an amount.');
                  await (money.kind === 'topup' ? topupApiWallet(c.id, amt, money.reference, money.note) : adjustApiWallet(c.id, amt, money.reference, money.note));
                  setMoney({ amount: '', reference: '', note: '', kind: 'topup' });
                })}>Record</Button>
              </div>
            )}
            {s?.entries?.length > 0 && (
              <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px] mt-2">
                <thead><tr className="text-left text-gray-500"><th className="py-1 font-medium">Date</th><th className="py-1 font-medium">What</th><th className="py-1 font-medium">Reference</th><th className="py-1 font-medium text-right">Amount</th><th className="py-1 font-medium text-right">Balance</th></tr></thead>
                <tbody className="divide-y divide-gray-100">{s.entries.slice().reverse().map((e) => (
                  <tr key={e.id}><td className="py-1.5">{new Date(e.created_at).toLocaleDateString()}</td><td className="py-1.5 capitalize">{e.kind}{e.note ? ` · ${e.note}` : ''}</td><td className="py-1.5 font-mono text-xs">{e.reference}</td>
                    <td className="py-1.5 text-right font-mono">{naira(e.amount_minor)}</td><td className="py-1.5 text-right font-mono">{naira(e.balance_after_minor)}</td></tr>))}</tbody>
              </table></div>
            )}
          </section>

          <section className="flex flex-wrap gap-2">
            {c.status === 'active'
              ? <Button variant="secondary" disabled={!!busy} onClick={() => act('sus', () => updateApiClient(c.id, { status: 'suspended' }))}>Suspend (calls refused)</Button>
              : <Button disabled={!!busy} onClick={() => act('act', () => updateApiClient(c.id, { status: 'active' }))}>Reactivate</Button>}
            {c.billing === 'prepaid'
              ? owner && <Button variant="secondary" disabled={!!busy} onClick={() => act('post', () => updateApiClient(c.id, { billing: 'postpaid' }))}>Switch to monthly invoice</Button>
              : owner && <Button variant="secondary" disabled={!!busy} onClick={() => act('pre', () => updateApiClient(c.id, { billing: 'prepaid' }))}>Switch to prepaid</Button>}
          </section>
        </div>
      )}
    </Modal>
  );
}

export default function ApiClients() {
  const owner = teamRole() === 'owner';
  const loadAll = useCallback(async () => {
    const [clients, plans, products, orgs] = await Promise.all([fetchApiClients(), fetchApiPlans(), fetchApiProducts(), fetchOrganizations()]);
    return { clients: clients.items || [], plans: plans.items || [], products: products.items || [], orgs: Array.isArray(orgs) ? orgs : orgs?.items || [] };
  }, []);
  const L = useLoader(loadAll);
  const [tab, setTab] = useState('clients');
  const [planModal, setPlanModal] = useState(null);   // {} new, or the plan
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  const d = L.data;
  return (
    <Page eyebrow="Configuration" title="API clients" text="Organisations using FarmIntelytics through the public API. Prices per plot in naira; prepaid wallets or monthly invoices."
      actions={<Button variant="secondary" onClick={L.reload}><RefreshCw size={15} />Refresh</Button>}>
      {L.error && <ErrorBanner message={L.error} />}
      <GuidePanel guide={API_ADMIN_GUIDE} />
      <Tabs tabs={[{ id: 'clients', label: 'Clients' }, { id: 'plans', label: 'Plans and prices' }]} value={tab} onChange={setTab} />
      {!d ? <Loading /> : tab === 'clients' ? (
        <div className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setAdding(true)}><Plus size={15} />Add client</Button></div>
          {d.clients.length === 0 ? <Empty>No API clients yet. Make a plan, then add an organisation as a client.</Empty> : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead><tr className="text-left text-gray-500 border-b border-gray-200"><th className="px-5 py-3 font-medium">Organisation</th><th className="px-5 py-3 font-medium">Plan</th><th className="px-5 py-3 font-medium">Billing</th><th className="px-5 py-3 font-medium text-right">Balance</th><th className="px-5 py-3 font-medium">Keys</th><th className="px-5 py-3 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {d.clients.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(c.id)}>
                      <td className="px-5 py-3"><p className="font-semibold text-gray-900">{c.organisation}</p><p className="text-xs text-gray-500">{c.company_id}</p></td>
                      <td className="px-5 py-3">{c.subscriptions.map((s) => `${s.product_name}: ${s.plan} (${naira(s.price_per_unit_minor)})`).join(', ')}</td>
                      <td className="px-5 py-3">{c.billing === 'postpaid' ? 'Monthly invoice' : 'Prepaid'}</td>
                      <td className="px-5 py-3 text-right font-mono">{naira(c.balance_minor)}</td>
                      <td className="px-5 py-3">{c.keys_active}</td>
                      <td className="px-5 py-3"><Pill tone={c.status === 'active' ? 'good' : 'critical'}>{c.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {owner && <div className="flex justify-end"><Button onClick={() => setPlanModal({})}><Plus size={15} />New plan</Button></div>}
          {!owner && <Note tone="info">Only a team owner can change plans and prices.</Note>}
          {d.plans.length === 0 ? <Empty>No plans yet. A plan sets the price per plot for a product.</Empty> : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead><tr className="text-left text-gray-500 border-b border-gray-200"><th className="px-5 py-3 font-medium">Plan</th><th className="px-5 py-3 font-medium text-right">Price per plot</th><th className="px-5 py-3 font-medium">Free plots a month</th><th className="px-5 py-3 font-medium text-right">Monthly fee</th><th className="px-5 py-3 font-medium">Per request</th><th className="px-5 py-3 font-medium">Free tests a day</th><th className="px-5 py-3 font-medium">Clients</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {d.plans.map((p) => (
                    <tr key={p.id} className={owner ? 'hover:bg-gray-50 cursor-pointer' : ''} onClick={() => owner && setPlanModal(p)}>
                      <td className="px-5 py-3"><p className="font-semibold">{p.name}</p><p className="text-xs text-gray-500">{p.product_name}{p.active ? '' : ' · not offered'}</p></td>
                      <td className="px-5 py-3 text-right font-mono">{naira(p.price_per_unit_minor)}</td>
                      <td className="px-5 py-3">{p.included_units_per_month || '—'}</td><td className="px-5 py-3 text-right font-mono">{p.monthly_fee_minor ? naira(p.monthly_fee_minor) : '—'}</td>
                      <td className="px-5 py-3">{p.max_units_per_request}</td><td className="px-5 py-3">{p.test_units_per_day}</td><td className="px-5 py-3">{p.clients}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
      {planModal && d && <PlanModal plan={planModal.id ? planModal : null} products={d.products} onClose={() => setPlanModal(null)} onSaved={() => { setPlanModal(null); L.reload(); }} />}
      {adding && d && <ClientModal plans={d.plans} orgs={d.orgs} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); L.reload(); }} />}
      {open && d && <ClientPanel id={open} plans={d.plans} owner={owner} onClose={() => setOpen(null)} onChanged={L.reload} />}
    </Page>
  );
}
