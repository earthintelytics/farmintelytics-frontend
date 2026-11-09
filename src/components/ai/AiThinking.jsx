import { useEffect, useState } from 'react';
import { CloudSun, FileText, Layers, Map, PenLine, Satellite, Sprout, Tractor } from 'lucide-react';

/**
 * While the AI works: what it is doing, in farm words, changing every couple of seconds, so nobody is left
 * staring at a spinner. The steps describe what the advisor reads for that kind of question; the last one
 * stays until the answer arrives.
 */
const STEPS = {
  farm: [
    [Tractor, 'Going out to your farm'],
    [Satellite, 'Reading the latest satellite pictures'],
    [Sprout, 'Checking how each field is growing'],
    [Map, 'Looking at the weak patches to visit'],
    [CloudSun, 'Checking the rain and weather'],
    [PenLine, 'Writing your answer'],
  ],
  suitability: [
    [Layers, 'Opening the suitability analysis'],
    [Map, 'Reading the soil, slope and water maps'],
    [Sprout, 'Checking what the crop needs'],
    [PenLine, 'Writing your answer'],
  ],
  report: [
    [FileText, 'Reading the report'],
    [Satellite, 'Checking the figures behind it'],
    [PenLine, 'Writing your answer'],
  ],
};

export default function AiThinking({ kind = 'farm', className = '' }) {
  const steps = STEPS[kind] || STEPS.farm;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 2200);
    return () => clearInterval(t);
  }, [steps.length]);
  const [Icon, text] = steps[i];
  return (
    <div role="status" aria-live="polite" className={`inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 ${className}`}>
      <Icon size={16} className="shrink-0 text-[var(--brand-primary)] animate-pulse" aria-hidden="true" />
      <span>{text}…</span>
    </div>
  );
}
