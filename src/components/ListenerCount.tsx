import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $isPlaying } from '../stores/player';
import { apiUrl } from '../lib/config';
import './ListenerCount.css';

export function ListenerCount() {
  const [count, setCount] = useState<number | null>(null);
  const isPlaying = useStore($isPlaying);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const fetchCount = async () => {
      try {
        const response = await fetch(apiUrl('api/listeners'));
        const data = await response.json();
        setCount(data.count);
      } catch (e) {
        // Silently fail - listener count is optional
      }
    };

    const sendHeartbeat = async () => {
      try {
        await fetch(apiUrl('api/heartbeat'));
      } catch (e) {
        // Silently fail
      }
    };

    // Initial fetch
    fetchCount();

    // If playing, send heartbeats and refresh count
    if (isPlaying) {
      sendHeartbeat();
      interval = setInterval(() => {
        sendHeartbeat();
        fetchCount();
      }, 30000); // Every 30 seconds
    } else {
      // Not playing, just poll count less frequently
      interval = setInterval(fetchCount, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Don't show if count is unavailable
  if (count === null) return null;

  return (
    <div className="listener-count" title="Listeners tuned in">
      <span className={`listener-dot ${count > 0 ? 'active' : ''}`} />
      <span className="listener-number">{count}</span>
    </div>
  );
}
