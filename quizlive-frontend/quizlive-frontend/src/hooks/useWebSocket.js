/**
 * src/hooks/useWebSocket.js
 *
 * FIX: token is now passed in as a prop from the component, NOT read from
 * localStorage inside the hook. This eliminates all timing/closure issues
 * where localStorage.getItem() returned empty inside the hook even though
 * the token was already set.
 */
import { useRef, useEffect, useCallback } from 'react';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

export function useWebSocket(gameCode, onMessage, token = '', enabled = true, extraParams = '') {
  const wsRef    = useRef(null);
  const retries  = useRef(0);
  const MAX      = 5;
  const onMsgRef = useRef(onMessage);

  useEffect(() => { onMsgRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    if (!gameCode || !enabled) return;

    const suffix = extraParams ? `&${extraParams}` : '';
    const url = token
      ? `${WS_BASE}/ws/game/${gameCode}/?token=${encodeURIComponent(token)}${suffix}`
      : `${WS_BASE}/ws/game/${gameCode}/${suffix ? '?' + suffix : ''}`;

    console.log('[WS] connecting — token present:', !!token, 'game:', gameCode);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] ✅ connected');
      retries.current = 0;
    };

    ws.onmessage = (e) => {
      try {
        const { type, payload } = JSON.parse(e.data);
        onMsgRef.current(type, payload || {});
      } catch {
        console.error('[WS] parse error', e.data);
      }
    };

    ws.onerror = (e) => console.error('[WS] error', e);

    ws.onclose = (e) => {
      console.log('[WS] closed code=', e.code);
      if (e.code !== 1000 && e.code !== 4004 && retries.current < MAX) {
        const delay = Math.min(1000 * 2 ** retries.current, 16000);
        retries.current++;
        setTimeout(connect, delay);
      }
    };
  }, [gameCode, token, enabled, extraParams]);

  useEffect(() => {
    connect();
    return () => {
      retries.current = MAX;
      wsRef.current?.close(1000);
    };
  }, [connect]);

  const send = useCallback((type, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[WS] send skipped — not open. readyState=',
                   wsRef.current?.readyState, 'type=', type);
    }
  }, []);

  return { send };
}
