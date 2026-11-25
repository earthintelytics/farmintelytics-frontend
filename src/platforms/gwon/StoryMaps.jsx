/**
 * GWON story maps (prototype): tell a story in chapters, each with words, a map (a state, a layer, a date) and,
 * if wanted, a chart from GWON's data. Read it as a scrolling story: the map changes as each chapter comes into
 * view. Stories are kept in this browser; "Copy share link" puts the whole story in the link, so anyone with the
 * link can read it (no account needed).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Plus, Trash2, Eye, Pencil, Link2, ArrowUp, ArrowDown, BookOpenText } from 'lucide-react';
import { LAYERS, ORDER, GIBS_WMS, tileUrl, periodOf, ndviDate } from './layers';
import SeriesChart from './SeriesChart';
import { useConfirm } from '../../components/ConfirmProvider';

const KEY = 'gwon_stories';
const today = () => new Date().toISOString().slice(0, 10);
const newChapter = () => ({ title: 'A new chapter', text: '', state: 'all', layer: 'ndvi', date: ndviDate(new Date()), chart: 'none' });
const newStory = () => ({ id: Math.random().toString(36).slice(2, 9), title: 'Untitled story', author: '', made: today(), chapters: [newChapter()] });
const CHARTS = [['none', 'No chart'], ['spi3', 'SPI-3, last 5 years'], ['spei12', 'SPEI-12, since 1991'], ['rain', 'Rain each year']];

const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
const storyFromLink = () => { try { const m = window.location.hash.match(/[?&]story=([^&]+)/); return m ? dec(m[1]) : null; } catch { return null; } };

function Fly({ feature, all }) {
  const map = useMap();
  useEffect(() => { const d = feature || all; if (d) { try { map.flyToBounds(L.geoJSON(d).getBounds(), { padding: [24, 24], duration: 1.2 }); } catch { /* empty */ } } }, [feature, all, map]);
  return null;
}

function ChapterMap({ ch, states, dark }) {
  const l = LAYERS[ch.layer];
  const day = !l ? null : 'fixed' in l ? l.fixed : l.time === 'period' ? periodOf(ch.date) : ch.date;
  const feature = ch.state !== 'all' ? (states?.features || []).find((f) => f.properties.state === ch.state) : null;
  return (
    <MapContainer center={[11.8, 9]} zoom={6} style={{ height: '100%' }} zoomControl={false} scrollWheelZoom={false}>
      <TileLayer url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${dark ? 'Dark' : 'Light'}_Gray_Base/MapServer/tile/{z}/{y}/{x}`} attribution="Esri" />
      {l && (l.kind === 'wms'
        ? <WMSTileLayer key={`${ch.layer}-${day}`} url={GIBS_WMS} params={{ layers: l.id, format: 'image/png', transparent: true, time: day }} opacity={0.9} />
        : <TileLayer key={`${ch.layer}-${day}`} url={tileUrl(ch.layer, l.kind === 'xyz' ? null : day)} maxNativeZoom={l.level} maxZoom={13} opacity={0.88} className={l.coarse ? 'gwon-soft' : ''} />)}
      {states && <GeoJSON key={`s-${ch.state}`} data={states} style={(f) => ({ color: f.properties.state === ch.state ? '#0E2D41' : '#007248', weight: f.properties.state === ch.state ? 3 : 1.2, fill: false })} />}
      <Fly feature={feature} all={states} />
    </MapContainer>
  );
}

function ChapterChart({ ch, indices, series }) {
  if (ch.chart === 'none') return null;
  const names = ch.state === 'all' ? Object.keys(indices?.states || {}) : [ch.state];
  const avg = (xs) => { const v = xs.filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  if (ch.chart === 'rain') {
    const s = series?.states; if (!s) return null;
    const first = s[names[0]]; if (!first) return null;
    return <SeriesChart series={[{ name: 'Rain each year', color: '#2563EB', points: first.annual.map((r, i) => [r.year, avg(names.map((n) => s[n]?.annual[i]?.rain))]) }]} unit="mm" digits={0} height={170} csvName={`story-rain-${ch.state}`} xLabel="year" />;
  }
  const s = indices?.states; if (!s) return null;
  const first = s[names[0]]; if (!first) return null;
  let pts = first.month.map((m, i) => [m, avg(names.map((n) => s[n]?.[ch.chart]?.[i]))]);
  if (ch.chart === 'spi3') pts = pts.slice(-60);
  return <SeriesChart series={[{ name: ch.chart.toUpperCase(), color: '#007248', points: pts }]} bars colorOf={(v) => (v <= -1.5 ? '#EA580C' : v <= -1 ? '#FBBF24' : v >= 1 ? '#3B82F6' : '#D1D5DB')} xFmt={(m) => m.slice(0, 4)} digits={2} height={170} csvName={`story-${ch.chart}-${ch.state}`} xLabel="month" />;
}

function Reader({ story, states, dark, indices, series, onEdit }) {
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.i)); }), { rootMargin: '-45% 0px -45% 0px' });
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [story]);
  const ch = story.chapters[active] || story.chapters[0];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,440px)_1fr] gap-4">
      <div className="space-y-4 order-2 lg:order-1">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#007248]">Story map</p>
          <h2 className="font-display text-2xl font-semibold text-gray-900">{story.title}</h2>
          <p className="text-xs text-gray-500 mt-1">{story.author ? `${story.author} · ` : ''}{story.made} · {story.chapters.length} chapters · GreenWall Observatory Nigeria</p>
          {onEdit && <button type="button" onClick={onEdit} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#007248]"><Pencil size={14} /> Edit</button>}
        </div>
        {story.chapters.map((c, i) => (
          <section key={i} ref={(el) => { refs.current[i] = el; }} data-i={i} className={`rounded-2xl border bg-white p-5 min-h-[55vh] ${i === active ? 'border-[#007248]' : 'border-gray-200'}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Chapter {i + 1} · {c.state === 'all' ? 'The frontline' : c.state} · {LAYERS[c.layer]?.name}{'fixed' in (LAYERS[c.layer] || {}) ? '' : ` · ${c.date}`}</p>
            <h3 className="font-display text-xl font-semibold text-gray-900 mt-1">{c.title}</h3>
            <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{c.text || ' '}</p>
            <div className="mt-3"><ChapterChart ch={c} indices={indices} series={series} /></div>
          </section>
        ))}
        <div className="h-[30vh]" />
      </div>
      <div className="order-1 lg:order-2 lg:sticky lg:top-[170px] self-start rounded-2xl overflow-hidden border border-gray-200 h-[45vh] lg:h-[calc(100vh-200px)]">
        <ChapterMap ch={ch} states={states} dark={dark} />
      </div>
    </div>
  );
}

export default function StoryMaps({ states, dark, series, canSave = true }) {
  const confirm = useConfirm();
  const [indices, setIndices] = useState(null);
  useEffect(() => { fetch('/gwon-data/drought_indices.json').then((r) => r.json()).then(setIndices).catch(() => setIndices(null)); }, []);
  const shared = useMemo(() => storyFromLink(), []);
  const [list, setList] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } });
  const [cur, setCur] = useState(shared ? -1 : null);         // -1: a shared story; null: the list; else an index
  const [mode, setMode] = useState(shared ? 'read' : 'list');
  const [msg, setMsg] = useState('');
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage unavailable */ } }, [list]);
  const story = cur === -1 ? shared : list[cur];
  const set = (patch) => setList((l) => l.map((s, i) => (i === cur ? { ...s, ...patch } : s)));
  const setCh = (k, patch) => set({ chapters: story.chapters.map((c, i) => (i === k ? { ...c, ...patch } : c)) });
  const move = (k, d) => { const c = [...story.chapters]; const j = k + d; if (j < 0 || j >= c.length) return; [c[k], c[j]] = [c[j], c[k]]; set({ chapters: c }); };
  const share = async (s) => {
    const url = `${window.location.origin}/platforms/gwon#reports/stories?story=${enc(s)}`;
    try { await navigator.clipboard.writeText(url); setMsg('Share link copied. Anyone with it can read the story.'); } catch { setMsg(url); }
  };
  const names = (states?.features || []).map((f) => f.properties.state).sort();
  const inputCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#007248]';

  if (mode === 'read' && story) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setMode('list'); setCur(null); if (cur === -1) window.history.replaceState(null, '', '#reports/stories'); }} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700">All stories</button>
          <button type="button" onClick={() => share(story)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700"><Link2 size={15} /> Copy share link</button>
          {cur === -1 && canSave && <button type="button" onClick={() => { setList((l) => [...l, { ...shared, id: Math.random().toString(36).slice(2, 9) }]); setMsg('Saved to your stories.'); }} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700">Save a copy</button>}
        </div>
        {msg && <p className="text-sm rounded-xl border border-[#A9D9BF] bg-[#E8F5EE] text-[#0E2D41] px-4 py-2.5 break-all">{msg}</p>}
        <Reader story={story} states={states} dark={dark} indices={indices} series={series} onEdit={cur >= 0 ? () => setMode('edit') : null} />
      </div>
    );
  }

  if (mode === 'edit' && story) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode('list')} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700">All stories</button>
          <button type="button" onClick={() => setMode('read')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#007248] text-white text-sm font-semibold"><Eye size={15} /> Read it</button>
          <button type="button" onClick={() => share(story)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700"><Link2 size={15} /> Copy share link</button>
        </div>
        {msg && <p className="text-sm rounded-xl border border-[#A9D9BF] bg-[#E8F5EE] text-[#0E2D41] px-4 py-2.5 break-all">{msg}</p>}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1"><span className="text-xs font-semibold text-gray-600">Title</span><input value={story.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} /></label>
          <label className="space-y-1"><span className="text-xs font-semibold text-gray-600">By</span><input value={story.author} onChange={(e) => set({ author: e.target.value })} className={inputCls} placeholder="Your name or office" /></label>
        </div>
        {story.chapters.map((c, k) => (
          <div key={k} className="rounded-2xl border border-gray-200 bg-white p-4 grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#007248]">Chapter {k + 1}</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(k, -1)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Move up"><ArrowUp size={15} /></button>
                  <button type="button" onClick={() => move(k, 1)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Move down"><ArrowDown size={15} /></button>
                  {story.chapters.length > 1 && <button type="button" onClick={() => set({ chapters: story.chapters.filter((_, i) => i !== k) })} className="p-1.5 rounded-lg hover:bg-gray-100 text-red-700" aria-label="Remove chapter"><Trash2 size={15} /></button>}
                </div>
              </div>
              <input value={c.title} onChange={(e) => setCh(k, { title: e.target.value })} className={`${inputCls} font-semibold`} aria-label="Chapter title" />
              <textarea value={c.text} onChange={(e) => setCh(k, { text: e.target.value })} rows={5} className={inputCls} placeholder="What should the reader see here? Say where the figures come from." aria-label="Chapter text" />
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1"><span className="text-[11px] font-semibold text-gray-600">Place</span>
                  <select value={c.state} onChange={(e) => setCh(k, { state: e.target.value })} className={inputCls}><option value="all">The frontline</option>{names.map((n) => <option key={n}>{n}</option>)}</select></label>
                <label className="space-y-1"><span className="text-[11px] font-semibold text-gray-600">Map layer</span>
                  <select value={c.layer} onChange={(e) => setCh(k, { layer: e.target.value })} className={inputCls}>{ORDER.map((x) => <option key={x} value={x}>{LAYERS[x].name}</option>)}</select></label>
                <label className="space-y-1"><span className="text-[11px] font-semibold text-gray-600">Date</span>
                  <input type="date" value={c.date} min="2015-01-01" max={today()} disabled={'fixed' in (LAYERS[c.layer] || {})} onChange={(e) => e.target.value && setCh(k, { date: e.target.value })} className={`${inputCls} disabled:opacity-50`} /></label>
                <label className="space-y-1"><span className="text-[11px] font-semibold text-gray-600">Chart</span>
                  <select value={c.chart} onChange={(e) => setCh(k, { chart: e.target.value })} className={inputCls}>{CHARTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200 h-[280px]"><ChapterMap ch={c} states={states} dark={dark} /></div>
          </div>
        ))}
        <button type="button" onClick={() => set({ chapters: [...story.chapters, { ...newChapter(), state: story.chapters[story.chapters.length - 1]?.state || 'all' }] })} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-700"><Plus size={15} /> Add a chapter</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#A9D9BF] bg-[#F1F9F4] p-4 text-sm text-gray-700">
        Tell the Great Green Wall’s story in chapters: words, a map of the place and the layer at the date that matters, and a chart from GWON’s data. Share it with a link. In this prototype stories are kept in this browser.
      </div>
      <button type="button" onClick={() => { setList((l) => [...l, newStory()]); setCur(list.length); setMode('edit'); }} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#007248] text-white text-sm font-semibold"><Plus size={16} /> New story</button>
      {list.length === 0 ? <p className="text-sm text-gray-600">No stories yet.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((s, i) => (
            <div key={s.id} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
              <p className="flex items-center gap-2 font-semibold text-gray-900"><BookOpenText size={16} className="text-[#007248]" /> {s.title}</p>
              <p className="text-xs text-gray-500">{s.chapters.length} chapters · {s.made}{s.author ? ` · ${s.author}` : ''}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={() => { setCur(i); setMode('read'); }} className="px-3 py-1.5 rounded-lg bg-[#007248] text-white text-xs font-semibold">Read</button>
                <button type="button" onClick={() => { setCur(i); setMode('edit'); }} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700">Edit</button>
                <button type="button" onClick={() => share(s)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700">Share link</button>
                <button type="button" onClick={async () => { if (await confirm(`Delete the story “${s.title}”?`, { action: 'Delete' })) setList((l) => l.filter((_, j) => j !== i)); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {msg && <p className="text-sm rounded-xl border border-[#A9D9BF] bg-[#E8F5EE] text-[#0E2D41] px-4 py-2.5 break-all">{msg}</p>}
    </div>
  );
}
