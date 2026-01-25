import { useRef, useState, useCallback, useEffect } from 'react';
import './DialBase.css';

interface DialOption {
  id: string;
  label: string;
  position: number; // degrees (0-360)
}

interface DialBaseProps {
  options: DialOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
  minAngle?: number;
  maxAngle?: number;
  size?: 'small' | 'medium' | 'large';
}

export function DialBase({
  options,
  value,
  onChange,
  label,
  minAngle = 0,
  maxAngle = 180,
  size = 'medium',
}: DialBaseProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Find current option and set initial rotation
  useEffect(() => {
    const currentOption = options.find((o) => o.id === value || (value === null && o.id === 'all'));
    if (currentOption) {
      setRotation(currentOption.position);
    }
  }, [value, options]);

  const getOptionFromRotation = useCallback(
    (deg: number): DialOption => {
      // Normalize to valid range
      const normalized = Math.max(minAngle, Math.min(maxAngle, deg));

      // Find closest option
      let closest = options[0];
      let minDiff = Infinity;

      for (const option of options) {
        const diff = Math.abs(option.position - normalized);
        if (diff < minDiff) {
          minDiff = diff;
          closest = option;
        }
      }

      return closest;
    },
    [options, minAngle, maxAngle]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dialRef.current) return;

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate angle from center
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Convert to 0-360 range with 0 at top
    angle = (angle + 90 + 360) % 360;

    // Map to our dial range (typically 0-180 for half-circle dial)
    // We use the left half of the circle (270-90 degrees mapped to 0-180)
    let mappedAngle;
    if (angle >= 270) {
      mappedAngle = (angle - 270) * (maxAngle / 180);
    } else if (angle <= 90) {
      mappedAngle = (angle + 90) * (maxAngle / 180);
    } else {
      // Outside the valid range, clamp
      mappedAngle = angle < 180 ? maxAngle : minAngle;
    }

    // Clamp to valid range
    mappedAngle = Math.max(minAngle, Math.min(maxAngle, mappedAngle));
    setRotation(mappedAngle);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Snap to nearest option
    const option = getOptionFromRotation(rotation);
    setRotation(option.position);

    // Update value
    const newValue = option.id === 'all' ? null : option.id;
    onChange(newValue);
  };

  // Click on scale markers to jump to that option
  const handleOptionClick = (option: DialOption) => {
    setRotation(option.position);
    const newValue = option.id === 'all' ? null : option.id;
    onChange(newValue);
  };

  const currentOption = getOptionFromRotation(rotation);

  return (
    <div className={`dial-container dial-${size}`}>
      <div className="dial-label">{label}</div>

      <div className="dial-wrapper">
        {/* Scale markers */}
        <div className="dial-scale">
          {options.map((option) => (
            <button
              key={option.id}
              className={`scale-mark ${option.id === currentOption.id ? 'active' : ''}`}
              style={{
                '--position': `${(option.position / maxAngle) * 100}%`,
              } as React.CSSProperties}
              onClick={() => handleOptionClick(option)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Rotary dial knob */}
        <div
          ref={dialRef}
          className={`dial-knob ${isDragging ? 'dragging' : ''}`}
          style={{
            '--rotation': `${rotation - maxAngle / 2}deg`,
          } as React.CSSProperties}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div className="dial-indicator" />
          <div className="dial-grip" />
        </div>
      </div>

      <div className="dial-value">{currentOption.label}</div>
    </div>
  );
}
