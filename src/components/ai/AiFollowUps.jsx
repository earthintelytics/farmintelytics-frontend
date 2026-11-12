import { CornerDownRight } from 'lucide-react';

/**
 * The next questions the advisor offers under its answer ("You could ask next"), as buttons that ask them.
 * Shared by every advisor: the crop dashboard's Assistant, the advisor app and the suitability AI.
 */
export default function AiFollowUps({ questions, onAsk, disabled = false }) {
  if (!questions?.length) return null;
  return (
    <div className="pt-1">
      <p className="text-xs font-medium text-gray-500 mb-1.5">You could ask next</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button key={q} type="button" disabled={disabled} onClick={() => onAsk(q)}
            className="inline-flex items-start gap-1.5 text-left text-sm px-3 py-1.5 rounded-xl border border-green-200 bg-green-50/60 text-green-900 hover:bg-green-50 disabled:opacity-50">
            <CornerDownRight size={14} className="mt-0.5 shrink-0" />{q}
          </button>
        ))}
      </div>
    </div>
  );
}
