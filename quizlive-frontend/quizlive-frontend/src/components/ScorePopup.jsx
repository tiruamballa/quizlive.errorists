import { useEffect, useState, useMemo } from 'react';

function Confetti({ active }) {
  const pieces = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x:    Math.random() * 100,
    color: ['var(--gold)','var(--green)','var(--cyan)','var(--pink)','var(--purple-glow)'][i % 5],
    size: Math.random() * 8 + 4,
    dur:  Math.random() * 1.5 + 1.5,
    del:  Math.random() * 0.4,
    rot:  Math.random() * 720,
  })), []);

  if (!active) return null;
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9998 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:'absolute',
          left: `${p.x}%`, top:'-10px',
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          animation: `confetti-fall ${p.dur}s ${p.del}s ease-in forwards`,
          boxShadow: `0 0 6px ${p.color}`,
        }} />
      ))}
    </div>
  );
}

export default function ScorePopup({ answer }) {
  const [visible,    setVisible]    = useState(false);
  const [confetti,   setConfetti]   = useState(false);
  const [prevAnswer, setPrevAnswer] = useState(null);

  useEffect(() => {
    if (!answer || answer === prevAnswer) return;
    setPrevAnswer(answer);
    setVisible(true);
    if (answer.is_correct) setConfetti(true);
    const t1 = setTimeout(() => setVisible(false),  2800);
    const t2 = setTimeout(() => setConfetti(false), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [answer]);

  const correct = answer?.is_correct;

  // Streak multiplier label (uses the value the server applied)
  const streakMult    = answer?.streak_multiplier;
  const hasStreakBonus = correct && streakMult && streakMult > 1.0;
  const streakCount   = answer?.streak ?? 0;
  const doubleUsed    = answer?.double_used;

  return (
    <>
      <Confetti active={confetti} />
      {visible && answer && (
        <div style={{
          position: 'fixed', top:'18%', left:'50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          animation: 'slideDown 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
          textAlign: 'center',
        }}>
          <div style={{
            background: correct
              ? 'linear-gradient(135deg, rgba(0,255,135,0.2), rgba(0,255,135,0.05))'
              : 'linear-gradient(135deg, rgba(255,0,110,0.2), rgba(255,0,110,0.05))',
            border: `2px solid ${correct ? 'var(--green)' : 'var(--pink)'}`,
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem 2.5rem',
            backdropFilter: 'blur(20px)',
            boxShadow: correct
              ? '0 0 40px rgba(0,255,135,0.4), 0 20px 60px rgba(0,0,0,0.5)'
              : '0 0 40px rgba(255,0,110,0.4), 0 20px 60px rgba(0,0,0,0.5)',
            minWidth: 200,
          }}>
            {/* Result icon */}
            <div style={{ fontSize:'3rem', marginBottom:'0.25rem' }}>
              {correct ? '✅' : '❌'}
            </div>

            {/* Points */}
            <div style={{
              fontFamily: 'var(--font-display)', fontSize:'1.8rem', fontWeight:900,
              color: correct ? 'var(--green)' : 'var(--pink)',
              textShadow: `0 0 20px ${correct ? 'rgba(0,255,135,0.8)' : 'rgba(255,0,110,0.8)'}`,
              marginBottom: '0.25rem',
            }}>
              {correct ? `+${answer.points} pts` : 'Wrong!'}
            </div>

            {/* Response time */}
            <div style={{ color:'var(--text-mid)', fontSize:'0.875rem', marginBottom: (hasStreakBonus || doubleUsed) ? '0.75rem' : 0 }}>
              {answer.response_time?.toFixed(1)}s response
            </div>

            {/* ── Bonus badges row ────────────────────────────────────────── */}
            {(hasStreakBonus || doubleUsed) && (
              <div style={{
                display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap',
                marginTop: '0.5rem',
              }}>
                {/* Streak multiplier badge */}
                {hasStreakBonus && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    background: 'rgba(255,107,53,0.2)', border: '1px solid rgba(255,107,53,0.5)',
                    borderRadius: 'var(--radius-pill)', padding: '0.25rem 0.75rem',
                    color: 'var(--orange)', fontSize: '0.8rem', fontWeight: 800,
                  }}>
                    🔥 {streakCount} streak · {streakMult >= 2 ? '×2.0' : '×1.5'}
                  </div>
                )}

                {/* Double points badge */}
                {doubleUsed && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    background: 'rgba(255,215,0,0.2)', border: '1px solid rgba(255,215,0,0.5)',
                    borderRadius: 'var(--radius-pill)', padding: '0.25rem 0.75rem',
                    color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 800,
                  }}>
                    ⚡ 2× Double Points!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}