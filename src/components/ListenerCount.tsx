import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $isPlaying } from '../stores/player';
import { apiUrl } from '../lib/config';
import './ListenerCount.css';

export function ListenerCount() {
  const [count, setCount] = useState<number | null>(null);
  const isPlaying = useStore($isPlaying);

  useEffect(() => {
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
    // Heartbeat every 90s (server TTL is 180s) to reduce KV writes
    // Count fetch every 60s (server caches for 5 min anyway)
    if (isPlaying) {
      sendHeartbeat();
      const heartbeatInterval = setInterval(sendHeartbeat, 90000); // 90 seconds
      const countInterval = setInterval(fetchCount, 60000); // 60 seconds

      return () => {
        clearInterval(heartbeatInterval);
        clearInterval(countInterval);
      };
    }

    // Not playing, just poll count every 2 minutes
    const countInterval = setInterval(fetchCount, 120000);
    return () => clearInterval(countInterval);
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
