import { useStore } from '@nanostores/react';
import { useRef, useEffect, useState } from 'react';
import { $currentTrack, $currentEra, $timeDisplay, $isPlaying, $isLoading, $isPoweredOn } from '../../stores/player';
import { $era } from '../../stores/filters';
import { ERA_RANGES, FM_RANGE } from '../../lib/constants';
import './DisplayPanel.css';

export function DisplayPanel() {
  const currentTrack = useStore($currentTrack);
  const currentEra = useStore($currentEra);
  const timeDisplay = useStore($timeDisplay);
  const isPlaying = useStore($isPlaying);
  const isLoading = useStore($isLoading);
  const isPoweredOn = useStore($isPoweredOn);
  const selectedEra = useStore($era);

  // Check if title needs to scroll
  const titleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (titleRef.current && containerRef.current) {
      const titleWidth = titleRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      setShouldScroll(titleWidth > containerWidth);
    }
  }, [currentTrack?.title]);

  // Calculate FM frequency from selected era (only after mount to avoid hydration mismatch)
  const getFrequency = () => {
    if (!isMounted || !selectedEra) return FM_RANGE.min;
    const era = ERA_RANGES.find(e => e.query === selectedEra);
    if (!era) return FM_RANGE.min;
    const ratio = era.position / 180;
    return FM_RANGE.min + ratio * (FM_RANGE.max - FM_RANGE.min);
  };

  const frequency = getFrequency().toFixed(1);
  const eraLabel = isMounted ? (ERA_RANGES.find(e => e.query === selectedEra)?.label || 'ALL') : 'ALL';

  return (
    <div className={`display-panel ${!isPoweredOn ? 'display-off' : ''}`}>
      <div className="crt-overlay" />
      <div className="display-content">
        {/* Top row: Frequency and era */}
        <div className="display-row display-header">
          <div className="frequency-block">
            <span className="frequency-display">{frequency}</span>
            <span className="frequency-unit">MHz</span>
          </div>
          <div className="era-block">
            <span className="era-label">{eraLabel}</span>
          </div>
        </div>

        {/* Track info */}
        <div className="track-info">
          {!isPoweredOn ? (
            <div className="track-empty">
              <span className="no-signal-text">NO SIGNAL</span>
            </div>
          ) : isLoading ? (
            <div className="track-loading">
              <span className="loading-text">TUNING</span>
              <span className="loading-dots">...</span>
            </div>
          ) : !currentTrack ? (
            <div className="track-empty" />
          ) : (
            <>
              <div className="track-title-container" ref={containerRef}>
                <div
                  className={`track-title ${shouldScroll ? 'scrolling' : ''}`}
                  ref={titleRef}
                >
                  {currentTrack.title}
                  {shouldScroll && <span className="title-spacer"> - </span>}
                  {shouldScroll && currentTrack.title}
                </div>
              </div>
              <div className="track-meta">
                {currentTrack.creator && <span className="track-creator">{currentTrack.creator}</span>}
                {currentTrack.date && <span className="track-date">{currentTrack.date}</span>}
              </div>
            </>
          )}
        </div>

        {/* Bottom row: Time and status */}
        <div className="display-row display-footer">
          <div className="time-display">
            <span className="time-current">{timeDisplay.current}</span>
            <span className="time-separator">/</span>
            <span className="time-total">{timeDisplay.total}</span>
          </div>
          <div className="status-display">
            {isLoading ? (
              <span className="status-loading">TUNING</span>
            ) : isPlaying ? (
              <span className="status-playing">PLAYING</span>
            ) : currentTrack ? (
              <span className="status-paused">PAUSED</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
