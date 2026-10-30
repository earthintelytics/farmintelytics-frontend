// The map layers panel's legend cards. Both modes render the same card; only the entries' source differs:
//   crop pages: the crop's index profile, with its own class breaks and wording (indices absent from the
//               archive are shown disabled as "(No data)");
//   services:   every index present in the organisation's archive, with the generic classes.
import { useEffect, useMemo, useState } from 'react';
import { setIndexClasses } from '../legends/indexClasses';

// Groups from an index's crop-agnostic INDEX_REGISTRY tags.
function groupFromTags(tags = [], key = '') {
  const t = tags.map(x => String(x).toLowerCase());
  const k = String(key).toLowerCase();
  // Ground moisture: radar soil moisture, thermal soil moisture, NDTI
  if (k === 'smi' || k === 'smi_landsat' || k === 'ndti' || t.some(x => ['soil-water', 'soil-moisture', 'ground-moisture', 'thermal-moisture'].includes(x))) {
    return 'Ground moisture';
  }
  // Vegetation moisture: optical canopy moisture and water status (NDMI, NDWI, LSWI, MSI, WDI)
  if (k === 'ndmi' || k === 'ndwi' || k === 'lswi' || k === 'msi' || k === 'wdi' || t.some(x => ['water', 'moisture', 'water-stress', 'canopy-water', 'flood', 'paddy', 'irrigation', 'drought', 'evapotranspiration', 'canopy-moisture'].includes(x))) {
    return 'Vegetation moisture';
  }
  if (t.some(x => ['chlorophyll', 'nitrogen', 'nutrient', 'phenology'].includes(x))) {
    return 'Nutrient & Chlorophyll';
  }
  return 'Vegetation Health';
}

// Plain empty state (docs/INFORMATION_PRESENTATION.md, section 5)
export const emptyLegendMessage = "We're preparing your first satellite views. They usually appear within a few days of setup.";

export function useLegendEntries({ isOrg, availableIndices, cropProfileEntries }) {
  const legendEntries = useMemo(() => {
    if (isOrg) {
      return availableIndices.map(ix => {
        const key = String(ix.index).toLowerCase();
        const title = ix.label || key.toUpperCase();
        return { key, title, tooltip: title, subtitle: ix.full || title, legend: ix.legend || [], notes: '', hasData: true, ramp: [ix.lo, ix.hi], group: groupFromTags(ix.tags, key) };
      });
    }
    return cropProfileEntries.map(entry => ({
      key: entry.key,
      title: entry.crop_label || entry.label,
      tooltip: entry.label,
      subtitle: entry.full || entry.label,
      legend: entry.legend || [],
      notes: entry.notes || '',
      hasData: availableIndices.some(i => String(i.index).toLowerCase() === entry.key),
      ramp: null,
      group: groupFromTags(entry.tags || [], entry.key),
    }));
  }, [isOrg, availableIndices, cropProfileEntries]);

  // The map layers panel shows each index's classes from here: the same classes the tiles are painted with.
  useEffect(() => {
    setIndexClasses(Object.fromEntries(legendEntries.filter(e => e.legend?.length).map(e => [e.key, e.legend])));
  }, [legendEntries]);

  const legendGroups = useMemo(() => {
    const groups = {};
    legendEntries.forEach(entry => {
      const g = entry.group || 'General';
      (groups[g] = groups[g] || []).push(entry);
    });
    return groups;
  }, [legendEntries]);

  // Which index legends are opened by hand (the index on the map is always open).
  const [expandedLegendKeys, setExpandedLegendKeys] = useState([]);
  const toggleLegendKey = (key) => setExpandedLegendKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  // Group headers are closed except the first, so the panel isn't a wall of text on first open.
  const [expandedLegendGroups, setExpandedLegendGroups] = useState(null);
  const toggleLegendGroup = (name) => setExpandedLegendGroups(prev => {
    const current = prev || Object.keys(legendGroups).slice(0, 1);
    return current.includes(name) ? current.filter(g => g !== name) : [...current, name];
  });
  // Opened groups and cards belong to one page: forget them when another page opens.
  const resetLegendExpansion = () => {
    setExpandedLegendGroups(null);
    setExpandedLegendKeys([]);
  };

  return { legendEntries, legendGroups, expandedLegendKeys, toggleLegendKey, expandedLegendGroups, toggleLegendGroup, resetLegendExpansion, emptyLegendMessage };
}
