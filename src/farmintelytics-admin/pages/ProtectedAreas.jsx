import { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Plus, Upload, Search, RefreshCw, Trash2, Pencil, Check, X, AlertCircle, ExternalLink } from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchProtectedAreas,
  fetchProtectedAreasGeojson,
  deleteProtectedArea,
  toggleProtectedArea,
  uploadWdpaZip,
} from '../../services/adminApi';
import { getCssToken } from '../../utils/tokens';
import UploadWdpaModal from './protected_areas/UploadWdpaModal';
import UploadBoundaryModal from './protected_areas/UploadBoundaryModal';

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

  const [boundaryOpen, setBoundaryOpen] = useState(false);
  const [editArea, setEditArea] = useState(null);

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
    loadData(); // eslint-disable-line react-hooks/set-state-in-effect
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

  const openEditModal = (area) => { setEditArea(area); setBoundaryOpen(true); };
  const openCreateModal = () => { setEditArea(null); setBoundaryOpen(true); };
  const onBoundarySaved = (res) => {
    setBoundaryOpen(false);
    setSuccessMsg(editArea ? 'Protected area updated.' : `${res.saved} protected area${res.saved === 1 ? '' : 's'} added from the file.`);
    setEditArea(null);
    loadData();
  };

  const sourceLabel = (area) => {
    if (area.source === 'upload') return 'Uploaded boundary';
    if (area.source === 'manual') return 'Drawn by the team';
    return `WDPA${area.source_version ? `, ${area.source_version}` : ''}`;
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
            Add from a file
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
        <div className="h-80 w-full relative isolate bg-white">
          <MapContainer center={mapCenter} zoom={6} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer url={IMAGERY} maxZoom={18} />
            <TileLayer url={LABELS} maxZoom={18} />
            <MapBoundsFitter geojson={geojson} />
            {geojson && (
              <GeoJSON
                key={JSON.stringify(geojson.features?.length)}
                data={geojson}
                style={{
                  color: getCssToken('--status-critical', '#DC2626'),
                  weight: 2,
                  fillColor: getCssToken('--status-critical', '#DC2626'),
                  fillOpacity: 0.35,
                }}
                onEachFeature={(feature, layer) => {
                  const p = feature.properties || {};
                  layer.bindPopup(`
                    <div style="font-family: var(--font-sans); font-size: 12px; line-height: 1.4;">
                      <strong>${p.name || 'Protected Area'}</strong><br/>
                      <span style="color: var(--text-muted, #64748b);">Source: ${p.source === 'manual' ? 'Drawn by team' : (p.source_version || 'WDPA')}</span><br/>
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
            <option value="upload">Uploaded boundaries</option>
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
            <thead className="bg-white border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Protected area name</th>
                <th className="px-6 py-3.5">Source</th>
                <th className="px-6 py-3.5">Designation</th>
                <th className="px-6 py-3.5">Size</th>
                <th className="px-6 py-3.5">Added</th>
                <th className="px-6 py-3.5">Active</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && areas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading protected areas registry...
                  </td>
                </tr>
              ) : areas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No protected areas yet. Upload the WDPA archive, or add a boundary from a file.
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
                      {area.source_name && <div className="text-xs text-gray-600 mt-1">{area.source_name}{area.source_date ? `, ${area.source_date}` : ''}</div>}
                      {area.source_url && <a href={area.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline mt-0.5">Open source<ExternalLink size={11} /></a>}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {area.designation || '—'}
                      {area.country && <div className="text-xs text-gray-500 font-mono">{area.country}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-mono text-xs whitespace-nowrap">
                      {area.area_ha != null ? `${Number(area.area_ha).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha` : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      <div>{area.edited_by || '—'}</div>
                      {area.updated_at && <div className="text-gray-500">{new Date(area.updated_at).toLocaleDateString()}</div>}
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
                      {area.source !== 'wdpa' && (
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
        <div className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between text-xs text-gray-500">
          <span>Showing {areas.length} of {total} registered boundaries</span>
          <span>Layer export: shared/protected_areas/active.geojson</span>
        </div>
      </div>

      {/* Upload WDPA Modal */}
      <UploadWdpaModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSubmit={handleUploadSubmit}
        uploadFile={uploadFile}
        setUploadFile={setUploadFile}
        sourceVersion={sourceVersion}
        setSourceVersion={setSourceVersion}
        marginKm={marginKm}
        setMarginKm={setMarginKm}
        uploading={uploading}
        uploadCounts={uploadCounts}
      />

      <UploadBoundaryModal
        open={boundaryOpen}
        area={editArea}
        onClose={() => { setBoundaryOpen(false); setEditArea(null); }}
        onSaved={onBoundarySaved}
      />
    </div>
  );
}
