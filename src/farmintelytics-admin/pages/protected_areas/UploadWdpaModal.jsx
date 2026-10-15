import { X } from 'lucide-react';

export default function UploadWdpaModal({
  isOpen,
  onClose,
  onSubmit,
  uploadFile,
  setUploadFile,
  sourceVersion,
  setSourceVersion,
  marginKm,
  setMarginKm,
  uploading,
  uploadCounts,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-gray-900">Upload WDPA shapefile archive</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Upload official Protected Planet release zip (polygons only). Official records are upserted without overwriting hand-drawn manual areas.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Shapefile ZIP Archive
            </label>
            <input
              type="file"
              accept=".zip"
              required
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Dataset Version
              </label>
              <input
                type="text"
                value={sourceVersion}
                onChange={(e) => setSourceVersion(e.target.value)}
                placeholder="e.g. Oct2026"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Client AOI Margin (km)
              </label>
              <input
                type="number"
                value={marginKm}
                onChange={(e) => setMarginKm(e.target.value)}
                min={0}
                max={500}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
          </div>

          {uploadCounts && (
            <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1 border border-gray-200">
              <p className="font-semibold text-gray-800">Import report:</p>
              <p>Created: <span className="font-mono font-medium">{uploadCounts.created}</span></p>
              <p>Updated: <span className="font-mono font-medium">{uploadCounts.updated}</span></p>
              <p>Manual protected: <span className="font-mono font-medium">{uploadCounts.skipped_manual}</span></p>
              <p>Outside AOI: <span className="font-mono font-medium">{uploadCounts.skipped_outside}</span></p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={uploading || !uploadFile}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
            >
              {uploading ? 'Processing archive...' : 'Run import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
