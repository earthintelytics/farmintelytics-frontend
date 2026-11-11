import { Loader2 } from 'lucide-react';

/** A turning wheel in the middle of the screen while a report is being prepared. */
export default function ReportLoading({ text = 'Preparing the report…' }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/70" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-8 py-6">
        <Loader2 size={34} className="animate-spin text-green-700" aria-hidden="true" />
        <p className="text-sm font-medium text-gray-700">{text}</p>
        <p className="text-xs text-gray-500">Large areas take a little longer.</p>
      </div>
    </div>
  );
}
