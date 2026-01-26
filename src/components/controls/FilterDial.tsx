import { useStore } from '@nanostores/react';
import { $location, $genre, setLocation, setGenre } from '../../stores/filters';
import { $isPoweredOn } from '../../stores/player';
import { LOCATIONS, GENRES, PENGUIN_RADIO_GENRE, isAntarctica } from '../../lib/constants';
import { useRef, useState, useEffect } from 'react';
import './FilterDial.css';

interface FilterDialProps {
  type: 'location' | 'genre';
}

export function FilterDial({ type }: FilterDialProps) {
  const location = useStore($location);
  const currentValue = useStore(type === 'location' ? $location : $genre);
  const isPoweredOn = useStore($isPoweredOn);
  const setValue = type === 'location' ? setLocation : setGenre;

  // Easter egg: When Antarctica is selected, genre dial only shows Penguin Radio
  const isAntarcticaSelected = isAntarctica(location);
  const options = type === 'location'
    ? LOCATIONS
    : isAntarcticaSelected
      ? [PENGUIN_RADIO_GENRE] // Only Penguin Radio in Antarctica!
      : GENRES;

  // Auto-set genre to Penguin Radio when Antarctica is selected
  useEffect(() => {
    if (type === 'genre' && isAntarcticaSelected) {
      setGenre(PENGUIN_RADIO_GENRE.query);
    }
  }, [type, isAntarcticaSelected]);

  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Track if we just finished a drag to prevent click from firing
  const wasDraggingRef = useRef(false);

  // Find current index
  const getCurrentIndex = () => {
    if (!currentValue) return 0;
    const idx = options.findIndex((o) => o.query === currentValue);
    return idx >= 0 ? idx : 0;
  };

  const [currentIndex, setCurrentIndex] = useState(getCurrentIndex());

  // Track the latest index during drag (to avoid React state async issues)
  const latestIndexRef = useRef(currentIndex);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isPoweredOn) return; // Disable when powered off
    setIsDragging(true);
    wasDraggingRef.current = false; // Reset on new interaction
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dialRef.current) return;

    // Mark that we actually moved (dragged), not just clicked
    wasDraggingRef.current = true;

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
    const index = Math.round(angle / step) % options.length;

    setCurrentIndex(index);
    latestIndexRef.current = index;
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Only update value if we actually dragged (moved the pointer)
    if (wasDraggingRef.current) {
      const finalIndex = latestIndexRef.current;
      const option = options[finalIndex];
      console.log('[FilterDial] Drag complete - Setting', type, 'to:', option.query);
      setValue(option.query);
    }
    // wasDraggingRef stays true until click event processes it
  };

  // Click to cycle through options (only if not dragging)
  const handleClick = () => {
    if (!isPoweredOn) return; // Disable when powered off

    // If we just finished dragging, ignore this click
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      return;
    }

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
        onClick={handleClick}
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
