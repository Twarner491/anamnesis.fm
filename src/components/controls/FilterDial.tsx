import { useStore } from '@nanostores/react';
import { $location, $genre, setLocation, setGenre } from '../../stores/filters';
import { $isPoweredOn } from '../../stores/player';
import { LOCATIONS, GENRES } from '../../lib/constants';
import { useRef, useState } from 'react';
import './FilterDial.css';

interface FilterDialProps {
  type: 'location' | 'genre';
}

export function FilterDial({ type }: FilterDialProps) {
  const options = type === 'location' ? LOCATIONS : GENRES;
  const currentValue = useStore(type === 'location' ? $location : $genre);
  const isPoweredOn = useStore($isPoweredOn);
  const setValue = type === 'location' ? setLocation : setGenre;

  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Find current index
  const getCurrentIndex = () => {
    if (!currentValue) return 0;
    const idx = options.findIndex((o) => o.query === currentValue);
    return idx >= 0 ? idx : 0;
  };

  const [currentIndex, setCurrentIndex] = useState(getCurrentIndex());

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Track the latest index during drag (to avoid React state async issues)
  const latestIndexRef = useRef(currentIndex);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dialRef.current) return;

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate angle
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Convert to 0-360
    angle = (angle + 360) % 360;

    // Map angle to index
    const step = 360 / options.length;
    let index = Math.round(angle / step) % options.length;

    setCurrentIndex(index);
    latestIndexRef.current = index;
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Use ref to get the latest index (avoids React state async issues)
    const finalIndex = latestIndexRef.current;
    const option = options[finalIndex];
    console.log('[FilterDial] Setting', type, 'to:', option.query);
    setValue(option.query);
  };

  // Click to cycle through options
  const handleClick = () => {
    const newIndex = (currentIndex + 1) % options.length;
    setCurrentIndex(newIndex);
    latestIndexRef.current = newIndex;
    const option = options[newIndex];
    console.log('[FilterDial] Click - Setting', type, 'to:', option.query);
    setValue(option.query);
  };

  const rotation = (currentIndex / options.length) * 360;
  const currentOption = options[currentIndex];

  return (
    <div className={`filter-dial ${!isPoweredOn ? 'power-off' : ''}`}>
      <div className="filter-label">{type === 'location' ? 'REGION' : 'GENRE'}</div>

      <div
        ref={dialRef}
        className={`filter-knob ${isDragging ? 'dragging' : ''}`}
        style={{
          '--rotation': `${rotation}deg`,
        } as React.CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={!isDragging ? handleClick : undefined}
      >
        <div className="knob-indicator" />
        <div className="knob-ring">
          {options.map((option, i) => (
            <div
              key={option.id}
              className={`ring-mark ${i === currentIndex ? 'active' : ''}`}
              style={{
                '--mark-angle': `${(i / options.length) * 360}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      <div className="filter-value">{currentOption.label}</div>
    </div>
  );
}
