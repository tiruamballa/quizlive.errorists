/**
 * src/context/GameContext.jsx
 *
 * Additions over base version:
 *   streak           — consecutive correct answer count (from answer.ack)
 *   doublePointsActive — true when Double Points power-up is armed
 *   powerupsUsed     — string[] of consumed power-up types ("fifty_fifty" | "double_points" | "skip")
 *   removedOptionIds — string[] of option IDs hidden by 50/50 (reset on each new question)
 *   answeredCount    — how many players have answered current question (for host display)
 *   totalPlayers     — total player count for the session (for host display)
 *
 * New WS event handlers:
 *   powerup.result  — updates powerupsUsed, removedOptionIds, doublePointsActive
 *   answer.count    — updates answeredCount + totalPlayers
 *
 * Modified handlers:
 *   answer.ack      — also updates streak, clears doublePointsActive
 *   question.new    — resets removedOptionIds and answeredCount
 *   question.ended  — picks up totalPlayers from payload if present
 */
import { createContext, useContext, useState, useCallback } from 'react';

const GameContext = createContext(null);

const initial = {
  gameCode:          null,
  nickname:          null,
  playerId:          null,
  status:            'idle',
  players:           [],
  currentQuestion:   null,
  leaderboard:       [],
  myScore:           0,
  myRank:            null,
  podium:            [],
  allResults:        [],
  lastAnswer:        null,
  totalQuestions:    0,
  questionEnded:     false,
  correctIds:        [],
  // ── Power-ups & streak ──────────────────────────────────────────────────
  streak:            0,
  doublePointsActive: false,
  powerupsUsed:      [],
  removedOptionIds:  [],
  // ── Live answer count (host only) ────────────────────────────────────────
  answeredCount:     0,
  totalPlayers:      0,
  // ── Per-question history (for results breakdown) ─────────────────────────
  answerHistory:     [],   // { questionIndex, questionText, options, myOptionId, isCorrect, pointsAwarded, streak, correctIds, cumulativeScore }
  pendingOptionId:   null, // set by recordPlayerAnswer before answer.ack arrives
};

export function GameProvider({ children }) {
  const [game, setGame] = useState(initial);

  const updateGame = useCallback((patch) => {
    setGame(prev => ({ ...prev, ...patch }));
  }, []);

  // Called by GamePage right before sending answer.submit so we can
  // capture which option the player chose (server ack may not echo it back)
  const recordPlayerAnswer = useCallback((optionId) => {
    setGame(prev => ({ ...prev, pendingOptionId: optionId }));
  }, []);

  const resetGame = useCallback(() => setGame(initial), []);

  const handleWsEvent = useCallback((type, payload) => {
    setGame(prev => {
      switch (type) {

        // ── Join confirmed ────────────────────────────────────────────────
        case 'join.confirmed':
          return { ...prev, playerId: payload.player_id, nickname: payload.nickname };

        // ── Lobby ─────────────────────────────────────────────────────────
        case 'lobby.updated':
          return { ...prev, players: payload.players || [], status: 'lobby' };

        // ── Game started ──────────────────────────────────────────────────
        case 'game.started':
          return {
            ...prev,
            status:         'active',
            totalQuestions: payload.total_questions || prev.totalQuestions,
            answerHistory:  [],   // fresh history for new game
          };

        // ── New question — reset per-question state ────────────────────────
        case 'question.new':
          return {
            ...prev,
            currentQuestion:  payload,
            lastAnswer:       null,
            status:           'active',
            questionEnded:    false,
            correctIds:       [],
            totalQuestions:   payload.total || prev.totalQuestions,
            // Reset per-question power-up / answer state
            removedOptionIds: [],
            answeredCount:    0,
            totalPlayers:     payload.total_players ?? prev.totalPlayers,
          };

        // ── Player's own answer acknowledged ──────────────────────────────
        case 'answer.ack': {
          const q          = prev.currentQuestion;
          const pts        = payload.points || payload.points_awarded || 0;
          const newScore   = payload.is_correct ? prev.myScore + pts : prev.myScore;
          const histEntry  = {
            questionIndex:  q?.question_index ?? prev.answerHistory.length,
            questionText:   q?.text ?? '',
            options:        q?.options ?? [],
            myOptionId:     prev.pendingOptionId,   // captured before submit
            isCorrect:      payload.is_correct,
            pointsAwarded:  pts,
            streak:         payload.streak ?? 0,
            correctIds:     [],   // filled when question.ended fires
            cumulativeScore: newScore,
          };
          return {
            ...prev,
            lastAnswer:         payload,
            myScore:            newScore,
            myRank:             payload.rank ?? prev.myRank,
            streak:             payload.streak ?? prev.streak,
            doublePointsActive: false,
            pendingOptionId:    null,
            answerHistory:      [...prev.answerHistory, histEntry],
          };
        }

        // ── Live answer count update (host primarily, harmless for players) ─
        case 'answer.count':
          return {
            ...prev,
            answeredCount: payload.answered ?? prev.answeredCount,
            totalPlayers:  payload.total    ?? prev.totalPlayers,
          };

        // ── Power-up result from server ────────────────────────────────────
        case 'powerup.result': {
          const usedSet = [...prev.powerupsUsed];
          const pt      = payload.type;

          // Mark this powerup as consumed (deduped)
          if (pt && !usedSet.includes(pt)) usedSet.push(pt);

          const patch = { powerupsUsed: usedSet };

          if (pt === 'fifty_fifty') {
            patch.removedOptionIds = payload.hide_option_ids || [];
          }
          if (pt === 'double_points' && payload.active) {
            patch.doublePointsActive = true;
          }
          // 'skip' — no extra state needed; GamePage handles UI via powerupsUsed

          return { ...prev, ...patch };
        }

        // ── Question ended ────────────────────────────────────────────────
        case 'question.ended': {
          const correctIds     = payload.correct_ids || [];
          const history        = prev.answerHistory;
          // Backfill correctIds into the last entry so results page can show
          // "correct answer was X" even when player got it wrong
          const updatedHistory = history.length > 0
            ? [...history.slice(0, -1), { ...history[history.length - 1], correctIds }]
            : history;
          return {
            ...prev,
            questionEnded: true,
            correctIds,
            answerHistory: updatedHistory,
          };
        }

        // ── Leaderboard push ──────────────────────────────────────────────
        case 'leaderboard.update': {
          const rankings = payload.rankings || payload.leaderboard || [];
          const me       = rankings.find(r => r.player_id === prev.playerId);
          return {
            ...prev,
            leaderboard: rankings,
            myRank:      me?.rank ?? prev.myRank,
          };
        }

        // ── Game over ─────────────────────────────────────────────────────
        case 'game.ended':
          return {
            ...prev,
            status:      'ended',
            podium:      payload.podium || [],
            allResults:  payload.all    || [],
            leaderboard: payload.all    || [],
          };

        default:
          return prev;
      }
    });
  }, []);

  return (
    <GameContext.Provider value={{ game, updateGame, resetGame, recordPlayerAnswer, handleWsEvent }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);