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

    // Globe layout
    const isMobile = width < 768;
    const globeRadius = Math.min(width, height) * (isMobile ? 0.48 : 0.46);
    const globeCenterX = width > 1024 ? width * 0.5 : width * 0.5;
    const globeCenterY = height * 0.52;

    // Continental landmass coordinates (lat/lon in radians for agricultural belts)
    // Sample coordinates approximating global agricultural zones (Africa, S. America, SE Asia, Europe)
    const landmassRegions = [
      // West Africa & Central Africa (Palm, Cocoa, Rubber)
      { lat: 0.1, lon: 0.1 }, { lat: 0.12, lon: 0.15 }, { lat: 0.08, lon: 0.2 }, { lat: 0.14, lon: 0.05 },
      { lat: 0.05, lon: 0.25 }, { lat: -0.05, lon: 0.35 }, { lat: 0.18, lon: 0.1 }, { lat: 0.02, lon: 0.18 },
      { lat: 0.15, lon: 0.22 }, { lat: 0.11, lon: 0.08 }, { lat: 0.07, lon: 0.3 }, { lat: 0.04, lon: 0.12 },
      // East & South Africa
      { lat: -0.15, lon: 0.55 }, { lat: -0.25, lon: 0.5 }, { lat: -0.35, lon: 0.45 }, { lat: -0.05, lon: 0.65 },
      // South America (Amazon Basin & Agriculture)
      { lat: -0.1, lon: -1.0 }, { lat: -0.15, lon: -0.9 }, { lat: -0.25, lon: -0.85 }, { lat: 0.05, lon: -1.1 },
      { lat: -0.05, lon: -1.05 }, { lat: -0.2, lon: -0.95 }, { lat: -0.3, lon: -1.0 }, { lat: 0.1, lon: -1.2 },
      // Southeast Asia & India (Rice, Palm, Rubber)
      { lat: 0.25, lon: 1.35 }, { lat: 0.35, lon: 1.3 }, { lat: 0.15, lon: 1.7 }, { lat: 0.05, lon: 1.8 },
      { lat: -0.1, lon: 1.9 }, { lat: 0.2, lon: 1.55 }, { lat: 0.12, lon: 1.75 }, { lat: 0.28, lon: 1.4 },
      // Europe & Mediterranean
      { lat: 0.75, lon: 0.15 }, { lat: 0.8, lon: 0.35 }, { lat: 0.7, lon: 0.5 }, { lat: 0.65, lon: 0.2 },
    ];

    // Generate dense realistic landmass particle clusters
    const landPoints = [];
    landmassRegions.forEach(reg => {
      for (let j = 0; j < 12; j++) {
        const offsetLat = reg.lat + (Math.random() - 0.5) * 0.18;
        const offsetLon = reg.lon + (Math.random() - 0.5) * 0.22;
        landPoints.push({
          lat: offsetLat,
          lon: offsetLon,
          x: globeRadius * Math.cos(offsetLat) * Math.sin(offsetLon),
          y: -globeRadius * Math.sin(offsetLat),
          z: globeRadius * Math.cos(offsetLat) * Math.cos(offsetLon),
          baseX: globeRadius * Math.cos(offsetLat) * Math.sin(offsetLon),
          baseY: -globeRadius * Math.sin(offsetLat),
          baseZ: globeRadius * Math.cos(offsetLat) * Math.cos(offsetLon),
          isLand: true,
          vigor: Math.random() * 0.5 + 0.5,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    });

    // Generate spherical latitude/longitude grid points (graticule)
    const gridPoints = [];
    const latSteps = 10;
    const lonSteps = 20;
    for (let i = 0; i < latSteps; i++) {
      const lat = ((i / (latSteps - 1)) - 0.5) * Math.PI * 0.85;
      for (let j = 0; j < lonSteps; j++) {
        const lon = (j / lonSteps) * Math.PI * 2;
        gridPoints.push({
          lat,
          lon,
          baseX: globeRadius * Math.cos(lat) * Math.sin(lon),
          baseY: -globeRadius * Math.sin(lat),
          baseZ: globeRadius * Math.cos(lat) * Math.cos(lon),
          isLand: false,
          size: 1.1,
          alpha: 0.25,
        });
      }
    }

    // Satellites with realistic orbits and radar beams
    const satellites = [
      {
        name: 'Sentinel-2A (Optical 10m)',
        color: '#34d399',
        orbitRadius: globeRadius * 1.34,
        angle: 0.5,
        speed: 0.006,
        tilt: 0.4,
        size: 5,
        type: 'optical'
      },
      {
        name: 'Sentinel-1B (SAR Radar)',
        color: '#60a5fa',
        orbitRadius: globeRadius * 1.52,
        angle: Math.PI * 1.1,
        speed: -0.0045,
        tilt: -0.5,
        size: 5.5,
        type: 'radar'
      },
      {
        name: 'Landsat-9 (Thermal TIRS)',
        color: '#fbbf24',
        orbitRadius: globeRadius * 1.24,
        angle: Math.PI * 1.7,
        speed: 0.008,
        tilt: 0.75,
        size: 4,
        type: 'thermal'
      },
    ];

    let rotY = 0;
    let scanAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep Space Atmospheric Radial Glow
      const spaceGlow = ctx.createRadialGradient(
        globeCenterX,
        globeCenterY,
        globeRadius * 0.3,
        globeCenterX,
        globeCenterY,
        globeRadius * 1.8
      );
      spaceGlow.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
      spaceGlow.addColorStop(0.3, 'rgba(30, 58, 138, 0.22)');
      spaceGlow.addColorStop(0.7, 'rgba(15, 23, 42, 0.55)');
      spaceGlow.addColorStop(1, 'rgba(11, 15, 25, 0)');
      ctx.fillStyle = spaceGlow;
      ctx.fillRect(0, 0, width, height);

      rotY += 0.0022;
      scanAngle += 0.02;

      // 1. Atmosphere Halo
      const atmoGradient = ctx.createRadialGradient(
        globeCenterX,
        globeCenterY,
        globeRadius * 0.92,
        globeCenterX,
        globeCenterY,
        globeRadius * 1.08
      );
      atmoGradient.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      atmoGradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.08)');
      atmoGradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = atmoGradient;
      ctx.beginPath();
      ctx.arc(globeCenterX, globeCenterY, globeRadius * 1.08, 0, Math.PI * 2);
      ctx.fill();

      // 2. Globe Sphere Border
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(globeCenterX, globeCenterY, globeRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Project and draw Lat/Lon Grid
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      gridPoints.forEach(p => {
        const x1 = p.baseX * cosY - p.baseZ * sinY;
        const z1 = p.baseZ * cosY + p.baseX * sinY;
        if (z1 > -globeRadius * 0.2) {
          const scale = (z1 + globeRadius * 2) / (globeRadius * 3);
          const screenX = globeCenterX + x1;
          const screenY = globeCenterY + p.baseY;
          const alpha = Math.max(0.04, (z1 / globeRadius) * 0.25);

          ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, p.size * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 4. Project and draw Agricultural Landmass Points & Telemetry Hotspots
      landPoints.forEach(p => {
        p.pulse += 0.04;
        const x1 = p.baseX * cosY - p.baseZ * sinY;
        const z1 = p.baseZ * cosY + p.baseX * sinY;

        if (z1 > 0) {
          const scale = (z1 + globeRadius * 2) / (globeRadius * 3);
          const screenX = globeCenterX + x1;
          const screenY = globeCenterY + p.baseY;
          const depthAlpha = Math.min(1, 0.3 + (z1 / globeRadius) * 0.7);
          const pulseEffect = Math.sin(p.pulse) * 0.3 + 1;

          // Lush emerald agricultural vegetation glow (NDVI)
          ctx.fillStyle = `rgba(52, 211, 153, ${depthAlpha * 0.85})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, Math.max(1.2, 2.2 * scale * pulseEffect), 0, Math.PI * 2);
          ctx.fill();

          // High-vigor plantation node ring
          if (p.vigor > 0.85) {
            ctx.strokeStyle = `rgba(16, 185, 129, ${depthAlpha * 0.4})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 5 * scale * pulseEffect, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      });

      // 5. Orbiting Satellites, Radar Cones & Telemetry Beacons
      satellites.forEach(sat => {
        sat.angle += sat.speed;
        const sx = globeCenterX + Math.cos(sat.angle) * sat.orbitRadius;
        const sy = globeCenterY + Math.sin(sat.angle) * (sat.orbitRadius * Math.cos(sat.tilt));

        // Orbit Track
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(globeCenterX, globeCenterY, sat.orbitRadius, sat.orbitRadius * Math.cos(sat.tilt), sat.tilt, 0, Math.PI * 2);
        ctx.stroke();

        // Active Telemetry Radar Beam Cone to Earth
        const targetGroundX = globeCenterX + Math.cos(sat.angle + 0.15) * (globeRadius * 0.75);
        const targetGroundY = globeCenterY + Math.sin(sat.angle + 0.15) * (globeRadius * 0.75 * Math.cos(sat.tilt));

        ctx.strokeStyle = sat.type === 'radar' ? 'rgba(96, 165, 250, 0.16)' : 'rgba(52, 211, 153, 0.16)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(targetGroundX, targetGroundY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ground Radar Footprint Swath
        ctx.fillStyle = sat.type === 'radar' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(52, 211, 153, 0.12)';
        ctx.beginPath();
        ctx.arc(targetGroundX, targetGroundY, 9, 0, Math.PI * 2);
        ctx.fill();

        // Satellite Body
        ctx.fillStyle = sat.color;
        ctx.shadowColor = sat.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx, sy, sat.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Satellite Solar Array Wings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx - 7, sy);
        ctx.lineTo(sx + 7, sy);
        ctx.stroke();

        // Satellite Label
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = sat.color;
        ctx.fillText(sat.name, sx + 9, sy + 3);
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
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-90"
    />
  );
};

export default GlobeCanvas;
