import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  MapPin,
  GitCompare,
  Sprout,
  FileText,
  Sparkles,
  BrainCircuit,
  Send,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import * as api from '../../services/organizationMonitorApi';
import DesignedReport from './DesignedReport';
import AiAnswer from '../../components/ai/AiAnswer';
import AiThinking from '../../components/ai/AiThinking';

/**
 * Reports & AI Decision Intelligence Engine (design: docs/services/reports-and-verification.md).
 * Built by the server from stored results (POST /reports, report_builder.py) and drawn by the report engine:
 * the page shows the designed report exactly as its PDF prints (DesignedReport).
 * and live active alerts to provide actionable agronomic guidance.
 */
const DEFAULT_TYPES = [
  { id: 'monthly', label: 'Monthly farm report', desc: 'How the farm did this month and what needs action.', icon: <CalendarDays size={18} /> },
  { id: 'blocks', label: 'Block report', desc: 'One or a few blocks in detail.', icon: <MapPin size={18} /> },
  { id: 'compare', label: 'Comparison', desc: 'This period against another, or one estate against another.', icon: <GitCompare size={18} /> },
  { id: 'season', label: 'Season summary', desc: 'From the start of the season to now.', icon: <Sprout size={18} /> },
  { id: 'service', label: 'Service & ESG summary', desc: 'EUDR, carbon estimation, and restoration progress.', icon: <ShieldCheck size={18} /> },
];

const FOCUS_AREAS = [
  { id: 'general', label: 'All agronomics' },
  { id: 'irrigation', label: 'Irrigation & water' },
  { id: 'nutrition', label: 'Nutrient & fertilizer' },
  { id: 'canopy', label: 'Canopy & replanting' },
  { id: 'risk', label: 'Risk & drought defense' },
];

const iso = (d) => d.toISOString().slice(0, 10);
const monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return { from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m, 0))) };
};
const lastMonth = () => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
};
const shift = ({ from, to }, kind) => {
  const f = new Date(from), t = new Date(to);
  if (kind === 'last_year') {
    f.setUTCFullYear(f.getUTCFullYear() - 1);
    t.setUTCFullYear(t.getUTCFullYear() - 1);
    return { from: iso(f), to: iso(t) };
  }
  const days = Math.round((t - f) / 864e5) + 1;
  f.setUTCDate(f.getUTCDate() - days);
  t.setUTCDate(t.getUTCDate() - days);
  return { from: iso(f), to: iso(t) };
};
const fmtDate = (s) => new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const HEALTH_WORD = (v) => (v == null ? 'no clear images' : v >= 0.7 ? 'strong' : v >= 0.55 ? 'good' : v >= 0.4 ? 'weaker than usual' : 'poor');

const Chip = ({ on, children, ...rest }) => (
  <button
    type="button"
    {...rest}
    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
      on
        ? 'bg-green-50 border-green-600 text-green-800 shadow-xs'
        : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
    }`}
  >
    {children}
  </button>
);

const Card = ({ className = '', children }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 shadow-xs ${className}`}>{children}</div>
);

const selectCls = 'px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-600';

export default function ReportBuilder({ plots, estates, tenant, orgName, subject, serviceId, cropType, loading }) {
  const [typesList] = useState(DEFAULT_TYPES);
  const [type, setType] = useState('monthly');
  const [level, setLevel] = useState('organisation');
  const [estate, setEstate] = useState(estates[0] || '');
  const [blocks, setBlocks] = useState([]);
  const [blockQuery, setBlockQuery] = useState('');
  const [periodKind, setPeriodKind] = useState('month');
  const [month, setMonth] = useState(lastMonth);
  const [range, setRange] = useState(() => ({ from: iso(new Date(Date.now() - 90 * 864e5)), to: iso(new Date()) }));
  const [compare, setCompare] = useState('previous');
  const [compareEstate, setCompareEstate] = useState(estates[1] || '');
  const [focusArea, setFocusArea] = useState('general');
  // The report types this service offers (crop, EUDR, forestry, land use...), its own first.
  const [kinds, setKinds] = useState([]);
  const [kind, setKind] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState(false);
  // Settings fold away once a report is made, so the report and Download sit at the top.
  const [showSettings, setShowSettings] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  // Interactive AI Assistant State
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswers, setAiAnswers] = useState([]);
  const [aiQuerying, setAiQuerying] = useState(false);

  // Load report options and history on mount
  useEffect(() => {
    let active = true;
    api.fetchReportsHistory().then((res) => {
      if (active && Array.isArray(res)) {
        setHistory(res.map(h => ({
          ...h,
          where: h.numbers?.where || h.where || 'All areas',
          // Past reports come from the server without the chart readings.
          health: h.health || [], water: h.water || [], healthCmp: h.healthCmp || [], waterCmp: h.waterCmp || [],
          cmp: h.cmp || h.compare || null,
          recommendations: h.recommendations || [], risks: h.risks || [], findings: h.findings || [], limits: h.limits || [],
          actions: h.actions || (h.blocks_action || []).map(b => ({
            block: b.field_id,
            estate: '',
            problem: b.problem,
            action: b.action,
            priority: b.priority,
            since: b.since,
          })),
          walk: h.where_to_walk || [],
          summary: typeof h.summary === 'string' ? { text: h.summary } : (h.summary || { text: '' }),
          created: h.created_at || h.created || new Date(),
        })));
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [tenant]);

  useEffect(() => {
    let active = true;
    api.fetchReportKinds(serviceId).then((r) => {
      if (active && r?.kinds) { setKinds(r.kinds); setKind(r.default || r.kinds[0]?.id || ''); }
    }).catch(() => {});
    return () => { active = false; };
  }, [serviceId]);

  const period = periodKind === 'month' ? monthRange(month) : range;
  // Search matches a block's name or code, or its estate; an estate found this way picks all its blocks at once.
  const q = blockQuery.trim().toLowerCase();
  const blockList = useMemo(() => (plots || []).filter(p => !q || `${p.name} ${p.id} ${p.subfarm || ''}`.toLowerCase().includes(q)).slice(0, 200), [plots, q]);
  const estateHits = useMemo(() => {
    if (!q) return [];
    const by = {};
    (plots || []).forEach(p => { const e = p.subfarm || p.division; if (e && String(e).toLowerCase().includes(q)) (by[e] = by[e] || []).push(p.id); });
    return Object.entries(by);
  }, [plots, q]);
  const where = level === 'organisation' ? `all of ${orgName}` : level === 'estate' ? estate : `${blocks.length} block${blocks.length === 1 ? '' : 's'}`;
  const canCreate = level !== 'blocks' || blocks.length > 0;

  const create = async () => {
    setBusy(true);
    setErrorMsg('');
    const cmp = type === 'compare' && compare === 'estate' ? null : shift(period, compare === 'last_year' ? 'last_year' : 'previous');

    // 2. Build and persist grounded report on backend
    try {
      const saved = await api.createReport({
        type,
        scope: { level, farm_id: level === 'estate' ? estate : null, field_ids: level === 'blocks' ? blocks : [] },
        period,
        compare: cmp,
        crop: cropType,
        service: serviceId,
        kind: kind || undefined,
        focus_area: focusArea !== 'general' ? focusArea : null,
      });

      const reportObj = {
        report_id: saved.report_id,
        type: saved.type || type,
        kind: saved.kind || kind,
        title: saved.title || `${subject}: ${where}`,
        where: saved.numbers?.where || where,
        period: saved.period || period,
        numbers: saved.numbers || {},
        created: new Date(saved.created_at || Date.now()),
      };

      setReport(reportObj);
      setShowSettings(false);
      setHistory(prev => [reportObj, ...prev.filter(r => r.report_id !== reportObj.report_id).slice(0, 19)]);
      setHistoryTab(false);
    } catch (err) {
      // 422: the period has no satellite data, so the server made no report and says why.
      setErrorMsg(err.status === 422 ? err.message : `Could not generate report: ${err.message || 'Server error'}`);
    } finally {
      setBusy(false);
    }
  };

  // Ask AI about this specific report
  const askAiOnReport = async () => {
    if (!aiQuestion.trim() || aiQuerying) return;
    const q = aiQuestion.trim();
    setAiQuestion('');
    setAiQuerying(true);
    const newEntry = { q, a: '', loading: true };
    setAiAnswers(prev => [...prev, newEntry]);

    try {
      const prompt = `Context: Farm Report for ${where} (${fmtDate(period.from)} to ${fmtDate(period.to)}). Crop Health: ${HEALTH_WORD(report?.numbers?.crop_health_avg)}, Leaf Water: ${report?.numbers?.leaf_water_avg}, Alerts: ${report?.numbers?.alerts}. User Question: ${q}`;
      const res = await api.queryAiAgent(prompt, serviceId ? { module: serviceId } : {});
      const answerText = res?.response || 'No answer came back. Try again in a moment.';
      setAiAnswers(prev => prev.map(item => item.q === q ? { q, a: answerText, loading: false } : item));
    } catch {
      setAiAnswers(prev => prev.map(item => item.q === q ? { q, a: 'The advisor could not be reached. Check the connection and try again.', loading: false } : item));
    } finally {
      setAiQuerying(false);
    }
  };

  return (
    <div className="p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-700">
              <BrainCircuit size={20} />
            </span>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Reports</h2>
          </div>
          <p className="text-sm text-gray-500 font-medium mt-2 max-w-2xl">
            Choose what, where and when on the left; your report appears on the right, in plain language, ready to download or share.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setHistoryTab(!historyTab)}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl border border-gray-200 bg-white"
          >
            {historyTab ? 'Back to the report builder' : `Past reports (${history.length})`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-8 items-start">
      {/* LEFT: settings */}
      {/* Settings scroll on their own; the report beside them stays where it is. */}
      <aside className="xl:sticky xl:top-6 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 space-y-4 no-print">

      {/* History View */}
      {/* Report Generator Config Card */}
      {!showSettings && report && (
        <Card className="p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Report settings</p>
          <p className="text-sm text-gray-600">{typesList.find(t => t.id === type)?.label} · {where} · {fmtDate(period.from)} – {fmtDate(period.to)}</p>
          <button type="button" onClick={() => setShowSettings(true)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">Change settings</button>
        </Card>
      )}
      {(showSettings || !report) && (
        <Card className="p-6 space-y-6">
          {kinds.length > 1 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-900">Which report?</div>
              <div className="flex flex-wrap gap-2">
                {kinds.map((k) => (
                  <button key={k.id} type="button" onClick={() => setKind(k.id)} aria-pressed={kind === k.id}
                    className={`px-3 py-2 rounded-xl border text-sm font-semibold ${kind === k.id ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* 1. Type */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs flex items-center justify-center font-bold">1</span>
              What kind of report?
            </div>
            <div className="grid grid-cols-1 gap-2">
              {typesList.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`text-left px-4 py-3 rounded-xl border transition-all ${
                    type === t.id
                      ? 'border-green-600 ring-2 ring-green-600/20 bg-green-50/40 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 text-green-700">
                    {t.icon}
                    <span className="text-sm font-semibold text-gray-900">{t.label}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-1">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Area */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs flex items-center justify-center font-bold">2</span>
              Which area?
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip on={level === 'organisation'} onClick={() => setLevel('organisation')}>Whole organisation</Chip>
              {estates.length > 0 && <Chip on={level === 'estate'} onClick={() => setLevel('estate')}>One estate</Chip>}
              <Chip on={level === 'blocks'} onClick={() => setLevel('blocks')}>Chosen blocks</Chip>
              {level === 'estate' && (
                <select className={selectCls} value={estate} onChange={e => setEstate(e.target.value)}>
                  {estates.map(x => <option key={x}>{x}</option>)}
                </select>
              )}
            </div>
            {level === 'blocks' && (
              <div className="rounded-xl border border-gray-200 p-3 space-y-2 bg-white">
                <input
                  value={blockQuery}
                  onChange={e => setBlockQuery(e.target.value)}
                  placeholder="Search blocks or estates by name or code"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                />
                {loading && !(plots || []).length ? (
                  <div className="text-xs text-gray-500">Loading the blocks…</div>
                ) : (plots || []).length === 0 ? (
                  <div className="text-xs text-gray-500">No individual blocks registered yet; select whole organisation.</div>
                ) : !blockList.length && !estateHits.length ? (
                  <div className="text-xs text-gray-500">No block or estate matches “{blockQuery}”.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {estateHits.map(([name, ids]) => {
                      const all = ids.every(id => blocks.includes(id));
                      return (
                        <Chip key={`estate-${name}`} on={all}
                          onClick={() => setBlocks(b => all ? b.filter(x => !ids.includes(x)) : [...new Set([...b, ...ids])])}>
                          All of {name} ({ids.length})
                        </Chip>
                      );
                    })}
                    {blockList.map(p => (
                      <Chip
                        key={p.id}
                        on={blocks.includes(p.id)}
                        onClick={() => setBlocks(b => b.includes(p.id) ? b.filter(x => x !== p.id) : [...b, p.id])}
                      >
                        {p.name || p.id}
                      </Chip>
                    ))}
                  </div>
                )}
                <div className="text-xs font-medium text-gray-500">{blocks.length} block{blocks.length === 1 ? '' : 's'} selected</div>
              </div>
            )}
          </div>

          {/* 3. Period & Agronomic Focus */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs flex items-center justify-center font-bold">3</span>
                Which observation period?
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip on={periodKind === 'month'} onClick={() => setPeriodKind('month')}>A month</Chip>
                <Chip on={periodKind === 'range'} onClick={() => setPeriodKind('range')}>Custom dates</Chip>
                {periodKind === 'month' ? (
                  <input type="month" className={selectCls} value={month} onChange={e => setMonth(e.target.value)} />
                ) : (
                  <div className="flex items-center gap-2">
                    <input type="date" className={selectCls} value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} />
                    <span className="text-xs text-gray-400">to</span>
                    <input type="date" className={selectCls} value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-gray-500 mr-1">Compare with:</span>
                <Chip on={compare === 'previous'} onClick={() => setCompare('previous')}>Previous period</Chip>
                <Chip on={compare === 'last_year'} onClick={() => setCompare('last_year')}>Same period last year</Chip>
                {type === 'compare' && estates.length > 1 && (
                  <Chip on={compare === 'estate'} onClick={() => setCompare('estate')}>Another estate</Chip>
                )}
                {compare === 'estate' && (
                  <select className={selectCls} value={compareEstate} onChange={e => setCompareEstate(e.target.value)}>
                    {estates.map(x => <option key={x}>{x}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs flex items-center justify-center font-bold">4</span>
                Focus
              </div>
              <p className="text-xs text-gray-500">What the advice should concentrate on.</p>
              <div className="flex flex-wrap gap-2">
                {FOCUS_AREAS.map(f => (
                  <Chip key={f.id} on={focusArea === f.id} onClick={() => setFocusArea(f.id)}>
                    {f.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          {/* Always in reach: sticks to the bottom of the screen while the choices scroll. */}
          <div className="space-y-3 pt-4 pb-2 border-t border-gray-100 sticky bottom-0 bg-white">
            <div className="space-y-2">
              <button
                onClick={create}
                disabled={busy || !canCreate}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-green-700 hover:bg-green-800 shadow-sm hover:shadow disabled:bg-gray-200 disabled:text-gray-500 transition-all"
              >
                <FileText size={16} />
                {busy ? 'Creating your report…' : 'Create report'}
              </button>
              <span className="block text-xs font-medium text-gray-500 text-center">
                {typesList.find(t => t.id === type)?.label} · {where} · {fmtDate(period.from)} – {fmtDate(period.to)}
              </span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <Sparkles size={14} className="text-green-700" />
              Built from your satellite images, weather and alerts
            </div>
          </div>
        </Card>
      )}

      </aside>

      {/* RIGHT: results */}
      <section className="min-w-0 space-y-8">
      {errorMsg && (
        <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800 flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} className="font-semibold text-red-900 shrink-0">Close</button>
        </div>
      )}
      {historyTab && (
        <Card className="p-6 space-y-4 no-print">
          <h3 className="text-lg font-bold text-gray-900">Past reports</h3>
          {history.length === 0 ? <p className="text-sm text-gray-500">No reports yet. Create one with the settings on the left.</p> : (
            <div className="divide-y divide-gray-100">
              {history.map((h, i) => (
                <div key={i} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{h.title || `${typesList.find(x => x.id === h.type)?.label || 'Report'}: ${h.where}`}</div>
                    <div className="text-xs text-gray-500">{fmtDate(h.period?.from)} – {fmtDate(h.period?.to)} · created {h.created ? new Date(h.created).toLocaleString() : 'recently'}</div>
                  </div>
                  <button onClick={() => { setReport(h); setHistoryTab(false); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-800 border border-green-200 hover:bg-green-100">Open <ChevronRight size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      {/* Generated Report View: the designed report as it prints */}
      {report && !historyTab && (
        <div id="fi-report" className="space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800">
              {kinds.find((k) => k.id === report.kind)?.label || typesList.find(t => t.id === report.type)?.label || 'Report'}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">{report.title || `${subject}: ${report.where}`}</h3>
            {report.period?.from && <div className="text-sm text-gray-500 mt-1">{fmtDate(report.period.from)} – {fmtDate(report.period.to)}</div>}
          </div>

          <DesignedReport key={report.report_id} reportId={report.report_id} fileName={`${(report.title || 'report').replace(/[^\w -]+/g, '').trim()} ${report.period?.to || ''}`.trim()} />

          <Card className="p-6 border-green-200 bg-white space-y-4 no-print">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <BrainCircuit size={16} className="text-green-700" />
              Ask the AI about this report
            </div>
            <p className="text-xs text-gray-600">Ask about water, fertiliser, or a block in this report.</p>
            <div className="flex items-center gap-2">
              <input
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && askAiOnReport()}
                placeholder="For example: which block should I visit first?"
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <button
                onClick={askAiOnReport}
                disabled={aiQuerying || !aiQuestion.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold disabled:bg-gray-200 disabled:text-gray-400 transition-all"
              >
                <Send size={14} /> Ask
              </button>
            </div>
            {aiAnswers.length > 0 && (
              <div className="space-y-3 pt-2">
                {aiAnswers.map((ans, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white border border-gray-200 text-sm space-y-1.5">
                    <div className="font-semibold text-gray-900">{ans.q}</div>
                    {ans.loading ? <AiThinking kind="report" /> : <AiAnswer text={ans.a} className="text-gray-700" />}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {!report && !historyTab && (
        <Card className="p-10 no-print">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center text-green-700"><FileText size={22} /></div>
            <h3 className="text-lg font-semibold text-gray-900">Your report will appear here</h3>
            <p className="text-sm text-gray-500">Pick the report, the area and the period on the left, then press Create report. It reads top to bottom:</p>
          </div>
          <ol className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {['How the farm is doing, in plain words', 'What to do next', 'The crop over the period', 'Rain and soil moisture', 'Where to walk', 'The farm grouped by condition and estate'].map((s, i) => (
              <li key={s} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700"><span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center">{i + 1}</span>{s}</li>
            ))}
          </ol>
        </Card>
      )}
      </section>
      </div>
    </div>
  );
}
