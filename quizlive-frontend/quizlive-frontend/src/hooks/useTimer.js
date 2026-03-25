import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(onExpire) {
  const [timeLeft,  setTimeLeft]  = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const endRef  = useRef(null);
  const rafRef  = useRef(null);
  const cbRef   = useRef(onExpire);
  cbRef.current = onExpire;

  const start = useCallback((seconds) => {
    cancelAnimationFrame(rafRef.current);
    endRef.current = Date.now() + seconds * 1000;
    setTimeLeft(seconds);
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) { setIsRunning(false); cbRef.current?.(); }
      else           { rafRef.current = requestAnimationFrame(tick); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRunning]);

  return { timeLeft, isRunning, start, stop };
}
