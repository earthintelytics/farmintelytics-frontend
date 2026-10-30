// Sizes the user drags: the sidebar width, the bottom panel's height, and the compare-mode divider.
import { useEffect, useState } from 'react';

// Follows the mouse from a mousedown until mouseup, passing the distance moved since the start.
function dragFrom(e, onMove, onEnd) {
  e.preventDefault();
  const start = { x: e.clientX, y: e.clientY };
  const doDrag = (m) => onMove(m.clientX - start.x, m.clientY - start.y);
  const stopDrag = () => {
    onEnd();
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', stopDrag);
  };
  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', stopDrag);
}

export function usePanelSizes() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  // Room for the calendar's satellite dots and the satellite picker under it; the user can resize it.
  const [bottomPanelHeight, setBottomPanelHeight] = useState(260);
  const [isBottomPanelMinimized, setIsBottomPanelMinimized] = useState(true); // collapsed until opened
  const [activeResizeType, setActiveResizeType] = useState(null); // 'sidebar', 'bottom', or null
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  const startSidebarResize = (e) => {
    setActiveResizeType('sidebar');
    const startWidth = sidebarWidth;
    dragFrom(e, (dx) => setSidebarWidth(Math.max(180, Math.min(360, startWidth + dx))), () => setActiveResizeType(null));
  };

  const startBottomPanelResize = (e) => {
    setActiveResizeType('bottom');
    const startHeight = bottomPanelHeight;
    dragFrom(e, (dx, dy) => setBottomPanelHeight(Math.max(120, Math.min(500, startHeight - dy))), () => setActiveResizeType(null));
  };

  const handleSplitDragStart = (e) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  // The compare divider follows the mouse or finger across the map, 0 to 100 % of its width.
  useEffect(() => {
    if (!isDraggingSplit) return;
    const handleMove = (e) => {
      const mapContainer = document.querySelector('.map-wrapper-pane');
      if (!mapContainer) return;
      const rect = mapContainer.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      setSplitPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
    };
    const handleDragEnd = () => setIsDraggingSplit(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDraggingSplit]);

  return {
    sidebarWidth, bottomPanelHeight, isBottomPanelMinimized, setIsBottomPanelMinimized, activeResizeType,
    startSidebarResize, startBottomPanelResize, splitPosition, isDraggingSplit, handleSplitDragStart,
  };
}
