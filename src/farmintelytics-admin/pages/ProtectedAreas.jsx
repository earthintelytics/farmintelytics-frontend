import { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Plus, Upload, Search, RefreshCw, Trash2, Pencil, Check, X, MapPin, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchProtectedAreas,
  fetchProtectedAreasGeojson,
  createProtectedArea,
  updateProtectedArea,
  deleteProtectedArea,
  toggleProtectedArea,
  uploadWdpaZip,
} from '../../services/adminApi';

const IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

function MapBoundsFitter({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (geojson && geojson.features && geojson.features.length > 0) {
      try {
        const layer = L.geoJSON(geojson);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
        }
      } catch {
        // Ignore invalid geometry bounds
      }
    }
  }, [geojson, map]);
  return null;
}

function DrawingMapEvents({ onAddPoint }) {
  useMapEvents({
    click: (e) => {
      onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function ProtectedAreas() {
  const [areas, setAreas] = useState([]);
  const [geojson, setGeojson] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [sourceVersion, setSourceVersion] = useState('Oct2026');
  const [marginKm, setMarginKm] = useState(50);
  const [uploadCounts, setUploadCounts] = useState(null);

  const [drawModalOpen, setDrawModalOpen] = useState(false);
  const [editArea, setEditArea] = useState(null);
  const [drawName, setDrawName] = useState('');
  const [drawDesignation, setDrawDesignation] = useState('');
  const [drawPoints, setDrawPoints] = useState([]);
  const [savingDraw, setSavingDraw] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        search: search.trim(),
        source: sourceFilter,
        limit: 50,
      };
      if (activeFilter !== '') {
        params.active = activeFilter === 'true';
      }

      const [listRes, geoRes] = await Promise.all([
        fetchProtectedAreas(params),
        fetchProtectedAreasGeojson({ active: true, source: sourceFilter }),
      ]);

      setAreas(listRes.items || []);
      setTotal(listRes.total || 0);
      setGeojson(geoRes);
    } catch (err) {
      setError(err.message || 'Failed to load protected areas.');
    } finally {
      setLoading(false);
    }
  }, [search, sourceFilter, activeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (area) => {
    try {
      const res = await toggleProtectedArea(area.id);
      setAreas((prev) =>
        prev.map((a) => (a.id === area.id ? { ...a, active: res.active } : a))
      );
      // Refresh map geojson in background
      fetchProtectedAreasGeojson({ active: true }).then(setGeojson).catch(() => {});
    } catch (err) {
      setError(err.message || 'Failed to toggle status.');
    }
  };

  const handleDelete = async (area) => {
    if (!window.confirm(`Delete "${area.name || 'this area'}"? This will update the active layer immediately.`)) return;
    try {
      await deleteProtectedArea(area.id);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete protected area.');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    try {
      setUploading(true);
      setError('');
      setUploadCounts(null);
      const res = await uploadWdpaZip(uploadFile, sourceVersion, Number(marginKm));
      setUploadCounts(res.counts);
      setSuccessMsg(`Import complete: ${res.counts.created} created, ${res.counts.updated} updated.`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to upload WDPA archive.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDraw = async (e) => {
    e.preventDefault();
    if (!drawName.trim()) {
      setError('Please provide an area name.');
      return;
    }
    if (!editArea && drawPoints.length < 3) {
      setError('Please click at least 3 points on the map to define the polygon boundary.');
      return;
    }

    try {
      setSavingDraw(true);
      setError('');

      if (editArea) {
        const payload = {
          name: drawName.trim(),
          designation: drawDesignation.trim(),
        };
        if (drawPoints.length >= 3) {
          const coords = [...drawPoints.map(([lat, lng]) => [lng, lat])];
          coords.push(coords[0]);
          payload.geometry = {
            type: 'Polygon',
            coordinates: [coords],
          };
        }
        await updateProtectedArea(editArea.id, payload);
        setSuccessMsg('Protected area updated successfully.');
      } else {
        const coords = [...drawPoints.map(([lat, lng]) => [lng, lat])];
        coords.push(coords[0]);
        await createProtectedArea({
          name: drawName.trim(),
          designation: drawDesignation.trim(),
          geometry: {
            type: 'Polygon',
            coordinates: [coords],
          },
          active: true,
        });
        setSuccessMsg('Manual protected area created and synced to active layer.');
      }

      setDrawModalOpen(false);
      setEditArea(null);
      setDrawPoints([]);
      setDrawName('');
      setDrawDesignation('');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to save protected area boundary.');
    } finally {
      setSavingDraw(false);
    }
  };

  const openEditModal = (area) => {
    setEditArea(area);
    setDrawName(area.name || '');
    setDrawDesignation(area.designation || '');
    setDrawPoints([]);
    setDrawModalOpen(true);
  };

  const openCreateModal = () => {
    setEditArea(null);
    setDrawName('');
    setDrawDesignation('');
    setDrawPoints([]);
    setDrawModalOpen(true);
  };

  const sourceLabel = (area) => {
    if (area.source === 'manual') return 'Drawn by the team';
    return `WDPA, ${area.source_version || 'October 2026'}`;
  };

  const mapCenter = useMemo(() => [9.082, 8.6753], []); // Nigeria center

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-gray-900">Protected areas</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">
            Official World Database on Protected Areas (WDPA) and manual statutory reserves kept in-house.
            Active areas are exported directly to storage and excluded from commercial agriculture suitability and EUDR clearance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => { setUploadModalOpen(true); setUploadCounts(null); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Upload size={16} />
            Upload WDPA zip
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-green-700 text-white hover:bg-green-800 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Draw boundary
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <p className="flex-1">{error}</p>
          <button type="button" onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">
          <Check size={18} className="shrink-0 text-green-600" />
          <p className="flex-1">{successMsg}</p>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-green-500 hover:text-green-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Interactive Map Preview */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-green-700" />
            <h2 className="text-base font-semibold text-gray-900">Active protected boundaries map</h2>
          </div>
          <span className="text-xs text-gray-500">
            {geojson?.features?.length || 0} active boundaries loaded in local layer
          </span>
        </div>
        <div className="h-80 w-full relative bg-gray-100">
          <MapContainer center={mapCenter} zoom={6} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer url={IMAGERY} maxZoom={18} />
            <TileLayer url={LABELS} maxZoom={18} />
            <MapBoundsFitter geojson={geojson} />
            {geojson && (
              <GeoJSON
                key={JSON.stringify(geojson.features?.length)}
                data={geojson}
                style={{
                  color: '#dc2626',
                  weight: 2,
                  fillColor: '#ef4444',
                  fillOpacity: 0.35,
                }}
                onEachFeature={(feature, layer) => {
                  const p = feature.properties || {};
                  layer.bindPopup(`
                    <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
                      <strong>${p.name || 'Protected Area'}</strong><br/>
                      <span style="color: #666;">Source: ${p.source === 'manual' ? 'Drawn by team' : (p.source_version || 'WDPA')}</span><br/>
                      ${p.designation ? `<span>Desig: ${p.designation}</span><br/>` : ''}
                      <span>Status: ${p.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  `);
                }}
              />
            )}
          </MapContainer>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, designation, WDPA ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-green-600"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-300 text-sm bg-white text-gray-700"
          >
            <option value="">All sources</option>
            <option value="wdpa">Official WDPA</option>
            <option value="manual">Drawn by team</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-300 text-sm bg-white text-gray-700"
          >
            <option value="">All states</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Areas Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Protected area name</th>
                <th className="px-6 py-3.5">Source & version</th>
                <th className="px-6 py-3.5">Designation</th>
                <th className="px-6 py-3.5">Country</th>
                <th className="px-6 py-3.5">Active</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && areas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading protected areas registry...
                  </td>
                </tr>
              ) : areas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No protected areas found. Upload an official WDPA shapefile zip or draw a boundary to initialize.
                  </td>
                </tr>
              ) : (
                areas.map((area) => (
                  <tr key={area.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{area.name || 'Unnamed Reserve'}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {area.wdpa_id ? `WDPA ID: ${area.wdpa_id}` : `Local ID: #${area.id}`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        area.source === 'manual'
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {sourceLabel(area)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {area.designation || 'Nature Reserve'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {area.country || 'NGA'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={area.active}
                        onClick={() => handleToggle(area)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          area.active ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            area.active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(area)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit area details"
                      >
                        <Pencil size={15} />
                      </button>
                      {area.source === 'manual' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(area)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete manual area"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>Showing {areas.length} of {total} registered boundaries</span>
          <span>Layer export: shared/protected_areas/active.geojson</span>
        </div>
      </div>

      {/* Upload WDPA Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-gray-900">Upload WDPA shapefile archive</h3>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Upload official Protected Planet release zip (polygons only). Official records are upserted without overwriting hand-drawn manual areas.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
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
                  onClick={() => setUploadModalOpen(false)}
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
      )}

      {/* Draw / Edit Manual Boundary Modal */}
      {drawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-gray-900">
                {editArea ? `Edit ${editArea.name || 'Protected Area'}` : 'Draw manual protected reserve'}
              </h3>
              <button
                type="button"
                onClick={() => setDrawModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDraw} className="space-y-4">
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
                      <TileLayer url={IMAGERY} maxZoom={18} />
                      <DrawingMapEvents onAddPoint={(pt) => setDrawPoints((prev) => [...prev, pt])} />
                      {drawPoints.length >= 3 && (
                        <Polygon
                          positions={drawPoints}
                          pathOptions={{ color: '#9333ea', fillColor: '#a855f7', fillOpacity: 0.4 }}
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
                  onClick={() => setDrawModalOpen(false)}
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
      )}
    </div>
  );
}
