import { useStore } from '@nanostores/react';
import { $isPlaying, $isPaused, $isLoading, $isPoweredOn, powerOn, powerOff } from '../../stores/player';
import { $queueLength } from '../../stores/queue';
import { getAudioManager } from '../../lib/audio-manager';
import './ControlButtons.css';

export function ControlButtons() {
  const isPlaying = useStore($isPlaying);
  const isPaused = useStore($isPaused);
  const isLoading = useStore($isLoading);
  const isPoweredOn = useStore($isPoweredOn);
  const queueLength = useStore($queueLength);

  const handlePowerToggle = async () => {
    if (isPoweredOn) {
      powerOff();
    } else {
      powerOn();
      // Start fetching tracks when powered on
      if (typeof window !== 'undefined') {
        const audioManager = getAudioManager();
        await audioManager.start();
      }
    }
  };

  const handlePlayPause = async () => {
    if (!isPoweredOn) return;

    if (typeof window !== 'undefined') {
      const audioManager = getAudioManager();
      await audioManager.toggle();
    }
  };

  const handleSkip = async () => {
    if (!isPoweredOn) return;

    if (typeof window !== 'undefined') {
      const audioManager = getAudioManager();
      await audioManager.playNext();
    }
  };

  return (
    <div className={`control-buttons ${!isPoweredOn ? 'power-off' : ''}`}>
      {/* Power button */}
      <button
        className={`control-button power-button ${isPoweredOn ? 'active' : ''}`}
        onClick={handlePowerToggle}
        type="button"
        aria-label={isPoweredOn ? 'Power off' : 'Power on'}
      >
        <svg viewBox="0 0 24 24" className="button-icon">
          <path
            d="M12 3v9M18.36 6.64a9 9 0 1 1-12.73 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Play/Pause button */}
      <button
        className={`control-button play-button ${isPlaying ? 'playing' : ''} ${!isPoweredOn ? 'disabled' : ''}`}
        onClick={handlePlayPause}
        disabled={!isPoweredOn || isLoading}
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <div className="loading-spinner" />
        ) : isPlaying ? (
          <svg viewBox="0 0 24 24" className="button-icon">
            <rect x="6" y="5" width="4" height="14" fill="currentColor" />
            <rect x="14" y="5" width="4" height="14" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="button-icon">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Skip button */}
      <button
        className={`control-button skip-button ${!isPoweredOn ? 'disabled' : ''}`}
        onClick={handleSkip}
        disabled={!isPoweredOn || isLoading}
        type="button"
        aria-label="Skip to next"
      >
        <svg viewBox="0 0 24 24" className="button-icon">
          <path d="M5 5v14l11-7z" fill="currentColor" />
          <rect x="16" y="5" width="3" height="14" fill="currentColor" />
        </svg>
      </button>

      {/* Queue indicator */}
      <div className="queue-indicator">
        <span className="queue-count">{queueLength}</span>
        <span className="queue-label">QUEUE</span>
      </div>
    </div>
  );
}
