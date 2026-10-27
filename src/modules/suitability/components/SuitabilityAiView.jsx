import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ArrowRight, Plus, SlidersHorizontal, Sliders } from 'lucide-react';
import { cropName } from '../suitabilityLabels';
import { askPublicSuitabilityAi, askSuitabilityRun } from '../../../services/suitabilityApi';

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
    { id: 'confidence', title: 'How sure is this result', desc: 'Which values were measured on site and which come from global maps.',
      requiredData: 'Data sources and gaps of this analysis', question: 'How reliable is this result? Which values come from global maps and which from our own data, what is missing, and what field checks would make it surer?' },
  ];
};

/**
 * AI Assistant page for Suitability matching Screenshot 3 & dynamic What-If simulation.
 */
export default function SuitabilityAiView({ run, preloadedQuestion = '' }) {
  const crop = cropName(run?.crop);
  const total = Number(run?.total_area_ha) || 0;

  const initialGreeting = `Ask about this ${crop.toLowerCase()} analysis: what limits the land, where to plant, what would change with irrigation or lime. Answers use this analysis only (${Math.round(total).toLocaleString()} ha analysed).`;
  const scenarios = questionsFor(run, crop);

  const [chatMessages, setChatMessages] = useState([
    { sender: 'assistant', text: initialGreeting },
  ]);
  const [chatInput, setChatInput] = useState(preloadedQuestion || '');
  const [chatLoading, setChatLoading] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (preloadedQuestion) {
      setChatInput(preloadedQuestion);
    }
  }, [preloadedQuestion]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleChatSubmit = async (textToSend) => {
    const q = (textToSend || chatInput).trim();
    if (!q || chatLoading) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Real AI only, answering from this result; never a made-up answer (the old local "synthesis" invented figures).
      const res = run?.share_token
        ? await askPublicSuitabilityAi(run.share_token, q)
        : await askSuitabilityRun(run?.run_id, q, run?.company_id);
      const sources = (res?.sources?.length ? res.sources : (run?.sources || []).map((x) => x?.name).filter(Boolean));
      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: res?.answer || res?.response || 'No answer came back. Try again.', sources },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: err.message || 'The AI could not answer just now. Try again in a moment.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-white overflow-hidden font-sans">
      {/* If conversation active: top bar to reset */}
      {chatMessages.length > 1 && (
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">Questions about this analysis</span>
          </div>
          <button
            type="button"
            onClick={() => setChatMessages([{ sender: 'assistant', text: initialGreeting }])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-xs"
          >
            <SlidersHorizontal size={13} className="text-green-700" />
            <span>New question or what-if</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-white">
        {chatMessages.length === 1 ? (
          /* ── START PAGE (Matches Screenshot 3) ── */
          <div className="w-full max-w-4xl mx-auto px-6 lg:px-8 py-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-gray-900 tracking-tight">
                  Ask, or try a what-if
                </h2>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl font-medium">
                  Type a question below, or pick one. Answers use this analysis only: its maps, scores and sources.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 inline-flex items-center gap-1.5 shrink-0 transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} className="text-green-700" />
                <span>Describe your own</span>
              </button>
            </div>

            {/* 2-Column Grid of What-If Cards (Matches Screenshot 3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {scenarios.map((s) => (
                <div
                  key={s.id}
                  className="min-w-0 text-left p-5 bg-white border border-gray-200 hover:border-green-600 rounded-2xl flex flex-col gap-3 group transition-all shadow-2xs hover:shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-700 shrink-0">
                      <Sparkles size={16} />
                    </span>
                    <span className="text-sm font-bold text-gray-900">{s.title}</span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>

                  <div className="w-full min-w-0 mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 flex-1 text-gray-400 truncate text-[11px]">
                      Uses: {s.requiredData}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChatSubmit(s.question)}
                      className="flex items-center gap-1 font-semibold text-green-800 hover:text-green-950 shrink-0 text-xs cursor-pointer group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Set up</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── ACTIVE CHAT MESSAGE HISTORY (Matches Screenshot 3) ── */
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-green-700 text-white rounded-tr-none px-5 py-3.5 shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none px-5 py-3.5 shadow-2xs'
                    }`}
                  >
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 font-semibold mr-1">Data sources:</span>
                        {msg.sources.map((src, si) => (
                          <span
                            key={si}
                            className="text-[10px] bg-green-50 text-green-800 border border-green-200 rounded-full px-2 py-0.5 font-medium"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div
                    className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-5 py-3.5 flex items-center gap-2 text-xs text-gray-600 shadow-2xs"
                    aria-label="The Assistant is calculating"
                  >
                    <span
                      className="inline-block w-2 h-2 bg-green-600 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="inline-block w-2 h-2 bg-green-600 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="inline-block w-2 h-2 bg-green-600 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                    <span className="text-gray-500 font-medium ml-1">Reading this analysis…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM CHAT BAR (Matches Screenshot 3) ── */}
      <div className="bg-white px-6 py-4 border-t border-gray-100 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleChatSubmit();
            }}
            className="relative flex flex-col"
          >
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSubmit();
                }
              }}
              placeholder="Ask about this land, e.g. Which fields are best for planting, and what limits the rest?"
              rows={3}
              aria-label="Your question"
              className="w-full bg-white border border-gray-300 focus:border-green-700 rounded-2xl py-3.5 pl-4 pr-16 text-xs sm:text-sm outline-none text-gray-900 placeholder-gray-400 resize-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="absolute right-3 bottom-3 w-10 h-10 bg-green-700 hover:bg-green-800 text-white rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* ── MODAL: DESCRIBE YOUR OWN WHAT-IF ── */}
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
                  handleChatSubmit(q);
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
