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

    // Subtle atmospheric radar pulses matching satellite positions on image
    const satellites = [
      { xRatio: 0.25, yRatio: 0.22, color: '#34d399', waveRadius: 0, speed: 0.8 },
      { xRatio: 0.48, yRatio: 0.26, color: '#60a5fa', waveRadius: 50, speed: 0.9 },
      { xRatio: 0.66, yRatio: 0.13, color: '#34d399', waveRadius: 100, speed: 0.7 },
      { xRatio: 0.86, yRatio: 0.28, color: '#fbbf24', waveRadius: 30, speed: 0.85 },
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      satellites.forEach((sat) => {
        const sx = width * sat.xRatio;
        const sy = height * sat.yRatio;

        // Subtle expanding radar pulse wave
        for (let i = 0; i < 3; i++) {
          const r = ((sat.waveRadius + i * 60) % 200);
          const alpha = Math.max(0, (1 - r / 200) * 0.22);

          ctx.strokeStyle = sat.color === '#34d399'
            ? `rgba(52, 211, 153, ${alpha})`
            : sat.color === '#60a5fa'
              ? `rgba(96, 165, 250, ${alpha})`
              : `rgba(251, 191, 36, ${alpha})`;
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.arc(sx, sy, r, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }

        sat.waveRadius += sat.speed;
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
