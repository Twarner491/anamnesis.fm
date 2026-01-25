import { useStore } from '@nanostores/react';
import { useEffect, useRef, useCallback } from 'react';
import { $currentTrack, $isPlaying } from '../../stores/player';
import { $location } from '../../stores/filters';
import { LOCATIONS } from '../../lib/constants';

// Map location IDs to longitude for globe rotation
const LOCATION_COORDS: Record<string, number> = {
  'all': 0, 'us': -95, 'us-ny': -74, 'us-ca': -118, 'canada': -106,
  'mexico': -102, 'brazil': -55, 'uk': 0, 'de': 10, 'fr': 2,
  'africa': 20, 'jp': 139, 'au': 134,
};

export function PageMeta() {
  const currentTrack = useStore($currentTrack);
  const isPlaying = useStore($isPlaying);
  const location = useStore($location);
  const titleIntervalRef = useRef<number | null>(null);
  const titleOffsetRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const rotationRef = useRef(0);

  // Scrolling title effect
  useEffect(() => {
    if (!isPlaying || !currentTrack?.title) {
      document.title = 'anamnesis.fm';
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
        titleIntervalRef.current = null;
      }
      titleOffsetRef.current = 0;
      return;
    }

    const baseTitle = `anamnesis.fm - ${currentTrack.title}`;
    const paddedTitle = baseTitle + '   -   ';

    const updateTitle = () => {
      const displayTitle = paddedTitle.slice(titleOffsetRef.current) + paddedTitle.slice(0, titleOffsetRef.current);
      document.title = displayTitle.slice(0, 60);
      titleOffsetRef.current = (titleOffsetRef.current + 1) % paddedTitle.length;
    };

    updateTitle();
    titleIntervalRef.current = window.setInterval(updateTitle, 150);

    return () => {
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
      }
    };
  }, [isPlaying, currentTrack?.title]);

  // Draw globe favicon
  const drawFavicon = useCallback((rotation: number) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 32;
      canvasRef.current.height = 32;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 32;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 2;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Globe background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#020502';
    ctx.fill();
    ctx.strokeStyle = '#0a3315';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Project point function
    const projectPoint = (lon: number, lat: number): { x: number; y: number; visible: boolean } => {
      const lonRad = (lon * Math.PI) / 180 + rotation;
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

    // Simplified continents for favicon
    const continents = [
      // North America
      [[-120, 50], [-100, 60], [-80, 50], [-90, 30], [-110, 35]],
      // South America
      [[-70, 5], [-50, -5], [-55, -40], [-75, -50], [-80, -10]],
      // Europe/Africa
      [[-10, 55], [20, 60], [40, 40], [35, 0], [10, -30], [-10, 10]],
      // Asia
      [[60, 60], [120, 60], [140, 40], [120, 20], [80, 30], [50, 50]],
      // Australia
      [[120, -20], [145, -20], [145, -38], [120, -35]],
    ];

    ctx.fillStyle = '#0a3315';
    ctx.strokeStyle = '#1a5525';
    ctx.lineWidth = 0.5;

    continents.forEach((continent) => {
      const points = continent.map((p) => projectPoint(p[0], p[1]));
      const visiblePoints = points.filter((p) => p.visible);

      if (visiblePoints.length > 2) {
        ctx.beginPath();
        ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
        for (let i = 1; i < visiblePoints.length; i++) {
          ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });

    // Glow effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#33ff66';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Update favicon
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (link) {
      link.href = canvas.toDataURL('image/png');
    }
  }, []);

  // Animate favicon when location changes
  useEffect(() => {
    // Find location ID from query
    const locationId = LOCATIONS.find(l => l.query === location)?.id || 'all';
    const targetLongitude = LOCATION_COORDS[locationId] || 0;
    const targetRotation = -targetLongitude * (Math.PI / 180);
    let isAnimating = true;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const diff = targetRotation - rotationRef.current;

      if (Math.abs(diff) > 0.02) {
        // Spinning towards target
        rotationRef.current += diff * Math.min(delta * 5, 0.15);
        drawFavicon(rotationRef.current);
        if (isAnimating) {
          animationRef.current = requestAnimationFrame(animate);
        }
      } else {
        // Done spinning, draw final state
        rotationRef.current = targetRotation;
        drawFavicon(rotationRef.current);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      isAnimating = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [location, drawFavicon]);

  // Initial favicon draw
  useEffect(() => {
    drawFavicon(rotationRef.current);
  }, [drawFavicon]);

  return null;
}
