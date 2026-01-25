import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';
import { $location } from '../../stores/filters';
import { $isPoweredOn, $currentTrack } from '../../stores/player';
import { LOCATIONS } from '../../lib/constants';
import './Globe.css';

// Map location IDs to longitude for globe rotation
const LOCATION_COORDS: Record<string, number> = {
  'all': 0,             // Center on Atlantic
  'north-america': -100, // Central North America
  'south-america': -60,  // Central South America
  'europe': 10,          // Central Europe
  'asia': 100,           // Central Asia
  'middle-east': 45,     // Middle East
  'africa': 20,          // Central Africa
};

export function Globe() {
  const location = useStore($location);
  const isPoweredOn = useStore($isPoweredOn);
  const currentTrack = useStore($currentTrack);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number>(0);
  const targetRotationRef = useRef(0);

  // Find location by query to get the ID
  const locationId = LOCATIONS.find(l => l.query === location)?.id || 'all';
  // Get the target rotation based on location ID
  const targetLongitude = LOCATION_COORDS[locationId] || 0;
  // Convert longitude to rotation angle (longitude 0 = 0 degrees rotation)
  const targetRotation = -targetLongitude * (Math.PI / 180);

  // Get location label
  const locationLabel = LOCATIONS.find(l => l.query === location)?.label || 'WORLD';

  useEffect(() => {
    targetRotationRef.current = targetRotation;
  }, [targetRotation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 4;

    // Continent shapes with improved detail
    const continents = [
      // North America - more detailed shape
      { points: [
        [-168, 65], [-162, 60], [-145, 60], [-140, 70], [-130, 72],
        [-120, 70], [-100, 70], [-85, 70], [-80, 65], [-65, 60],
        [-55, 50], [-65, 45], [-70, 40], [-75, 35], [-82, 30],
        [-85, 25], [-95, 20], [-105, 22], [-115, 28], [-120, 35],
        [-125, 40], [-130, 45], [-135, 50], [-145, 55], [-155, 58],
        [-165, 60]
      ], fill: '#0a3315' },
      // South America - more detailed
      { points: [
        [-80, 12], [-75, 10], [-60, 5], [-50, 0], [-45, -5],
        [-35, -8], [-38, -15], [-42, -22], [-50, -25], [-55, -35],
        [-65, -45], [-70, -52], [-75, -55], [-72, -50], [-70, -40],
        [-68, -30], [-70, -20], [-75, -10], [-78, 0], [-82, 8]
      ], fill: '#0a3315' },
      // Europe - more detailed
      { points: [
        [-10, 60], [-5, 58], [0, 55], [5, 52], [10, 55],
        [15, 60], [25, 65], [35, 70], [45, 68], [50, 60],
        [45, 52], [40, 45], [35, 42], [25, 38], [15, 40],
        [8, 42], [0, 45], [-5, 48], [-8, 52], [-10, 55]
      ], fill: '#0a3315' },
      // Africa - more detailed
      { points: [
        [-17, 35], [-10, 35], [0, 37], [10, 35], [20, 32],
        [32, 30], [42, 25], [50, 15], [52, 5], [50, -5],
        [45, -15], [40, -25], [35, -32], [28, -35], [20, -35],
        [15, -30], [12, -25], [18, -20], [15, -15], [10, -5],
        [5, 5], [-5, 10], [-15, 15], [-18, 22], [-17, 30]
      ], fill: '#0a3315' },
      // Asia - more detailed (split into parts for better rendering)
      { points: [
        [50, 70], [60, 72], [80, 75], [100, 75], [120, 70],
        [140, 65], [160, 60], [170, 55], [180, 50], [175, 45],
        [165, 40], [155, 35], [145, 30], [135, 25], [125, 22],
        [115, 18], [105, 12], [95, 8], [85, 5], [75, 10],
        [65, 20], [55, 30], [50, 40], [48, 50], [48, 60]
      ], fill: '#0a3315' },
      // Australia - more detailed
      { points: [
        [114, -20], [120, -15], [130, -12], [140, -12], [148, -15],
        [152, -20], [155, -28], [153, -35], [148, -38], [140, -40],
        [130, -38], [120, -35], [115, -32], [113, -26]
      ], fill: '#0a3315' },
      // Greenland
      { points: [
        [-45, 60], [-35, 65], [-25, 70], [-20, 75], [-30, 80],
        [-45, 82], [-55, 78], [-60, 72], [-55, 65]
      ], fill: '#0a3315' },
      // Japan
      { points: [
        [130, 32], [135, 35], [140, 40], [142, 43], [140, 45],
        [135, 42], [130, 38], [128, 34]
      ], fill: '#0a3315' },
      // UK/Ireland
      { points: [
        [-10, 50], [-5, 52], [0, 55], [2, 58], [-2, 60],
        [-8, 58], [-12, 55], [-12, 52]
      ], fill: '#0a3315' },
    ];

    let currentRotation = rotation;
    let isSpinning = true;
    let lastTime = performance.now();

    const projectPoint = (lon: number, lat: number, rot: number): { x: number; y: number; visible: boolean } => {
      const lonRad = (lon * Math.PI) / 180 + rot;
      const latRad = (lat * Math.PI) / 180;

      const x = Math.cos(latRad) * Math.sin(lonRad);
      const z = Math.cos(latRad) * Math.cos(lonRad);
      const y = Math.sin(latRad);

      return {
        x: centerX + x * radius,
        y: centerY - y * radius,
        visible: z > -0.1,
      };
    };

    const drawGlobe = () => {
      // Clear
      ctx.fillStyle = '#010301';
      ctx.fillRect(0, 0, width, height);

      // Globe background (ocean)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#020502';
      ctx.fill();
      ctx.strokeStyle = '#0a3315';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw grid lines (latitude)
      ctx.strokeStyle = '#061a09';
      ctx.lineWidth = 1;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 10) {
          const p = projectPoint(lon, lat, currentRotation);
          if (p.visible) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Draw grid lines (longitude)
      for (let lon = 0; lon < 360; lon += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 5) {
          const p = projectPoint(lon, lat, currentRotation);
          if (p.visible) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Draw continents
      continents.forEach((continent) => {
        ctx.beginPath();
        ctx.fillStyle = continent.fill;
        ctx.strokeStyle = '#1a5525';
        ctx.lineWidth = 1;

        const points = continent.points.map((p) => projectPoint(p[0], p[1], currentRotation));
        const visiblePoints = points.filter((p) => p.visible);

        if (visiblePoints.length > 2) {
          ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
          for (let i = 1; i < visiblePoints.length; i++) {
            ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      });

      // Draw highlight arc (sun reflection)
      const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        0,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, 'rgba(51, 255, 102, 0.08)');
      gradient.addColorStop(0.5, 'rgba(51, 255, 102, 0.02)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Glow effect on edge
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#33ff66';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(51, 255, 102, 0.5)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Smoothly rotate towards target
      const diff = targetRotationRef.current - currentRotation;

      // Spin towards target quickly, then slow continuous spin
      if (Math.abs(diff) > 0.02) {
        // Move towards target - faster animation
        currentRotation += diff * Math.min(delta * 8, 0.2);
      } else {
        // Slow continuous spin when at target
        currentRotation += delta * 0.15;
      }

      // Normalize rotation
      while (currentRotation > Math.PI) currentRotation -= Math.PI * 2;
      while (currentRotation < -Math.PI) currentRotation += Math.PI * 2;

      setRotation(currentRotation);
      drawGlobe();

      if (isSpinning) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      isSpinning = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className={`globe-container ${!isPoweredOn ? 'power-off' : ''}`}>
      <div className="globe-display">
        <canvas
          ref={canvasRef}
          width={80}
          height={80}
          className="globe-canvas"
        />
        <div className="globe-scanlines" />
      </div>
      <div className="globe-label">{locationLabel}</div>
    </div>
  );
}
