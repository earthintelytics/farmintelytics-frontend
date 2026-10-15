import { X } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import { getCssToken } from '../../../utils/tokens';

function DrawingMapEvents({ onAddPoint }) {
  useMapEvents({
    click(e) {
      onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function DrawAreaModal({
  isOpen,
  onClose,
  onSubmit,
  editArea,
  drawName,
  setDrawName,
  drawDesignation,
  setDrawDesignation,
  drawPoints,
  setDrawPoints,
  savingDraw,
  mapCenter,
  imageryUrl,
}) {
  if (!isOpen) return null;

  const polygonColor = getCssToken('--status-info', '#2563EB');

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-gray-900">
            {editArea ? `Edit ${editArea.name || 'Protected Area'}` : 'Draw manual protected reserve'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Area Name *
              </label>
              <input
                type="text"
                required
                value={drawName}
                onChange={(e) => setDrawName(e.target.value)}
                placeholder="e.g. Okomu Sacred Grove Reserve"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Designation
              </label>
              <input
                type="text"
                value={drawDesignation}
                onChange={(e) => setDrawDesignation(e.target.value)}
                placeholder="e.g. Forest Sanctuary / High Conservation Zone"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
          </div>

          {!editArea && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-700 uppercase">
                  Boundary points: click on satellite map ({drawPoints.length} vertices)
                </label>
                {drawPoints.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDrawPoints([])}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Clear vertices
                  </button>
                )}
              </div>
              <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-300 relative">
                <MapContainer center={mapCenter} zoom={6} className="h-full w-full">
                  <TileLayer url={imageryUrl} maxZoom={18} />
                  <DrawingMapEvents onAddPoint={(pt) => setDrawPoints((prev) => [...prev, pt])} />
                  {drawPoints.length >= 3 && (
                    <Polygon
                      positions={drawPoints}
                      pathOptions={{
                        color: polygonColor,
                        fillColor: polygonColor,
                        fillOpacity: 0.35,
                      }}
                    />
                  )}
                </MapContainer>
              </div>
              <p className="text-xs text-gray-500">
                Click each corner of the polygon in order on the map. At least 3 points are required.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingDraw}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
            >
              {savingDraw ? 'Saving...' : 'Save & sync boundary'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
