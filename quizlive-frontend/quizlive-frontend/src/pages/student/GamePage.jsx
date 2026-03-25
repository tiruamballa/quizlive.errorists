import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import Timer from '../../components/Timer';
import Leaderboard from '../../components/Leaderboard';
import ScorePopup from '../../components/ScorePopup';
import StarBackground from '../../components/StarBackground';

// Distinct colors+icons for each option slot
const OPTION_THEMES = [
  { bg:'rgba(124,58,237,0.15)', border:'rgba(124,58,237,0.5)', glow:'rgba(124,58,237,0.4)',
    color:'var(--purple-glow)', icon:'🟣', label:'A' },
  { bg:'rgba(0,212,255,0.12)',  border:'rgba(0,212,255,0.4)',  glow:'rgba(0,212,255,0.3)',
    color:'var(--cyan)',         icon:'🔵', label:'B' },
  { bg:'rgba(0,255,135,0.12)', border:'rgba(0,255,135,0.4)', glow:'rgba(0,255,135,0.3)',
    color:'var(--green)',        icon:'🟢', label:'C' },
  { bg:'rgba(255,107,53,0.12)',border:'rgba(255,107,53,0.4)',glow:'rgba(255,107,53,0.3)',
    color:'var(--orange)',       icon:'🟠', label:'D' },
];

// ── Injected keyframes ────────────────────────────────────────────────────────
const GAME_STYLES = `
  /* Answer reveal — shatter shake (wrong options) */
  @keyframes shatterWrong {
    0%   { transform: translateX(0) rotate(0deg); }
    12%  { transform: translateX(-7px) rotate(-1.5deg); }
    25%  { transform: translateX(6px)  rotate(1deg); }
    38%  { transform: translateX(-5px) rotate(-0.8deg); }
    50%  { transform: translateX(4px)  rotate(0.5deg); }
    65%  { transform: translateX(-2px); }
    80%  { transform: translateX(1px); }
    100% { transform: translateX(0) rotate(0deg); }
  }
  /* Hard shake for the player's own wrong pick */
  @keyframes shatterHard {
    0%   { transform: translateX(0) scale(1); }
    8%   { transform: translateX(-10px) scale(1.02); }
    18%  { transform: translateX(9px)  scale(1.02); }
    28%  { transform: translateX(-8px) scale(1.01); }
    38%  { transform: translateX(7px); }
    50%  { transform: translateX(-5px); }
    62%  { transform: translateX(4px); }
    74%  { transform: translateX(-2px); }
    86%  { transform: translateX(1px); }
    100% { transform: translateX(0) scale(1); }
  }
  /* Correct option — scale pulse */
  @keyframes correctPulse {
    0%   { transform: scale(1); box-shadow: 0 0 0px rgba(0,255,135,0); }
    30%  { transform: scale(1.04); box-shadow: 0 0 30px rgba(0,255,135,0.7); }
    60%  { transform: scale(1.02); box-shadow: 0 0 20px rgba(0,255,135,0.5); }
    100% { transform: scale(1);    box-shadow: 0 0 16px rgba(0,255,135,0.35); }
  }
  /* Glow ring that expands outward from correct option */
  @keyframes glowRingExpand {
    0%   { transform: scale(1);   opacity: 0.9; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  /* Question card flip-in from left */
  @keyframes questionFlipIn {
    0%   { transform: perspective(900px) rotateY(-90deg) scale(0.92); opacity: 0; }
    60%  { transform: perspective(900px) rotateY(8deg)   scale(1.01); opacity: 1; }
    100% { transform: perspective(900px) rotateY(0deg)   scale(1);    opacity: 1; }
  }
  /* Options cascade in */
  @keyframes optCascadeIn {
    0%   { opacity: 0; transform: translateY(14px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0)    scale(1); }
  }
  /* Wrong option dim-out after shake */
  @keyframes dimOut {
    0%   { opacity: 1; filter: saturate(1); }
    100% { opacity: 0.22; filter: saturate(0.15) brightness(0.7); }
  }
  /* Correct checkmark bounce */
  @keyframes checkBounce {
    0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
    55%  { transform: scale(1.3) rotate(6deg);  opacity: 1; }
    80%  { transform: scale(0.9) rotate(-3deg); }
    100% { transform: scale(1)   rotate(0deg); opacity: 1; }
  }
`;

// ── Power-up button ──────────────────────────────────────────────────────────
function PowerupBtn({ icon, label, available, active, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!available}
      style={{
        background: active
          ? 'rgba(255,215,0,0.18)'
          : available
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.02)',
        border: `2px solid ${
          active    ? 'var(--gold)'
          : available ? 'rgba(255,255,255,0.18)'
          : 'rgba(255,255,255,0.05)'
        }`,
        borderRadius: 'var(--radius-md)',
        padding: '0.6rem 1.1rem',
        cursor: available ? 'pointer' : 'not-allowed',
        opacity: available ? 1 : 0.3,
        color: active ? 'var(--gold)' : available ? 'var(--text-bright)' : 'var(--text-dim)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        minWidth: 80,
        boxShadow: active ? '0 0 16px rgba(255,215,0,0.35)' : 'none',
      }}
    >
      <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em',
        textTransform: 'uppercase' }}>{label}</span>
      {active && (
        <span style={{ fontSize: '0.6rem', color: 'var(--gold)',
          fontWeight: 700, animation: 'pulse 1s infinite' }}>ARMED</span>
      )}
      {!available && (
        <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>USED</span>
      )}
    </button>
  );
}

// ── Answer option button ─────────────────────────────────────────────────────
function OptionButton({ opt, index, selected, disabled, correct, wrong, onSelect, revealPhase, cascadeDelay }) {
  const theme = OPTION_THEMES[index % 4];
  const isSelected = selected === opt.id;
  const isCorrect  = correct && correct.includes(opt.id);
  const isWrong    = isSelected && wrong;

  // ── Reveal state logic ───────────────────────────────────────────────────
  const isRevealing = revealPhase === 'revealing';
  // This option is a wrong one that was NOT chosen by the player
  const isOtherWrong = isRevealing && !isCorrect && !isSelected;
  // This option is the player's wrong pick
  const isMyWrong    = isRevealing && isSelected && !isCorrect;

  let borderColor = isCorrect ? 'var(--green)'
                 : isWrong || isMyWrong ? 'var(--pink)'
                 : isSelected ? theme.border
                 : 'rgba(255,255,255,0.08)';
  let bg = isCorrect && isRevealing ? 'rgba(0,255,135,0.22)'
         : isCorrect           ? 'rgba(0,255,135,0.2)'
         : isWrong || isMyWrong ? 'rgba(255,0,110,0.15)'
         : isSelected           ? theme.bg
         : 'var(--bg-card)';
  let glow = isCorrect ? '0 0 24px rgba(0,255,135,0.6), 0 0 48px rgba(0,255,135,0.2)'
           : isWrong || isMyWrong ? '0 0 20px rgba(255,0,110,0.4)'
           : isSelected ? `0 0 20px ${theme.glow}`
           : 'none';

  // Pick the right animation
  let animation = 'none';
  if (cascadeDelay !== undefined) {
    animation = `optCascadeIn 0.35s cubic-bezier(0.22,1,0.36,1) ${cascadeDelay}ms both`;
  }
  if (isRevealing) {
    if (isCorrect)    animation = 'correctPulse 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both';
    else if (isMyWrong)  animation = 'shatterHard 0.55s ease 0s both';
    else if (isOtherWrong) animation = 'shatterWrong 0.4s ease 0.05s both, dimOut 0.5s ease 0.3s both forwards';
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Glow ring — only on correct during reveal */}
      {isRevealing && isCorrect && (
        <>
          <div style={{
            position: 'absolute', inset: -2, borderRadius: 14,
            border: '2px solid rgba(0,255,135,0.7)',
            animation: 'glowRingExpand 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s both',
            pointerEvents: 'none', zIndex: 0,
          }} />
          <div style={{
            position: 'absolute', inset: -2, borderRadius: 14,
            border: '2px solid rgba(0,255,135,0.5)',
            animation: 'glowRingExpand 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s both',
            pointerEvents: 'none', zIndex: 0,
          }} />
        </>
      )}

      <button
        onClick={() => !disabled && onSelect(opt.id)}
        disabled={disabled}
        className="option-btn"
        style={{
          position: 'relative', zIndex: 1,
          background: bg,
          border: `2px solid ${borderColor}`,
          color: isCorrect ? 'var(--green)'
               : isWrong || isMyWrong ? 'var(--pink)'
               : theme.color,
          boxShadow: glow,
          transform: isSelected && !disabled && !isRevealing ? 'translateX(4px)' : 'none',
          cursor: disabled ? 'default' : 'pointer',
          // Base opacity; dimOut animation overrides this for other-wrong options
          opacity: (disabled && !isSelected && !isCorrect && !isRevealing) ? 0.5 : 1,
          transition: isRevealing ? 'border-color 0.3s, background 0.3s, box-shadow 0.3s'
                                  : 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          display:'flex', alignItems:'center', gap:'0.75rem',
          animation,
          width: '100%',
        }}
      >
        <span style={{
          width:36, height:36, borderRadius:'50%', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          background: isCorrect ? 'rgba(0,255,135,0.3)'
                   : isWrong || isMyWrong ? 'rgba(255,0,110,0.25)'
                   : `${theme.color}25`,
          border:`2px solid ${borderColor}`,
          fontFamily:'var(--font-display)', fontWeight:900, fontSize:'0.9rem',
        }}>
          {(isCorrect && isRevealing) ? (
            <span style={{ animation: 'checkBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both', display:'block' }}>✓</span>
          ) : isCorrect ? '✓'
            : isWrong || isMyWrong ? '✗'
            : theme.label}
        </span>
        <span style={{ fontWeight:600, fontSize:'1.05rem', textAlign:'left' }}>
          {opt.text}
        </span>
        {isCorrect && isRevealing && (
          <span style={{
            marginLeft:'auto', fontSize:'1.25rem', flexShrink:0,
            animation: 'checkBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.35s both',
            display: 'block',
          }}>✅</span>
        )}
        {isCorrect && !isRevealing && (
          <span style={{ marginLeft:'auto', fontSize:'1.25rem', flexShrink:0 }}>✅</span>
        )}
      </button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function GamePage() {
  const { code }                          = useParams();
  const navigate                          = useNavigate();
  const { game, handleWsEvent, recordPlayerAnswer } = useGame();
  const [selectedOpt, setSelectedOpt]    = useState(null);
  const [answered,    setAnswered]        = useState(false);
  const [timerOn,     setTimerOn]        = useState(false);
  const [showBoard,   setShowBoard]      = useState(false);
  const [revealPhase,  setRevealPhase]   = useState('idle');   // 'idle' | 'revealing'
  const [questionAnimKey, setQuestionAnimKey] = useState(0);   // increments to retrigger flip-in

  const sendRef     = useRef(null);
  const nicknameRef = useRef(game.nickname || '');
  useEffect(() => { nicknameRef.current = game.nickname || ''; }, [game.nickname]);

  const onMessage = useCallback((type, payload) => {
    handleWsEvent(type, payload);

    if (type === 'connected') {
      const nick = nicknameRef.current;
      if (nick) sendRef.current?.('player.join', { nickname: nick });
    }
    if (type === 'question.new') {
      setSelectedOpt(null);
      setAnswered(false);
      setShowBoard(false);
      setRevealPhase('idle');
      setTimerOn(true);
      setQuestionAnimKey(k => k + 1);  // retriggers flip-in
    }
    if (type === 'question.ended') {
      setTimerOn(false);
      // Start reveal animation, delay leaderboard so reveal plays out fully
      setRevealPhase('revealing');
      setTimeout(() => {
        setRevealPhase('idle');
        setShowBoard(true);
      }, 1600);
    }
    if (type === 'game.ended') {
      navigate(`/results/${code}`);
    }
    // Skip powerup: mark answered so options disable immediately
    if (type === 'powerup.result' && payload.type === 'skip') {
      setAnswered(true);
    }
  }, [code, navigate, handleWsEvent]);

  const _token = localStorage.getItem('access') || '';
  const { send } = useWebSocket(code, onMessage, _token);
  sendRef.current = send;

  const submitAnswer = (optionId) => {
    if (answered) return;
    setAnswered(true);
    setSelectedOpt(optionId);
    recordPlayerAnswer(optionId);   // snapshot before ack arrives
    send('answer.submit', {
      question_id: game.currentQuestion?.question_id,
      option_id:   optionId,
    });
  };

  const usePowerup = (type) => {
    send('powerup.use', { type });
  };

  const q = game.currentQuestion;

  // ── Waiting screen ────────────────────────────────────────────────────────
  if (!q) return (
    <div className="page-bg" style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <StarBackground density={40} />
      <div style={{ zIndex:1, textAlign:'center', animation:'fadeIn 0.5s ease' }}>
        <div style={{ fontSize:'4rem', marginBottom:'1rem', animation:'spin 2s linear infinite' }}>⚙️</div>
        <h2 style={{ fontFamily:'var(--font-heading)', color:'var(--text-bright)', marginBottom:'0.5rem' }}>
          Game Starting…
        </h2>
        <p style={{ color:'var(--text-dim)' }}>Get ready! First question incoming.</p>
        <div style={{ display:'flex', gap:'0.5rem', justifyContent:'center', marginTop:'1.5rem' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width:14, height:14, borderRadius:'50%', background:'var(--purple-glow)',
              animation:`pulse 1s ${i*0.2}s infinite`, boxShadow:'0 0 10px var(--purple-glow)',
            }} />
          ))}
        </div>
      </div>
    </div>
  );

  const wrongAnswer   = answered && game.lastAnswer && !game.lastAnswer.is_correct;
  // Filter out options hidden by 50/50 power-up (only during active answer phase)
  const visibleOptions = !showBoard
    ? (q.options?.filter(o => !game.removedOptionIds.includes(o.id)) || [])
    : (q.options || []);

  // Streak multiplier label helper
  const streakMult = game.streak >= 5 ? '×2' : game.streak >= 3 ? '×1.5' : null;

  return (
    <div className="page-bg" style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <style>{GAME_STYLES}</style>
      <StarBackground density={25} />
      <ScorePopup answer={game.lastAnswer} />

      {/* ── Top HUD ────────────────────────────────────────────────────────── */}
      <div style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(5,5,16,0.9)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--border-subtle)',
        padding:'0.75rem 1.5rem',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.75rem',
        flexWrap:'wrap',
      }}>
        {/* Progress */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flex:1, minWidth:120 }}>
          <span style={{ color:'var(--text-dim)', fontSize:'0.8rem', whiteSpace:'nowrap',
            fontFamily:'var(--font-heading)', fontWeight:700 }}>
            Q{q.question_index+1}/{game.totalQuestions}
          </span>
          <div style={{ flex:1, height:6, borderRadius:3, background:'rgba(255,255,255,0.1)', overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:3,
              background:'linear-gradient(90deg, var(--purple), var(--cyan))',
              width:`${((q.question_index+1)/game.totalQuestions)*100}%`,
              transition:'width 0.4s ease',
              boxShadow:'0 0 8px rgba(0,212,255,0.5)',
            }} />
          </div>
        </div>

        {/* Difficulty badge */}
        <span className={`badge diff-${q.difficulty}`} style={{ textTransform:'capitalize' }}>
          {q.difficulty}
        </span>

        {/* Streak badge — only shown when streak ≥ 2 */}
        {game.streak >= 2 && (
          <div style={{
            display:'flex', alignItems:'center', gap:'0.3rem',
            background:'rgba(255,107,53,0.12)', border:'1px solid rgba(255,107,53,0.4)',
            padding:'0.35rem 0.75rem', borderRadius:'var(--radius-pill)',
            color:'var(--orange)', fontWeight:800, fontSize:'0.85rem',
            animation: game.streak >= 5 ? 'pulse 0.8s infinite' : 'none',
          }}>
            🔥 {game.streak}
            {streakMult && (
              <span style={{ fontSize:'0.7rem', opacity:0.9 }}>{streakMult}</span>
            )}
          </div>
        )}

        {/* Double Points armed indicator */}
        {game.doublePointsActive && (
          <div style={{
            display:'flex', alignItems:'center', gap:'0.3rem',
            background:'rgba(255,215,0,0.12)', border:'1px solid rgba(255,215,0,0.5)',
            padding:'0.35rem 0.75rem', borderRadius:'var(--radius-pill)',
            color:'var(--gold)', fontWeight:800, fontSize:'0.85rem',
            animation:'pulse 1s infinite',
            boxShadow:'0 0 12px rgba(255,215,0,0.25)',
          }}>
            ⚡ 2×
          </div>
        )}

        {/* My score */}
        <div style={{
          display:'flex', alignItems:'center', gap:'0.4rem',
          background:'rgba(255,215,0,0.08)', border:'1px solid rgba(255,215,0,0.2)',
          padding:'0.35rem 0.9rem', borderRadius:'var(--radius-pill)',
        }}>
          <span style={{ fontSize:'1rem' }}>⭐</span>
          <span style={{
            fontFamily:'var(--font-display)', fontWeight:900,
            color:'var(--gold)', fontSize:'1rem',
          }}>
            {game.myScore.toLocaleString()}
          </span>
        </div>

        {/* Rank */}
        {game.myRank && (
          <div style={{
            background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.3)',
            padding:'0.35rem 0.9rem', borderRadius:'var(--radius-pill)',
            color:'var(--purple-glow)', fontWeight:700, fontSize:'0.9rem',
          }}>
            #{game.myRank}
          </div>
        )}
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div style={{
        flex:1, display:'flex', flexDirection:'column', alignItems:'center',
        padding:'1.5rem', gap:'1.25rem', position:'relative', zIndex:1,
      }}>

        {/* Timer */}
        {!showBoard && (
          <div style={{ width:'100%', maxWidth:560, animation:'fadeIn 0.3s ease' }}>
            <Timer seconds={q.time_limit} running={timerOn} onExpire={() => setTimerOn(false)} />
          </div>
        )}

        {/* ── Power-up bar — visible only before answering ──────────────────── */}
        {!showBoard && !answered && (
          <div style={{
            display:'flex', gap:'0.6rem', justifyContent:'center', flexWrap:'wrap',
            width:'100%', maxWidth:420,
            animation:'fadeIn 0.35s ease',
          }}>
            <PowerupBtn
              icon="✂️"
              label="50/50"
              available={!game.powerupsUsed.includes('fifty_fifty')}
              onClick={() => usePowerup('fifty_fifty')}
            />
            <PowerupBtn
              icon="⚡"
              label="2× Points"
              available={!game.powerupsUsed.includes('double_points')}
              active={game.doublePointsActive}
              onClick={() => usePowerup('double_points')}
            />
            <PowerupBtn
              icon="⏭"
              label="Skip"
              available={!game.powerupsUsed.includes('skip')}
              onClick={() => usePowerup('skip')}
            />
          </div>
        )}

        {/* Question card — re-keyed each question so flip-in retriggers */}
        <div key={questionAnimKey} className="card glass" style={{
          width:'100%', maxWidth:700, padding:'2rem',
          border:'1px solid rgba(124,58,237,0.25)',
          background:'linear-gradient(135deg, rgba(13,13,46,0.8), rgba(124,58,237,0.04))',
          animation:'questionFlipIn 0.5s cubic-bezier(0.22,1,0.36,1)',
          textAlign:'center',
          transformStyle: 'preserve-3d',
        }}>
          <h2 style={{
            fontFamily:'var(--font-heading)', fontSize:q.text.length > 100 ? '1.25rem' : '1.6rem',
            fontWeight:700, color:'var(--text-bright)', lineHeight:1.4, margin:0,
          }}>
            {q.text}
          </h2>
        </div>

        {/* Leaderboard shown after question ends */}
        {showBoard ? (
          <div style={{ width:'100%', maxWidth:450, animation:'fadeInScale 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <Leaderboard rankings={game.leaderboard} myId={game.playerId} />
          </div>
        ) : (
          /* Answer options — 50/50 filters visibleOptions */
          <div key={`opts-${questionAnimKey}`} style={{
            display:'grid',
            gridTemplateColumns: visibleOptions.length <= 2 ? '1fr' : '1fr 1fr',
            gap:'0.75rem', width:'100%', maxWidth:700,
          }}>
            {visibleOptions.map((opt, gridIdx) => {
              const originalIndex = q.options?.findIndex(o => o.id === opt.id) ?? 0;
              return (
                <OptionButton key={opt.id} opt={opt} index={originalIndex}
                  selected={selectedOpt}
                  disabled={answered}
                  correct={game.questionEnded ? game.correctIds : null}
                  wrong={wrongAnswer}
                  onSelect={submitAnswer}
                  revealPhase={revealPhase}
                  cascadeDelay={gridIdx * 60}
                />
              );
            })}
          </div>
        )}

        {/* Answered / skipped status */}
        {answered && !showBoard && (
          <div style={{
            color:'var(--text-dim)', fontSize:'0.875rem',
            animation:'fadeIn 0.3s ease',
            display:'flex', alignItems:'center', gap:'0.5rem',
          }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)',
              boxShadow:'0 0 8px var(--green)', animation:'pulse 1s infinite' }} />
            {game.powerupsUsed.includes('skip') && selectedOpt === null
              ? 'Question skipped!'
              : 'Answer submitted! Waiting for results…'}
          </div>
        )}
      </div>
    </div>
  );
}