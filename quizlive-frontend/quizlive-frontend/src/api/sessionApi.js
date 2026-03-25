/**
 * src/api/sessionApi.js
 * 
 * All API calls matched to actual backend routes.
 * Changes from original:
 *   - createSession: POST /sessions/create/  (was /sessions/create/ ✓ matches)
 *   - joinGame:      POST /sessions/join/     (new — was missing entirely)
 *   - getMySessions: GET  /sessions/          (was already correct)
 *   - getStatus:     GET  /sessions/<code>/status/ (unchanged)
 *   - analytics:     /analytics/sessions/<code>/summary|questions|players (added /summary/)
 */
import client from './client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Session management ───────────────────────────────────────────────────────

/** Teacher creates a new game session. Returns { game_code, ... } */
export const createSession = (quizId) =>
  client.post('/sessions/create/', { quiz_id: quizId });

/** List teacher's own sessions */
export const getMySessions = () =>
  client.get('/sessions/');

/**
 * Validate a game code before opening the WebSocket.
 * Returns { game_code, status, player_count } or 4xx with { error }.
 * Does NOT create a PlayerSession — that happens over WebSocket.
 */
export const joinGame = (gameCode, nickname) =>
  client.post('/sessions/join/', { game_code: gameCode, nickname });

/** Lightweight status check (no auth required) */
export const getStatus = (code) =>
  client.get(`/sessions/${code}/status/`);

export const getSessionDetail  = (code) => client.get(`/sessions/${code}/`);
export const getSessionPlayers = (code) => client.get(`/sessions/${code}/players/`);
export const endSession        = (code) => client.post(`/sessions/${code}/end/`);

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getSummary     = (code) => client.get(`/analytics/sessions/${code}/summary/`);
export const getQStats      = (code) => client.get(`/analytics/sessions/${code}/questions/`);
export const getPlayerStats = (code) => client.get(`/analytics/sessions/${code}/players/`);
export const exportCSVUrl   = (code) => `${BASE}/analytics/sessions/${code}/export/`;
