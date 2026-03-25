import { useState, useEffect } from 'react';

const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];
const RANK_COLORS = [
  'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.05))',
  'linear-gradient(135deg, rgba(192,192,192,0.15), rgba(192,192,192,0.05))',
  'linear-gradient(135deg, rgba(205,127,50,0.15), rgba(205,127,50,0.05))',
];
const RANK_BORDERS = ['rgba(255,215,0,0.4)', 'rgba(192,192,192,0.3)', 'rgba(205,127,50,0.3)'];

export default function Leaderboard({ rankings = [], myId, title = '🏆 Leaderboard', compact = false }) {
  const [prevScores, setPrevScores] = useState({});
  const [deltas,     setDeltas]     = useState({});

  useEffect(() => {
    const newDeltas = {};
    rankings.forEach(r => {
      const prev = prevScores[r.player_id];
      if (prev !== undefined && r.score > prev) {
        newDeltas[r.player_id] = r.score - prev;
      }
    });
    setDeltas(newDeltas);

    const newPrev = {};
    rankings.forEach(r => { newPrev[r.player_id] = r.score; });
    setPrevScores(newPrev);

    const t = setTimeout(() => setDeltas({}), 1800);
    return () => clearTimeout(t);
  }, [rankings]);

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      padding: compact ? '1rem' : '1.5rem',
      minWidth: compact ? 240 : 300,
    }}>
      <h3 style={{
        fontFamily: 'var(--font-heading)', fontSize: compact ? '1rem' : '1.25rem',
        fontWeight: 700, color: 'var(--cyan)', textAlign: 'center',
        marginBottom: '1rem', letterSpacing: '0.05em',
      }}>
        {title}
      </h3>

      {rankings.length === 0 ? (
        <div style={{ textAlign:'center', color:'var(--text-dim)', padding:'2rem 0', fontSize:'0.9rem' }}>
          No scores yet...
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.35rem' }}>
          {rankings.map((entry, idx) => {
            const isMe   = entry.player_id === myId;
            const isTop3 = idx < 3;
            const delta  = deltas[entry.player_id];

            return (
              <div key={entry.player_id} className="lb-row" style={{
                background:  isMe   ? 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(124,58,237,0.15))'
                           : isTop3 ? RANK_COLORS[idx]
                           : 'var(--bg-card)',
                border: `1px solid ${isMe ? 'rgba(124,58,237,0.5)' : isTop3 ? RANK_BORDERS[idx] : 'var(--border-subtle)'}`,
                boxShadow: isMe ? '0 0 20px rgba(124,58,237,0.25)' : 'none',
                animationDelay: `${idx * 0.04}s`,
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Shimmer on me */}
                {isMe && <div className="shimmer" style={{ position:'absolute', inset:0, opacity:0.3, borderRadius:'inherit' }} />}

                {/* Rank */}
                <span style={{
                  fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'1rem',
                  color: isTop3 ? ['var(--gold)','silver','#cd7f32'][idx] : 'var(--text-dim)',
                  minWidth:'2rem', textAlign:'center',
                }}>
                  {isTop3 ? MEDAL_EMOJI[idx] : `#${entry.rank}`}
                </span>

                {/* Name */}
                <span style={{
                  flex:1, fontWeight: isMe ? 800 : 600, fontSize: compact ? '0.875rem' : '0.95rem',
                  color: isMe ? 'var(--text-bright)' : 'var(--text-mid)',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                }}>
                  {entry.nickname}{isMe ? ' (you)' : ''}
                </span>

                {/* Score + delta */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
                  <span style={{
                    fontFamily:'var(--font-display)', fontWeight:700, fontSize:compact ? '0.85rem' : '1rem',
                    color:'var(--gold)',
                  }}>
                    {entry.score.toLocaleString()}
                  </span>
                  {delta && (
                    <span style={{
                      fontSize:'0.7rem', color:'var(--green)', fontWeight:700,
                      animation:'score-pop 1.6s ease forwards',
                    }}>
                      +{delta}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
