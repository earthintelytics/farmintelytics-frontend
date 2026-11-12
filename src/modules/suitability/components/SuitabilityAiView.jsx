import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Plus, Sliders } from 'lucide-react';
import { cropName } from '../suitabilityLabels';
import { askPublicSuitabilityAi, askSuitabilityRun, fetchSuitabilitySuggestions } from '../../../services/suitabilityApi';
import AdvisorChat from '../../../components/ai/AdvisorChat';

/**
 * Questions for land that is not planted yet, built from this analysis: the crop, what limits the land,
 * what was left out, and how sure the result is. Each answer comes from the analysis alone.
 */
const questionsFor = (run, crop) => {
  const c = crop.toLowerCase();
  const excluded = Object.keys(run?.excluded_area_ha || {});
  const layers = run?.layers || [];
  return [
    { id: 'limits', title: 'What limits this land most', desc: `Which factor holds back ${c} on each part of the land, and where.`,
      requiredData: 'Every factor scored in this analysis', question: `Which factors limit ${c} on this land the most, where are those areas, and how many hectares does each factor hold back?` },
    { id: 'best', title: 'Where to plant first', desc: 'The best-suited fields and how many hectares are ready to plant.',
      requiredData: 'Final suitability per field', question: `Which fields are best suited to ${c}, how many hectares are well suited or suited, and which fields should be planted first?` },
    ...(layers.includes('rainfall') || layers.includes('dry_season') ? [{ id: 'irrigation', title: 'What irrigation would change',
      desc: 'If water were added in the dry months, how much more land would be suited.',
      requiredData: 'Rainfall and dry months', question: `Where rainfall or the dry season limits ${c}, how many hectares would move to a better class with irrigation, and how much water would that need?` }] : []),
    ...(layers.includes('soil_ph') ? [{ id: 'lime', title: 'Would liming fix the soil',
      desc: 'Where soil acidity limits the crop, and what correcting it would gain.',
      requiredData: 'Soil pH (and any soil samples uploaded)', question: `Where does soil pH limit ${c}, would liming correct it, and how many hectares would improve if it did?` }] : []),
    ...(excluded.length ? [{ id: 'excluded', title: 'Land left out, and why', desc: `${excluded.join(', ')}: which areas, how large, and what that means for planting.`,
      requiredData: 'Forest in 2020, forest loss, protected areas, water', question: 'Which land was left out of this analysis, for what reason, how many hectares in each case, and what does that mean for the EUDR rules?' }] : []),
  ];
};

/**
 * AI Assistant page for Suitability matching Screenshot 3 & dynamic What-If simulation.
 */
export default function SuitabilityAiView({ run, preloadedQuestion = '' }) {
  const crop = cropName(run?.crop);
  const scenarios = questionsFor(run, crop);

  const [messages, setMessages] = useState([]);   // [{ role, text, followUps?, error? }]
  const [busy, setBusy] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [suggestions, setSuggestions] = useState({ suggestions: [], groups: [] });   // questions the AI can answer about this result

  useEffect(() => {
    let live = true;
    fetchSuitabilitySuggestions(run).then((s) => { if (live) setSuggestions(s); }).catch(() => {});
    return () => { live = false; };
  }, [run]);

  const ask = async (q) => {
    if (!q || busy) return;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setBusy(true);
    try {
      // Real AI only, answering from this result; never a made-up answer.
      const res = run?.share_token
        ? await askPublicSuitabilityAi(run.share_token, q)
        : await askSuitabilityRun(run?.run_id, q, run?.company_id);
      setMessages((prev) => [...prev, { role: 'assistant', text: res?.answer || res?.response || 'No answer came back. Try again.', followUps: res?.follow_ups || [] }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', error: true, text: err.message || 'The AI could not answer just now. Try again in a moment.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-white overflow-hidden font-sans">
      <AdvisorChat
        messages={messages} busy={busy} onAsk={ask} onNew={() => setMessages([])}
        groups={suggestions.groups} suggestions={suggestions.suggestions}
        about={`${crop} suitability`} thinkingKind="suitability" prefill={preloadedQuestion}
        placeholder="Ask about this land, e.g. Which fields are best for planting?"
        intro={(
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-gray-900 tracking-tight">Ask, or try a what-if</h2>
              <p className="text-sm text-gray-500 mt-1">Type a question below, or pick one. Answers use this analysis only.</p>
            </div>
            <button type="button" onClick={() => setShowCustomModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
              <Plus size={14} className="text-green-700" /><span>Describe your own what-if</span>
            </button>
          </div>
        )}
        extra={scenarios.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">What-ifs for this land</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenarios.map((s) => (
                <button key={s.id} type="button" onClick={() => ask(s.question)}
                  className="min-w-0 text-left p-4 bg-white border border-gray-200 hover:border-green-600 rounded-2xl flex flex-col gap-2 group transition-colors">
                  <span className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-700 shrink-0"><Sparkles size={16} /></span>
                    <span className="text-sm font-bold text-gray-900">{s.title}</span>
                  </span>
                  <span className="text-xs text-gray-600 leading-relaxed">{s.desc}</span>
                  <span className="flex items-center justify-end gap-1 text-xs font-semibold text-green-800 group-hover:text-green-950">
                    Ask now<ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      />

      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Sliders size={18} className="text-green-700" />
                <span>Describe your own what-if</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Describe a change to the land or how it would be farmed. The answer uses this analysis (30 m maps of
              terrain, soil, rainfall and flooding) to say which areas would change class.
            </p>
            <textarea
              rows={4}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. What if we install borehole irrigation on the northern plots and lime the soil to pH 5.5? How many hectares become S1?"
              className="w-full text-xs sm:text-sm p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-green-600 resize-none"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!customPrompt.trim()}
                onClick={() => {
                  const q = customPrompt.trim();
                  setShowCustomModal(false);
                  setCustomPrompt('');
                  ask(q);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
              >
                Run What-If Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
