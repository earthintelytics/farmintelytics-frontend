import React, { useEffect, useRef } from 'react';

const GlobeCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = canvas.parentElement.offsetWidth);
    let height = (canvas.height = canvas.parentElement.offsetHeight);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Satellites positions matching panoramic horizon
    const satellites = [
      { xRatio: 0.12, yRatio: 0.22, color: '#34d399', name: 'SENTINEL-2A [OPTICAL]', waveRadius: 0, speed: 1.4 },
      { xRatio: 0.50, yRatio: 0.14, color: '#60a5fa', name: 'SENTINEL-1B [SAR RADAR]', waveRadius: 40, speed: 1.6 },
      { xRatio: 0.70, yRatio: 0.16, color: '#34d399', name: 'SENTINEL-2B [OPTICAL]', waveRadius: 80, speed: 1.3 },
      { xRatio: 0.88, yRatio: 0.23, color: '#fbbf24', name: 'LANDSAT-9 [THERMAL]', waveRadius: 20, speed: 1.5 },
    ];

    // Agricultural parcel telemetry nodes on the ground
    const farmNodes = [
      { xRatio: 0.16, yRatio: 0.74, label: 'Oil Palm Estate', vigor: 0.88 },
      { xRatio: 0.28, yRatio: 0.82, label: 'Rubber Plantation', vigor: 0.82 },
      { xRatio: 0.42, yRatio: 0.88, label: 'Cocoa Agroforest', vigor: 0.91 },
      { xRatio: 0.58, yRatio: 0.86, label: 'Irrigated Rice Basin', vigor: 0.85 },
      { xRatio: 0.74, yRatio: 0.78, label: 'Cassava Cluster', vigor: 0.79 },
      { xRatio: 0.86, yRatio: 0.72, label: 'Sugarcane Estate', vigor: 0.84 },
    ];

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.03;

      // Draw active radar scan waves emanating from each satellite down to the fields
      satellites.forEach((sat) => {
        const sx = width * sat.xRatio;
        const sy = height * sat.yRatio;

        // Draw multiple expanding radar wave arcs towards the ground
        for (let i = 0; i < 4; i++) {
          const r = ((sat.waveRadius + i * 55) % 240);
          const alpha = Math.max(0, (1 - r / 240) * 0.45);

          ctx.strokeStyle = sat.color === '#34d399'
            ? `rgba(52, 211, 153, ${alpha})`
            : sat.color === '#60a5fa'
              ? `rgba(96, 165, 250, ${alpha})`
              : `rgba(251, 191, 36, ${alpha})`;
          ctx.lineWidth = 1.2;

          ctx.beginPath();
          // Arc pointing downwards (between Math.PI * 0.25 and Math.PI * 0.75)
          ctx.arc(sx, sy, r, Math.PI * 0.2, Math.PI * 0.8);
          ctx.stroke();
        }

        sat.waveRadius += sat.speed;

        // Draw radar beam guide lines to ground agricultural target zones
        const targetGroundX = sx + (sat.xRatio < 0.5 ? 40 : -40);
        const targetGroundY = height * 0.78;

        ctx.strokeStyle = sat.color === '#34d399'
          ? 'rgba(52, 211, 153, 0.12)'
          : 'rgba(96, 165, 250, 0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(targetGroundX, targetGroundY);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw agricultural parcel telemetry nodes on the ground
      farmNodes.forEach((node, idx) => {
        const nx = width * node.xRatio;
        const ny = height * node.yRatio;
        const pulse = Math.sin(time + idx * 1.2) * 0.4 + 1;

        // Ground telemetry pulse
        ctx.fillStyle = 'rgba(52, 211, 153, 0.7)';
        ctx.beginPath();
        ctx.arc(nx, ny, 3.5 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nx, ny, 10 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

export default GlobeCanvas;
