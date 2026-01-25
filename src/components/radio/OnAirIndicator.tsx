import { useStore } from '@nanostores/react';
import { $isPlaying, $isPoweredOn } from '../../stores/player';
import './OnAirIndicator.css';

export function OnAirIndicator() {
  const isPlaying = useStore($isPlaying);
  const isPoweredOn = useStore($isPoweredOn);

  const isActive = isPoweredOn && isPlaying;

  return (
    <div className={`on-air-indicator ${isActive ? 'active' : ''}`}>
      <div className="on-air-light" />
      <span className="on-air-text">ON AIR</span>
    </div>
  );
}
