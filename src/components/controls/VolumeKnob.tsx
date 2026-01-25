import { useStore } from '@nanostores/react';
import { $volume, setVolume } from '../../stores/player';
import { useRef, useState } from 'react';
import './VolumeKnob.css';

export function VolumeKnob() {
  const volume = useStore($volume);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Convert volume (0-1) to rotation (-135 to 135 degrees)
  const rotation = (volume * 270) - 135;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !knobRef.current) return;

    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate angle
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Convert to our rotation range (-135 to 135)
    // Adjust so that left is min, right is max
    angle = angle + 90; // Now: up = 0, right = 90, down = 180, left = -90

    // Clamp to valid range
    if (angle > 135) angle = 135;
    if (angle < -135) angle = -135;

    // Convert to volume (0-1)
    const newVolume = (angle + 135) / 270;
    setVolume(Math.max(0, Math.min(1, newVolume)));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Format volume as percentage
  const volumePercent = Math.round(volume * 100);

  return (
    <div className="volume-control">
      <div className="volume-label">VOL</div>

      <div
        ref={knobRef}
        className={`volume-knob ${isDragging ? 'dragging' : ''}`}
        style={{
          '--rotation': `${rotation}deg`,
        } as React.CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="knob-indicator" />

        {/* Scale marks */}
        <div className="volume-scale">
          {[0, 25, 50, 75, 100].map((mark) => (
            <div
              key={mark}
              className="scale-mark"
              style={{
                '--mark-angle': `${(mark / 100) * 270 - 135}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      <div className="volume-value">{volumePercent}%</div>
    </div>
  );
}
