import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $isPlaying, $isPoweredOn } from '../../stores/player';
import { getAudioManager } from '../../lib/audio-manager';
import './WaveformVisualizer.css';

export function WaveformVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const isPlaying = useStore($isPlaying);
  const isPoweredOn = useStore($isPoweredOn);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Initialize analyser when playing starts
  useEffect(() => {
    if (isPlaying && !analyser && typeof window !== 'undefined') {
      try {
        const audioManager = getAudioManager();
        const node = audioManager.initializeAnalyser();
        setAnalyser(node);
      } catch (e) {
        console.error('Failed to get analyser:', e);
      }
    }
  }, [isPlaying, analyser]);

  // Animation loop
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    let dataArray: Uint8Array | null = null;
    let bufferLength = 0;

    if (analyser) {
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      // Clear with dark background
      ctx.fillStyle = 'rgba(10, 10, 8, 0.3)';
      ctx.fillRect(0, 0, width, height);

      if (!isPoweredOn) {
        // Draw flatline when off
        ctx.strokeStyle = 'rgba(51, 255, 102, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      if (analyser && dataArray && isPlaying) {
        analyser.getByteFrequencyData(dataArray);

        // Draw frequency bars
        const barCount = 32;
        const barWidth = (width / barCount) - 2;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const dataIndex = i * step;
          const value = dataArray[dataIndex] / 255;
          const barHeight = value * height * 0.9;

          const x = i * (barWidth + 2);
          const y = height - barHeight;

          // Create gradient for each bar - green phosphor CRT style
          const gradient = ctx.createLinearGradient(x, height, x, y);
          gradient.addColorStop(0, 'rgba(51, 255, 102, 0.9)');
          gradient.addColorStop(0.5, 'rgba(51, 255, 102, 0.7)');
          gradient.addColorStop(1, 'rgba(0, 180, 60, 0.5)');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Glow effect - green phosphor
          ctx.shadowColor = 'rgba(51, 255, 102, 0.6)';
          ctx.shadowBlur = 10;
        }

        ctx.shadowBlur = 0;
      } else {
        // Draw idle animation when powered on but not playing
        const time = Date.now() / 1000;
        ctx.strokeStyle = 'rgba(51, 255, 102, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * 0.05 + time * 2) * 5;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      // Add scanline effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying, isPoweredOn]);

  return (
    <div className="waveform-container">
      <canvas ref={canvasRef} className="waveform-canvas" />
      <div className="waveform-overlay" />
      <div className="waveform-frame" />
    </div>
  );
}
