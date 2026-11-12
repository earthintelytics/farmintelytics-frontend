import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

/**
 * "Questions I can answer": the questions this advisor can answer for this farm, by topic (made from its own
 * data by the backend, agent/suggestions.py: [{title, questions}]). A row of topics, then that topic's
 * questions; one column on a phone. Shown open on an empty chat (`asList`), and behind a button above the
 * question box once the conversation has started. Takes a flat `questions` list when there are no topics.
 * Shared by every advisor.
 */
export default function QuestionsICanAnswer({ groups, questions, onAsk, disabled = false, asList = false }) {
  const topics = groups?.length ? groups : (questions?.length ? [{ title: 'Suggested', questions }] : []);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(0);
  if (!topics.length) return null;
  const current = topics[Math.min(topic, topics.length - 1)];

  const body = (
    <div className="space-y-3">
      {topics.length > 1 && (
        <div role="tablist" aria-label="Topics" className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5 [scrollbar-width:none]">
          {topics.map((g, i) => (
            <button key={g.title} type="button" role="tab" aria-selected={g === current} onClick={() => setTopic(i)}
              className={`shrink-0 whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full border ${
                g === current ? 'bg-green-700 border-green-700 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {g.title}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {current.questions.map((q) => (
          <button key={q} type="button" disabled={disabled} onClick={() => { setOpen(false); onAsk(q); }}
            className="min-w-0 text-left text-sm leading-snug px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-green-600 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 break-words">
            {q}
          </button>
        ))}
      </div>
    </div>
  );

  if (asList) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"><Lightbulb size={16} className="text-green-700" />Questions I can answer</p>
        {body}
      </div>
    );
  }
  return (
    <div className="pb-2">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50">
        <Lightbulb size={14} className="text-green-700" />Questions I can answer{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div className="mt-2 max-h-[45vh] overflow-y-auto">{body}</div>}
    </div>
  );
}
