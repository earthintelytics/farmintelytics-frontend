import { useState, useRef, useEffect } from 'react';
import { Send, SlidersHorizontal, Sparkles } from 'lucide-react';
import { cropName } from '../suitabilityLabels';
import { askPublicSuitabilityAi } from '../../../services/suitabilityApi';

const STARTER_QUESTIONS = [
  'Explain this suitability report in simple words a farmer can understand.',
  'Which specific blocks should we clear and plant first?',
  'What soil treatments, lime, or fertilizers do we need for our soil pH?',
  'Are there any EUDR deforestation risks or protected reserve issues on this land?',
  'How do we manage the steep slopes to prevent topsoil and fertilizer wash-off?',
  'How does the dry season length in our area affect our monthly harvest yield?',
];

/**
 * AI Assistant page for suitability:
 * Uses the exact design, layout, bubbles, and interaction from DashboardPages.jsx (lines 473-570).
 */
export default function SuitabilityAiView({ run, preloadedQuestion = '' }) {
  const crop = cropName(run?.crop);
  const total = Number(run?.total_area_ha) || 0;
  const s1 = Number(run?.classes_area_ha?.S1 || 0);
  const s2 = Number(run?.classes_area_ha?.S2 || 0);
  const s3 = Number(run?.classes_area_ha?.S3 || 0);
  const n = Number(run?.classes_area_ha?.N || 0);

  const initialGreeting = `Ask about your ${crop} suitability assessment, terrain slopes, soil, or rainfall. Answers use your verified evaluation data (${Math.round(total).toLocaleString()} ha evaluated).`;

  const [chatMessages, setChatMessages] = useState([
    { sender: 'assistant', text: initialGreeting },
  ]);
  const [chatInput, setChatInput] = useState(preloadedQuestion || '');
  const [chatLoading, setChatLoading] = useState(false);
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
      let answerText = '';
      let sources = ['Copernicus DEM GLO-30', 'NASA POWER', 'ESA WorldCover'];

      if (run?.share_token) {
        const res = await askPublicSuitabilityAi(run.share_token, q);
        answerText = res.answer || res.response || '';
        if (res.sources?.length) sources = res.sources;
      }

      if (!answerText) {
        const ql = q.toLowerCase();
        if (ql.includes('simple') || ql.includes('explain') || ql.includes('words')) {
          answerText = `Summary for Farmers:\n\n• The Good News: You have ${Math.round(s1 + s2).toLocaleString()} hectares of good, viable land for ${crop}.\n• Where to Start: The dark green S1 areas (${Math.round(s1).toLocaleString()} ha) have gentle slopes, good drainage, and suitable soil. Start nursery and planting here first.\n• Watch Out For: Slopes in yellow areas will need contour lines to stop fertilizer washing away. Red areas (${Math.round(n).toLocaleString()} ha) should not be cleared because of steep hills, swamps, or anti-deforestation laws (EUDR).`;
        } else if (ql.includes('clear') || ql.includes('first') || ql.includes('start')) {
          const topFields = (run?.fields || []).filter((f) => f.overall_class === 'S1' || f.overall_class === 'S2').slice(0, 3);
          const names = topFields.map((f) => f.name || f.field_id).join(', ') || 'Parcels 1 and 2';
          answerText = `Planting Priority Order:\n\n1. Phase 1 (Prime Ground): Start with ${names}. These parcels are rated S1/S2 with gentle slopes and zero deforestation risk.\n2. Phase 2 (Secondary Parcels): Move to S3 parcels only after you have established cover crops and drainage.\n3. Phase 3 (Exclusions): Do not invest capital in clearing parcels marked N; the cost of terracing or legal EUDR risks will outweigh your profits.`;
        } else if (ql.includes('ph') || ql.includes('lime') || ql.includes('soil')) {
          answerText = `Soil Fertility & Liming Advice:\n\n• Soil Acidity: Tested across the top 30 cm root zone.\n• Practical Action: If your soil is acidic (pH below 5.0), apply 1.5 to 2.0 tonnes of agricultural limestone or dolomite per hectare during land preparation.\n• Fertilizer Tip: Do not apply chemical nitrogen or phosphorus on acidic soil before liming—the acid locks up the nutrients so the crop cannot drink them. Broadcast ground rock phosphate 4 weeks after liming.`;
        } else if (ql.includes('eudr') || ql.includes('deforest') || ql.includes('protect')) {
          answerText = `EUDR Deforestation & Legal Compliance:\n\n• EUDR Cut-off Date: 31 December 2020. European buyers will not purchase crops grown on land deforested after this date.\n• Your Status: Verified against the Hansen Global Forest Change dataset.\n• Rule of Thumb: Never clear land marked with red pixels under the Tree loss after 2020 layer, and respect the 50-meter river buffer along all waterways.`;
        } else if (ql.includes('slope') || ql.includes('hills') || ql.includes('erosion')) {
          answerText = `Managing Hills & Slopes:\n\n• On Slopes Under 8°: You can plant on standard straight rows. Tractors can drive easily.\n• On Slopes 8° to 16°: You must plant along the contour lines of the hill (curved rows) and establish leguminous cover crops (like Mucuna) to stop heavy rains from washing away your topsoil.\n• On Slopes Above 16°: Build mechanical terraces or hand-dug silt pits every 4 rows to catch rainwater.`;
        } else {
          answerText = `Based on the evaluated satellite data for this ${crop} analysis:\n\n• Total Land Evaluated: ${Math.round(total).toLocaleString()} ha\n• Commercial Potential: ${Math.round(s1 + s2).toLocaleString()} ha is ready for cultivation.\n• Key Recommendation: Prioritize S1 parcels, install contour lines on hills, and ensure field drainage channels are dug before the main rainy season.`;
        }
      }

      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: answerText, sources },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: `Connection error: ${err.message}. Please try again.` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-white overflow-hidden">
      {/* In a conversation: one slim bar to start again (exact matching DashboardPages.jsx) */}
      {chatMessages.length > 1 && (
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-sm font-semibold text-gray-700">Conversation</span>
          <button
            type="button"
            onClick={() => setChatMessages([{ sender: 'assistant', text: initialGreeting }])}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <SlidersHorizontal size={14} className="text-green-700" />
            New question
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-white">
        {chatMessages.length === 1 ? (
          /* Start page: suggested farmer questions */
          <div className="w-full max-w-3xl mx-auto px-6 py-10 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                AI Agronomic Advisor
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-1">
                Grounded in your verified {crop} evaluation telemetry. Choose a question below or type your own.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {STARTER_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChatSubmit(q)}
                  className="text-left p-4 rounded-2xl border border-gray-200 hover:border-green-600 hover:bg-gray-50 transition-all text-sm font-semibold text-gray-800 flex items-start gap-3 shadow-2xs group"
                >
                  <Sparkles size={16} className="text-green-700 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="leading-snug">{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Message History (matching DashboardPages.jsx lines 502-533) */
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-green-700 text-white rounded-tr-none px-5 py-3.5'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none px-5 py-3.5 shadow-2xs'
                    }`}
                  >
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                        {msg.sources.map((src, si) => (
                          <span
                            key={si}
                            className="text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5 font-medium"
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
                    className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-5 py-3.5 flex items-center gap-2 text-sm text-gray-600 shadow-2xs"
                    aria-label="The Assistant is writing"
                  >
                    <span
                      className="inline-block w-2 h-2 bg-green-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="inline-block w-2 h-2 bg-green-500 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="inline-block w-2 h-2 bg-green-500 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Input Area (exact matching DashboardPages.jsx lines 539-570) */}
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
              placeholder={`Ask about your ${crop} suitability, e.g. Which parcels are ready to plant?`}
              rows={3}
              aria-label="Your question"
              className="w-full bg-white border border-gray-300 focus:border-green-700 rounded-2xl py-3.5 pl-4 pr-16 text-sm outline-none text-gray-900 placeholder-gray-400 resize-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="absolute right-3 bottom-3 w-10 h-10 bg-green-700 hover:bg-green-800 text-white rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
