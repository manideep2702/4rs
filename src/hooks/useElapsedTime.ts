import { useEffect, useState } from 'react';

/** Returns a live-updating elapsed time string (e.g. "2m 34s") from a start timestamp (ms). */
export function useElapsedTime(startMs: number | null): { label: string; seconds: number } {
  const [seconds, setSeconds] = useState(() =>
    startMs ? Math.floor((Date.now() - startMs) / 1000) : 0
  );

  useEffect(() => {
    if (!startMs) return;
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startMs]);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const label = m > 0 ? `${m}m ${s}s` : `${s}s`;
  return { label, seconds };
}
