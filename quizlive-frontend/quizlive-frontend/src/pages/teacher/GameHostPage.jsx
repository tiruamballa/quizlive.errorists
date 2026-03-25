/**
 * src/pages/teacher/GameHostPage.jsx
 *
 * Additions over base version:
 *   - Timer component shown during active questions (host-side countdown)
 *   - Live "X/Y answered" counter updated in real-time via answer.count WS events
 *   - Progress bar inside the answer counter
 *   - timerOn state wired to question.new / question.ended / game.ended events
 */
import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import Timer from '../../components/Timer';
import Leaderboard from '../../components/Leaderboard';
import StarBackground from '../../components/StarBackground';

const OPT_COLORS = ['var(--purple-glow)', 'var(--cyan)', 'var(--green)', 'var(--orange)'];

export default function GameHostPage() {
  const { code }   = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { game, updateGame, handleWsEvent } = useGame();

  const [copied,  setCopied]  = useState(false);
  const [wsError, setWsError] = useState('');
  const [timerOn, setTimerOn] = useState(false);

  const token = useRef(localStorage.getItem('access') || '').current;

  useEffect(() => {
    updateGame({ gameCode: code, status: 'lobby' });
  }, [code]);

  const onMessage = useCallback((type, payload) => {
    handleWsEvent(type, payload);

    if (type === 'question.new') {
      setTimerOn(true);
    }
    if (type === 'question.ended') {
      setTimerOn(false);
    }
    if (type === 'game.ended') {
      setTimerOn(false);
    }
    if (type === 'error') {
      setWsError(payload.message || 'Unknown error from server');
      setTimeout(() => setWsError(''), 5000);
    }
  }, [handleWsEvent]);

  const { send } = useWebSocket(code, onMessage, token, true, 'host=1');

  const copyCode = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    setWsError('');
    send('game.start', {});
  };

  const handleEndGame = () => {
    send('game.end', {});
    setTimeout(() => navigate(`/analytics/${code}`), 1500);
  };

  const q            = game.currentQuestion;
  const nonHostCount = game.players.filter(p => p.nickname !== user?.username).length;

  return (
    <div className="page-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <StarBackground density={30} />

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(5,5,16,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 2rem', height: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>🎯</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem',
              fontWeight: 900, color: 'var(--text-bright)', letterSpacing: '0.05em' }}>
              HOST CONTROL
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
              {game.status === 'lobby'
                ? `${nonHostCount} player${nonHostCount !== 1 ? 's' : ''} in lobby`
                : game.status === 'active'
                ? `Q${(q?.question_index ?? 0) + 1} / ${game.totalQuestions}`
                : 'Game over'}
            </div>
          </div>
        </div>

        {/* Game code badge */}
        <div onClick={copyCode} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)',
          padding: '0.4rem 1.5rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
          transition: 'all 0.2s',
        }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.6rem',
            fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {copied ? '✓ Copied!' : 'Game Code (click to copy)'}
          </span>
          <span className="game-code" style={{ fontSize: '2rem', letterSpacing: '0.2em' }}>{code}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {game.status === 'ended' && (
            <button className="btn btn-cyan" onClick={() => navigate(`/analytics/${code}`)}>
              📊 Analytics
            </button>
          )}
          <button className="btn btn-danger" onClick={handleEndGame}>⏹ End Game</button>
        </div>
      </nav>

      {/* Error banner */}
      {wsError && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: 'rgba(220,38,38,0.95)', color: '#fff',
          padding: '0.75rem 2rem', borderRadius: 'var(--radius-md)',
          fontWeight: 700, fontSize: '0.9rem',
          boxShadow: '0 4px 30px rgba(220,38,38,0.5)',
          animation: 'fadeIn 0.3s ease', whiteSpace: 'nowrap',
        }}>
          ⚠️ {wsError}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, position: 'relative', zIndex: 1 }}>

        {/* ── Main panel ─────────────────────────────────────────────────────── */}
        <div style={{ flex: '1 1 0', padding: '2rem', minWidth: 0 }}>

          {/* LOBBY */}
          {game.status === 'lobby' && (
            <div style={{ animation: 'fadeIn 0.5s ease' }}>
              <div className="card card-glow" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                  display: 'inline-block', marginBottom: '1rem',
                  background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)',
                  borderRadius: 'var(--radius-md)', padding: '0.5rem 1.5rem',
                }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Share → </span>
                  <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-display)',
                    fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.15em' }}>
                    localhost:5173/join/{code}
                  </span>
                </div>

                <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>
                  {nonHostCount === 0
                    ? 'Waiting for players to join…'
                    : `${nonHostCount} player${nonHostCount !== 1 ? 's' : ''} ready!`}
                </p>

                <button
                  className="btn btn-green btn-xl"
                  disabled={nonHostCount === 0}
                  onClick={handleStartGame}
                  style={{
                    fontSize: '1.3rem', padding: '1.1rem 3rem',
                    opacity: nonHostCount === 0 ? 0.4 : 1,
                    cursor:  nonHostCount === 0 ? 'not-allowed' : 'pointer',
                  }}>
                  ▶ Start Game{nonHostCount > 0 ? ` (${nonHostCount} players)` : ''}
                </button>
              </div>

              {game.players.length > 0 && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-dim)',
                    fontSize: '0.85rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    PLAYERS IN LOBBY
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                    {game.players.filter(p => p.nickname !== user?.username).map((p, i) => (
                      <div key={p.player_id || i} style={{
                        padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-pill)',
                        background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
                        color: 'var(--purple-glow)', fontWeight: 700, fontSize: '0.9rem',
                        animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                      }}>
                        {p.nickname}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE QUESTION */}
          {game.status === 'active' && q && (
            <div style={{ animation: 'fadeInScale 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>

              {/* Progress bar */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3,
                  background: 'rgba(124,58,237,0.2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: 'linear-gradient(90deg, var(--purple), var(--cyan))',
                    width: `${(((q.question_index ?? 0) + 1) / game.totalQuestions) * 100}%`,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  Q{(q.question_index ?? 0) + 1} / {game.totalQuestions}
                </span>
              </div>

              {/* ── Timer + live answer counter row ────────────────────────── */}
              <div style={{
                display: 'flex', gap: '1.25rem', alignItems: 'stretch',
                marginBottom: '1.5rem', flexWrap: 'wrap',
              }}>
                {/* Timer */}
                <div style={{
                  background: 'rgba(13,13,46,0.6)', border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: 'var(--radius-md)', padding: '1rem 1.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Timer
                    seconds={q.time_limit || q.time_limit_secs || 30}
                    running={timerOn}
                    onExpire={() => setTimerOn(false)}
                  />
                </div>

                {/* Live answer counter */}
                <div style={{
                  flex: 1, minWidth: 200,
                  background: 'rgba(0,212,255,0.05)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  borderRadius: 'var(--radius-md)', padding: '1.25rem 1.5rem',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900,
                      color: 'var(--cyan)', lineHeight: 1,
                    }}>
                      {game.answeredCount}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '1.3rem', fontWeight: 700 }}>
                      /{game.totalPlayers}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem',
                      marginLeft: '0.25rem', fontWeight: 600 }}>
                      answered
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    height: 10, borderRadius: 5,
                    background: 'rgba(0,212,255,0.1)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 5,
                      background: 'linear-gradient(90deg, var(--cyan), var(--green))',
                      width: game.totalPlayers > 0
                        ? `${Math.min((game.answeredCount / game.totalPlayers) * 100, 100)}%`
                        : '0%',
                      transition: 'width 0.4s ease',
                      boxShadow: '0 0 10px rgba(0,212,255,0.5)',
                    }} />
                  </div>
                  {game.answeredCount >= game.totalPlayers && game.totalPlayers > 0 && (
                    <div style={{
                      fontSize: '0.75rem', color: 'var(--green)', fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}>
                      ✓ All players answered
                    </div>
                  )}
                </div>
              </div>

              {/* Question text */}
              <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem',
                border: '1px solid rgba(124,58,237,0.2)' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem',
                  fontWeight: 700, color: 'var(--text-bright)', lineHeight: 1.35, margin: 0 }}>
                  {q.text}
                </h2>
              </div>

              {/* Answer options (read-only for host) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem', marginBottom: '1.5rem' }}>
                {q.options?.map((opt, i) => (
                  <div key={opt.id} style={{
                    padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)',
                    border: `2px solid ${OPT_COLORS[i]}40`,
                    background: `${OPT_COLORS[i]}0D`,
                    display: 'flex', gap: '0.75rem', alignItems: 'center',
                  }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `${OPT_COLORS[i]}25`, border: `2px solid ${OPT_COLORS[i]}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, color: OPT_COLORS[i], flexShrink: 0, fontSize: '0.85rem',
                    }}>
                      {['A','B','C','D'][i]}
                    </span>
                    <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{opt.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ENDED */}
          {game.status === 'ended' && (
            <div className="card" style={{
              textAlign: 'center', padding: '4rem',
              border: '1px solid rgba(0,255,135,0.2)',
              animation: 'fadeInScale 0.5s ease',
            }}>
              <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🏁</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem',
                color: 'var(--green)', marginBottom: '0.5rem' }}>Game Complete!</h2>
              <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>
                {game.leaderboard.length} players competed
              </p>
              <button className="btn btn-primary btn-xl"
                onClick={() => navigate(`/analytics/${code}`)}>
                📊 View Full Analytics →
              </button>
            </div>
          )}
        </div>

        {/* ── Sidebar leaderboard ─────────────────────────────────────────────── */}
        <div style={{ width: 300, flexShrink: 0, padding: '1.5rem 1.5rem 1.5rem 0',
          display: 'flex', flexDirection: 'column' }}>
          <Leaderboard rankings={game.leaderboard} title="🏆 Live Scores" compact />
        </div>
      </div>
    </div>
  );
}