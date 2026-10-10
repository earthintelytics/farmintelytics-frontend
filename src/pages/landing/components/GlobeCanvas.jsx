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

    // Globe dimensions and center
    const globeRadius = Math.min(width, height) * 0.44;
    const globeCenterX = width > 1024 ? width * 0.32 : width * 0.5;
    const globeCenterY = height * 0.50;

    // Generate 3D sphere points representing agricultural parcels & telemetry nodes
    const numPoints = 260;
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(-1 + (2 * i) / numPoints);
      const theta = Math.sqrt(numPoints * Math.PI) * phi;
      const isFarmCluster = i % 8 === 0;
      points.push({
        x: globeRadius * Math.cos(theta) * Math.sin(phi),
        y: globeRadius * Math.sin(theta) * Math.sin(phi),
        z: globeRadius * Math.cos(phi),
        baseX: globeRadius * Math.cos(theta) * Math.sin(phi),
        baseY: globeRadius * Math.sin(theta) * Math.sin(phi),
        baseZ: globeRadius * Math.cos(phi),
        size: isFarmCluster ? Math.random() * 2 + 2.5 : Math.random() * 1.8 + 0.8,
        alpha: Math.random() * 0.6 + 0.4,
        pulse: Math.random() * Math.PI * 2,
        isFarmCluster,
        cropType: ['Oil Palm', 'Rubber', 'Cocoa', 'Cashew', 'Rice', 'Maize', 'Cassava', 'Sugarcane'][i % 8],
        ndvi: (0.45 + Math.random() * 0.4).toFixed(2),
      });
    }

    // High-altitude Earth Observation Satellites
    const satellites = [
      {
        name: 'SENTINEL-2A [OPTICAL 10M]',
        sub: 'NDVI / NDMI VIGOR',
        radius: globeRadius * 1.32,
        angle: 0.2,
        speed: 0.007,
        tilt: 0.35,
        color: '#10b981',
        beamColor: 'rgba(16, 185, 129, 0.18)',
        size: 4,
      },
      {
        name: 'SENTINEL-1B [SAR RADAR]',
        sub: 'C-BAND ALL-WEATHER',
        radius: globeRadius * 1.50,
        angle: Math.PI * 0.8,
        speed: -0.0055,
        tilt: -0.45,
        color: '#38bdf8',
        beamColor: 'rgba(56, 189, 248, 0.16)',
        size: 4.5,
      },
      {
        name: 'LANDSAT-9 [THERMAL TIRS]',
        sub: 'EVAPOTRANSPIRATION',
        radius: globeRadius * 1.22,
        angle: Math.PI * 1.4,
        speed: 0.009,
        tilt: 0.75,
        color: '#f59e0b',
        beamColor: 'rgba(245, 158, 11, 0.15)',
        size: 3.5,
      },
    ];

    let rotY = 0;
    let rotX = 0.22;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep space atmospheric & agricultural illumination glow
      const radialGradient = ctx.createRadialGradient(
        globeCenterX,
        globeCenterY,
        globeRadius * 0.15,
        globeCenterX,
        globeCenterY,
        globeRadius * 1.7
      );
      radialGradient.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
      radialGradient.addColorStop(0.35, 'rgba(15, 23, 42, 0.35)');
      radialGradient.addColorStop(0.8, 'rgba(11, 15, 25, 0.6)');
      radialGradient.addColorStop(1, 'rgba(11, 15, 25, 0)');
      ctx.fillStyle = radialGradient;
      ctx.fillRect(0, 0, width, height);

      rotY += 0.0022;

      // Draw Globe Outer Planetary Atmosphere Ring
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(globeCenterX, globeCenterY, globeRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Project 3D points
      const projected = [];
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.pulse += 0.035;

        // Rotation around Y
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const x1 = p.baseX * cosY - p.baseZ * sinY;
        const z1 = p.baseZ * cosY + p.baseX * sinY;

        // Rotation around X
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const y2 = p.baseY * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.baseY * sinX;

        // Depth perspective
        const scale = (z2 + globeRadius * 2) / (globeRadius * 3);
        const screenX = globeCenterX + x1;
        const screenY = globeCenterY + y2;

        projected.push({
          ...p,
          x: screenX,
          y: screenY,
          z: z2,
          scale,
        });
      }

      // Draw constellation & parcel boundary grid lines
      ctx.lineWidth = 0.65;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        if (p1.z < -globeRadius * 0.25) continue;
        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];
          if (p2.z < -globeRadius * 0.25) continue;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < globeRadius * 0.26) {
            const lineAlpha = (1 - dist / (globeRadius * 0.26)) * 0.16 * ((p1.scale + p2.scale) / 2);
            ctx.strokeStyle = p1.isFarmCluster || p2.isFarmCluster
              ? `rgba(52, 211, 153, ${lineAlpha * 1.5})`
              : `rgba(96, 165, 250, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw agricultural nodes, telemetry beacons, and crop clusters
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const isFront = p.z > 0;
        const nodeAlpha = isFront ? Math.min(1, 0.35 + (p.z / globeRadius) * 0.65) : 0.10;
        const pointPulse = Math.sin(p.pulse) * 0.35 + 1;

        if (p.isFarmCluster && isFront) {
          // Farm Intelligence Parcel Cluster (Emerald Glow)
          ctx.fillStyle = `rgba(52, 211, 153, ${nodeAlpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.scale * pointPulse, 0, Math.PI * 2);
          ctx.fill();

          // Outer Radar Ring
          ctx.strokeStyle = `rgba(16, 185, 129, ${nodeAlpha * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3.2 * p.scale * pointPulse, 0, Math.PI * 2);
          ctx.stroke();

          // Telemetry micro tag for select prominent nodes
          if (i % 32 === 0 && p.z > globeRadius * 0.3) {
            ctx.font = '9px monospace';
            ctx.fillStyle = `rgba(167, 243, 208, ${nodeAlpha * 0.8})`;
            ctx.fillText(`${p.cropType} NDVI:${p.ndvi}`, p.x + 8, p.y - 4);
          }
        } else {
          // Standard geospatial mesh point
          ctx.fillStyle = isFront
            ? `rgba(147, 197, 253, ${nodeAlpha})`
            : `rgba(71, 85, 105, ${nodeAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.8, p.size * p.scale), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Orbiting Earth Observation Satellites with Scanning Beams & Labels
      satellites.forEach((sat) => {
        sat.angle += sat.speed;
        const sx = globeCenterX + Math.cos(sat.angle) * sat.radius;
        const sy = globeCenterY + Math.sin(sat.angle) * (sat.radius * Math.cos(sat.tilt));

        // Draw Elliptical Orbit Track
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(globeCenterX, globeCenterY, sat.radius, sat.radius * Math.cos(sat.tilt), sat.tilt, 0, Math.PI * 2);
        ctx.stroke();

        // Active Telemetry Radar Scanning Cone down to Earth
        const targetX = globeCenterX + Math.cos(sat.angle + 0.1) * (globeRadius * 0.7);
        const targetY = globeCenterY + Math.sin(sat.angle + 0.1) * (globeRadius * 0.7 * Math.cos(sat.tilt));

        ctx.strokeStyle = sat.beamColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target Ground Swath Circle
        ctx.fillStyle = sat.beamColor;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Satellite Hardware Beacon
        ctx.fillStyle = sat.color;
        ctx.shadowColor = sat.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sx, sy, sat.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Satellite Solar Array Panels
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx - 7, sy);
        ctx.lineTo(sx + 7, sy);
        ctx.stroke();

        // Satellite HUD Label
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = sat.color;
        ctx.fillText(sat.name, sx + 10, sy - 2);
        ctx.font = '8px monospace';
        ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
        ctx.fillText(sat.sub, sx + 10, sy + 9);
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
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

export default GlobeCanvas;
