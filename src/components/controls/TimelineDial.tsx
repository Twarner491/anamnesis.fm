import { useStore } from '@nanostores/react';
import { $era, setEra } from '../../stores/filters';
import { $isPoweredOn } from '../../stores/player';
import { ERA_RANGES, FM_RANGE } from '../../lib/constants';
import { useRef, useState, useCallback, useEffect } from 'react';
import './TimelineDial.css';

export function TimelineDial() {
  const currentEra = useStore($era);
  const isPoweredOn = useStore($isPoweredOn);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize with 0 for SSR, then sync after mount
  const [position, setPosition] = useState(0);
  // Track latest position during drag (to avoid React state async issues)
  const latestPositionRef = useRef(0);

  // Get current position from era (0-100%)
  const getCurrentPosition = useCallback(() => {
    if (!currentEra) return 0;
    const era = ERA_RANGES.find((e) => e.query === currentEra);
    return era ? (era.position / 180) * 100 : 0;
  }, [currentEra]);

  // Sync position after mount (fixes hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
    const pos = getCurrentPosition();
    setPosition(pos);
    latestPositionRef.current = pos;
  }, []);

  // Sync position when era changes externally (after mount)
  useEffect(() => {
    if (isMounted) {
      const pos = getCurrentPosition();
      setPosition(pos);
      latestPositionRef.current = pos;
    }
  }, [currentEra, isMounted, getCurrentPosition]);

  const getEraFromPosition = useCallback((pos: number) => {
    // Convert position (0-100) to rotation (0-180)
    const rotation = (pos / 100) * 180;

    // Find closest era
    let closest = ERA_RANGES[0];
    let minDiff = Infinity;

    for (const era of ERA_RANGES) {
      const diff = Math.abs(era.position - rotation);
      if (diff < minDiff) {
        minDiff = diff;
        closest = era;
      }
    }

    return closest;
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePositionFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !sliderRef.current) return;
    updatePositionFromEvent(e);
  };

  const updatePositionFromEvent = (e: React.PointerEvent) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(percent);
    latestPositionRef.current = percent;
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Use ref to get the latest position (avoids React state async issues)
    const finalPosition = latestPositionRef.current;

    // Snap to nearest era
    const era = getEraFromPosition(finalPosition);
    const newPosition = (era.position / 180) * 100;
    setPosition(newPosition);
    latestPositionRef.current = newPosition;

    // Update store
    console.log('[TimelineDial] Setting era to:', era.query);
    setEra(era.query);
  };

  // Click on era marker to jump to it
  const handleEraClick = (era: typeof ERA_RANGES[number]) => {
    const newPosition = (era.position / 180) * 100;
    setPosition(newPosition);
    latestPositionRef.current = newPosition;
    console.log('[TimelineDial] Click - Setting era to:', era.query);
    setEra(era.query);
  };

  // Calculate displayed frequency
  const frequency = (FM_RANGE.min + (position / 100) * (FM_RANGE.max - FM_RANGE.min)).toFixed(1);
  const currentEraLabel = getEraFromPosition(position);

  return (
    <div className={`timeline-tuner ${!isPoweredOn ? 'power-off' : ''}`}>
      <div className="tuner-header">
        <span className="tuner-title">Timeline Tuner</span>
      </div>

      {/* Horizontal slider for desktop */}
      <div className="tuner-slider-container">
        {/* Era markers above the track */}
        <div className="era-markers">
          {ERA_RANGES.map((era) => (
            <button
              key={era.id}
              className={`era-marker ${isMounted && era.query === currentEra ? 'active' : ''}`}
              style={{
                '--marker-position': `${(era.position / 180) * 100}%`,
              } as React.CSSProperties}
              onClick={() => handleEraClick(era)}
              type="button"
            >
              {era.label}
            </button>
          ))}
        </div>

        {/* Slider track */}
        <div
          ref={sliderRef}
          className={`tuner-track ${isDragging ? 'dragging' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Track fill */}
          <div
            className="track-fill"
            style={{ width: `${position}%` }}
          />

          {/* Tick marks on track */}
          <div className="track-ticks">
            {ERA_RANGES.map((era) => (
              <div
                key={era.id}
                className={`track-tick ${isMounted && era.query === currentEra ? 'active' : ''}`}
                style={{
                  '--tick-position': `${(era.position / 180) * 100}%`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* Slider thumb */}
          <div
            className="tuner-thumb"
            style={{ left: `${position}%` }}
          >
            <div className="thumb-indicator" />
          </div>
        </div>
      </div>

      {/* Digital readout */}
      <div className="tuner-readout">
        <div className="frequency-display">
          <span className="freq-value">{frequency}</span>
          <span className="freq-unit">MHz</span>
        </div>
        <div className="era-display">{currentEraLabel.label}</div>
      </div>
    </div>
  );
}
