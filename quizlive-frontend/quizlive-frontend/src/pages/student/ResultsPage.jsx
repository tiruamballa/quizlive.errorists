import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import StarBackground from '../../components/StarBackground';

// ── Confetti ──────────────────────────────────────────────────────────────────
function FullConfetti() {
  const [pieces] = useState(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x:     Math.random() * 100,
    color: ['var(--gold)','var(--green)','var(--cyan)','var(--pink)','var(--purple-glow)','#fff'][i % 6],
    size:  Math.random() * 10 + 5,
    dur:   Math.random() * 2 + 2,
    del:   Math.random() * 1.5,
  })));
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:50, overflow:'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:`${p.x}%`, top:'-20px',
          width:p.size, height:p.size * (p.id % 2 === 0 ? 0.4 : 1),
          background:p.color, borderRadius: p.id % 3 === 0 ? '50%' : '2px',
          animation:`confetti-fall ${p.dur}s ${p.del}s ease-in both`,
          boxShadow:`0 0 8px ${p.color}80`, opacity:0.9,
        }} />
      ))}
    </div>
  );
}

// ── Score timeline bar chart (pure SVG, no deps) ──────────────────────────────
function ScoreChart({ history }) {
  if (!history.length) return null;
  const W = 500, H = 120, PAD = 10, LABEL_H = 20;
  const chartH = H - LABEL_H;
  const maxPts = Math.max(...history.map(h => h.pointsAwarded), 1);
  const barW   = Math.min(38, (W - PAD * 2) / history.length - 5);
  const spacing = (W - PAD * 2) / history.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', maxWidth:500, overflow:'visible', display:'block' }}>
      {history.map((h, i) => {
        const barH  = Math.max(8, (h.pointsAwarded / maxPts) * (chartH - 20));
        const x     = PAD + i * spacing + (spacing - barW) / 2;
        const y     = chartH - barH;
        const color = h.isCorrect ? '#4ade80' : '#f43f5e';
        const glow  = h.isCorrect ? 'rgba(74,222,128,0.45)' : 'rgba(244,63,94,0.35)';
        return (
          <g key={i}>
            <rect x={x-2} y={y-2} width={barW+4} height={barH+4} rx={6}
              fill={glow} style={{ filter:'blur(5px)' }} opacity={0.6} />
            <rect x={x} y={y} width={barW} height={barH} rx={5} fill={color} opacity={0.9} />
            {h.pointsAwarded > 0 && (
              <text x={x+barW/2} y={y-5} textAnchor="middle"
                fontSize={8} fill={color} fontWeight="700" fontFamily="monospace">
                +{h.pointsAwarded}
              </text>
            )}
            <text x={x+barW/2} y={H-3} textAnchor="middle"
              fontSize={8} fill="rgba(255,255,255,0.28)" fontFamily="monospace">
              Q{h.questionIndex+1}
            </text>
            <text x={x+barW/2} y={y+barH/2+4} textAnchor="middle" fontSize={9}>
              {h.isCorrect ? '✓' : '✗'}
            </text>
          </g>
        );
      })}
      {/* Cumulative score trend line */}
      {history.length > 1 && (() => {
        const maxScore = Math.max(...history.map(h => h.cumulativeScore), 1);
        const pts = history.map((h, i) => {
          const x = PAD + i * spacing + spacing / 2;
          const y = chartH - Math.max(4, (h.cumulativeScore / maxScore) * (chartH - 20));
          return `${x},${y}`;
        }).join(' ');
        return (
          <polyline points={pts} fill="none"
            stroke="rgba(56,189,248,0.55)" strokeWidth={1.5} strokeDasharray="4 3" />
        );
      })()}
    </svg>
  );
}

// ── Per-question row ──────────────────────────────────────────────────────────
function QuestionRow({ entry, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div onClick={() => setExpanded(e => !e)}
      style={{
        borderRadius:14, overflow:'hidden', cursor:'pointer',
        background: entry.isCorrect ? 'rgba(74,222,128,0.05)' : 'rgba(244,63,94,0.05)',
        border:`1px solid ${entry.isCorrect ? 'rgba(74,222,128,0.2)' : 'rgba(244,63,94,0.18)'}`,
        animation:`rq-in 0.35s cubic-bezier(0.22,1,0.36,1) ${index*55}ms both`,
        transition:'border-color 0.2s',
      }}>
      <style>{`@keyframes rq-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }`}</style>

      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.85rem 1rem' }}>
        <div style={{
          width:34, height:34, borderRadius:9, flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          background: entry.isCorrect ? 'rgba(74,222,128,0.15)' : 'rgba(244,63,94,0.12)',
          border:`1.5px solid ${entry.isCorrect ? 'rgba(74,222,128,0.4)' : 'rgba(244,63,94,0.35)'}`,
          fontFamily:'var(--font-display)', fontWeight:900, fontSize:'0.72rem',
          color: entry.isCorrect ? '#4ade80' : '#f43f5e',
        }}>
          Q{entry.questionIndex + 1}
        </div>
        <span style={{
          flex:1, fontSize:'0.87rem', fontWeight:500,
          color:'var(--text-bright)', lineHeight:1.35,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace: expanded ? 'normal' : 'nowrap',
        }}>
          {entry.questionText}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:'0.55rem', flexShrink:0 }}>
          {entry.pointsAwarded > 0 && (
            <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'0.83rem', color:'var(--gold)' }}>
              +{entry.pointsAwarded}
            </span>
          )}
          <span style={{ fontSize:'1.05rem' }}>{entry.isCorrect ? '✅' : '❌'}</span>
          <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'0.72rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded options */}
      {expanded && (
        <div style={{
          padding:'0 1rem 0.9rem',
          borderTop:'1px solid rgba(255,255,255,0.05)',
          display:'flex', flexDirection:'column', gap:'0.4rem',
          paddingTop:'0.7rem',
        }}>
          {entry.options?.map((opt) => {
            const isMyPick  = opt.id === entry.myOptionId;
            const isCorrect = entry.correctIds?.includes(opt.id);
            const bg     = isCorrect ? 'rgba(74,222,128,0.1)' : isMyPick ? 'rgba(244,63,94,0.1)' : 'rgba(255,255,255,0.03)';
            const border = isCorrect ? 'rgba(74,222,128,0.35)' : isMyPick ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.07)';
            const color  = isCorrect ? '#4ade80' : isMyPick ? '#f43f5e' : 'rgba(255,255,255,0.42)';
            return (
              <div key={opt.id} style={{
                display:'flex', alignItems:'center', gap:'0.55rem',
                padding:'0.4rem 0.7rem', borderRadius:8,
                background:bg, border:`1px solid ${border}`, fontSize:'0.81rem', color,
              }}>
                <span style={{
                  width:18, height:18, borderRadius:4, flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: isCorrect ? 'rgba(74,222,128,0.2)' : isMyPick ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.05)',
                  fontSize:'0.68rem', fontWeight:900,
                }}>
                  {isCorrect ? '✓' : isMyPick ? '✗' : ''}
                </span>
                <span style={{ flex:1, fontWeight: isCorrect || isMyPick ? 600 : 400 }}>{opt.text}</span>
                {isCorrect && (
                  <span style={{ fontSize:'0.68rem', fontWeight:800, letterSpacing:'0.07em', opacity:0.75 }}>CORRECT</span>
                )}
                {isMyPick && !isCorrect && (
                  <span style={{ fontSize:'0.68rem', fontWeight:800, letterSpacing:'0.07em', opacity:0.75 }}>YOUR PICK</span>
                )}
              </div>
            );
          })}
          {entry.streak >= 2 && (
            <p style={{ color:'var(--orange)', fontSize:'0.73rem', fontWeight:700, margin:'0.35rem 0 0' }}>
              🔥 {entry.streak}-answer streak active
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const { code }            = useParams();
  const navigate            = useNavigate();
  const { game, resetGame } = useGame();
  const [showAll,      setShowAll]      = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [tab,          setTab]          = useState('leaderboard');

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const podium   = game.podium     || [];
  const all      = game.allResults || game.leaderboard || [];
  const history  = game.answerHistory || [];
  const myEntry  = all.find(p => p.player_id === game.playerId);
  const isWinner = myEntry?.rank === 1;

  // Derived stats
  const answered    = history.length;
  const correct     = history.filter(h => h.isCorrect).length;
  const accuracy    = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const bestStreak  = history.reduce((m, h) => Math.max(m, h.streak), 0);
  const totalEarned = history.reduce((s, h) => s + h.pointsAwarded, 0);
  const skipped     = game.totalQuestions - answered;

  const podiumOrder  = [podium[1], podium[0], podium[2]];
  const podiumHeights = [160, 210, 130];
  const podiumMedals  = ['🥈','🥇','🥉'];
  const podiumClasses = ['podium-2','podium-1','podium-3'];

  return (
    <div className="page-bg" style={{ minHeight:'100vh', overflow:'hidden' }}>
      {showConfetti && <FullConfetti />}
      <StarBackground density={50} />

      <div style={{
        position:'relative', zIndex:1, minHeight:'100vh',
        display:'flex', flexDirection:'column',
        alignItems:'center', padding:'3rem 1.5rem 4rem',
      }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ textAlign:'center', marginBottom:'2rem', animation:'fadeIn 0.6s ease' }}>
          <div style={{
            fontSize:'5rem', marginBottom:'0.5rem', display:'inline-block',
            animation: isWinner ? 'bounce-in 0.8s ease' : 'fadeIn 0.6s ease',
          }}>
            {isWinner ? '🏆' : '🎯'}
          </div>
          <h1 style={{
            fontFamily:'var(--font-display)', fontSize:'2.5rem', fontWeight:900,
            background:'linear-gradient(135deg, var(--gold), var(--orange))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundClip:'text', letterSpacing:'0.08em', margin:0,
          }}>
            {isWinner ? 'YOU WON!' : 'GAME OVER'}
          </h1>
          <p style={{ color:'var(--text-dim)', marginTop:'0.5rem' }}>Room {code}</p>
        </div>

        {/* ── My result card ──────────────────────────────────────────────── */}
        {myEntry && (
          <div style={{
            marginBottom:'2rem', width:'100%', maxWidth:500,
            animation:'popIn 0.6s 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            <div className="card" style={{
              padding:'1.5rem 2rem', textAlign:'center',
              background: isWinner
                ? 'linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,215,0,0.03))'
                : 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(124,58,237,0.05))',
              border:`2px solid ${isWinner ? 'rgba(255,215,0,0.5)' : 'rgba(124,58,237,0.4)'}`,
              boxShadow: isWinner ? '0 0 40px rgba(255,215,0,0.3)' : '0 0 40px rgba(124,58,237,0.25)',
            }}>
              <div style={{ color:'var(--text-dim)', fontSize:'0.72rem', fontWeight:700,
                letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'0.75rem' }}>
                {game.nickname} · Final Result
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'1.25rem', flexWrap:'wrap' }}>
                {[
                  { val: myEntry.score.toLocaleString(), label:'points',  color:'var(--gold)' },
                  null,
                  { val: `#${myEntry.rank}`, label:`of ${all.length}`,
                    color: myEntry.rank<=3 ? ['var(--gold)','silver','#cd7f32'][myEntry.rank-1] : 'var(--purple-glow)' },
                  ...(answered > 0 ? [
                    null,
                    { val:`${accuracy}%`, label:'accuracy',
                      color: accuracy>=70 ? '#4ade80' : accuracy>=40 ? '#fb923c' : '#f43f5e' },
                  ] : []),
                ].map((item, i) =>
                  item === null
                    ? <div key={i} style={{ width:1, height:50, background:'rgba(255,255,255,0.1)' }} />
                    : (
                      <div key={i}>
                        <div style={{
                          fontFamily:'var(--font-display)', fontSize:'2.8rem', fontWeight:900,
                          color:item.color, lineHeight:1,
                          textShadow: item.color==='var(--gold)' ? '0 0 30px rgba(255,215,0,0.5)' : 'none',
                        }}>{item.val}</div>
                        <div style={{ color:'var(--text-dim)', fontSize:'0.72rem', marginTop:'0.2rem' }}>{item.label}</div>
                      </div>
                    )
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab switcher ────────────────────────────────────────────────── */}
        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.75rem', animation:'fadeIn 0.5s 0.3s ease both' }}>
          {[
            { id:'leaderboard', label:'🏆 Leaderboard' },
            { id:'breakdown',   label:`📊 My Breakdown${answered > 0 ? ` (${answered} Q)` : ''}` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="btn"
              style={{
                padding:'0.6rem 1.4rem', fontSize:'0.9rem',
                background: tab===t.id ? 'var(--purple)' : 'var(--bg-card)',
                color:      tab===t.id ? '#fff' : 'var(--text-mid)',
                border:    `1px solid ${tab===t.id ? 'var(--purple)' : 'var(--border-subtle)'}`,
                boxShadow:  tab===t.id ? '0 0 20px rgba(124,58,237,0.4)' : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ LEADERBOARD TAB ══════════════════════════════════════════════ */}
        {tab === 'leaderboard' && (
          <div style={{ width:'100%', maxWidth:500, animation:'fadeIn 0.35s ease' }}>
            {podium.length > 0 && (
              <div style={{ marginBottom:'2rem' }}>
                <h3 style={{
                  fontFamily:'var(--font-heading)', textAlign:'center', color:'var(--text-mid)',
                  fontSize:'0.85rem', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'1.5rem',
                }}>🏆 Top 3</h3>
                <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:'0.75rem', height:240 }}>
                  {podiumOrder.map((p, i) => {
                    if (!p) return <div key={i} style={{ flex:1 }} />;
                    const isMe = p.player_id === game.playerId;
                    return (
                      <div key={p.player_id} className={`podium-block ${podiumClasses[i]}`}
                        style={{
                          height:podiumHeights[i], flex:1, gap:'0.4rem',
                          animation:`fadeIn 0.5s ${0.4+i*0.15}s ease both`,
                          boxShadow: isMe ? '0 0 20px rgba(124,58,237,0.4)' : 'none',
                          border:    isMe ? '2px solid rgba(124,58,237,0.5)' : '',
                        }}>
                        <div style={{ fontSize:'2.5rem' }}>{podiumMedals[i]}</div>
                        <div style={{ fontWeight:700, fontSize:'0.875rem', wordBreak:'break-word',
                          lineHeight:1.2, color: isMe ? 'var(--cyan)' : 'var(--text-bright)' }}>
                          {p.nickname}
                        </div>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:900,
                          color:'var(--gold)', fontSize:'0.9rem' }}>
                          {p.score.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {all.length > 3 && (
              <div>
                <button className="btn btn-ghost" onClick={() => setShowAll(s => !s)}
                  style={{ width:'100%', marginBottom:'0.75rem' }}>
                  {showAll ? '▲ Hide Full Leaderboard' : `▼ View All ${all.length} Players`}
                </button>
                {showAll && (
                  <div className="card" style={{ padding:0, overflow:'hidden', animation:'fadeIn 0.3s ease' }}>
                    {all.map((p, i) => {
                      const isMe = p.player_id === game.playerId;
                      return (
                        <div key={p.player_id} style={{
                          display:'flex', alignItems:'center', gap:'1rem',
                          padding:'0.75rem 1.25rem',
                          background: isMe ? 'rgba(124,58,237,0.15)' : i%2===0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                          borderBottom:'1px solid rgba(255,255,255,0.04)',
                          borderLeft:`3px solid ${isMe ? 'var(--purple-glow)' : 'transparent'}`,
                          animation:`rank-slide 0.3s ${i*0.03}s ease both`,
                        }}>
                          <span style={{
                            fontFamily:'var(--font-display)', fontSize:'0.9rem', fontWeight:900,
                            color: i===0?'var(--gold)':i===1?'silver':i===2?'#cd7f32':'var(--text-dim)',
                            minWidth:'2.5rem', textAlign:'center',
                          }}>
                            {i<3 ? ['🥇','🥈','🥉'][i] : `#${p.rank}`}
                          </span>
                          <span style={{ flex:1, fontWeight:isMe?700:500,
                            color:isMe?'var(--text-bright)':'var(--text-mid)', fontSize:'0.95rem' }}>
                            {p.nickname}{isMe ? ' (you)' : ''}
                          </span>
                          <span style={{ fontFamily:'var(--font-display)', fontWeight:900,
                            color:'var(--gold)', fontSize:'0.95rem' }}>
                            {p.score.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ BREAKDOWN TAB ════════════════════════════════════════════════ */}
        {tab === 'breakdown' && (
          <div style={{ width:'100%', maxWidth:580, animation:'fadeIn 0.35s ease' }}>
            {answered === 0 ? (
              <div className="card" style={{ textAlign:'center', padding:'3rem 2rem' }}>
                <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🤷</div>
                <p style={{ color:'var(--text-dim)' }}>No answers recorded for this session.</p>
              </div>
            ) : (
              <>
                {/* Stats pills */}
                <div style={{
                  display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(110px,1fr))',
                  gap:'0.75rem', marginBottom:'1.5rem',
                }}>
                  {[
                    { label:'Accuracy',    value:`${accuracy}%`,
                      color: accuracy>=70?'#4ade80':accuracy>=40?'#fb923c':'#f43f5e' },
                    { label:'Correct',     value:`${correct} / ${answered}`, color:'#4ade80' },
                    { label:'Best Streak', value:`🔥 ${bestStreak}`,          color:'#fb923c' },
                    { label:'Pts Earned',  value:totalEarned.toLocaleString(), color:'var(--gold)' },
                    ...(skipped > 0 ? [{ label:'Skipped', value:String(skipped), color:'rgba(255,255,255,0.3)' }] : []),
                  ].map((s, i) => (
                    <div key={i} style={{
                      background:'rgba(255,255,255,0.04)',
                      border:'1px solid rgba(255,255,255,0.08)',
                      borderRadius:14, padding:'0.9rem 1rem', textAlign:'center',
                      backdropFilter:'blur(12px)',
                      animation:`rq-in 0.35s ${i*60}ms both`,
                    }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:900,
                        fontSize:'1.5rem', color:s.color, lineHeight:1 }}>
                        {s.value}
                      </div>
                      <div style={{ color:'rgba(255,255,255,0.32)', fontSize:'0.68rem',
                        fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', marginTop:'0.3rem' }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="card" style={{
                  padding:'1.2rem 1.5rem', marginBottom:'1.25rem',
                  background:'rgba(13,13,46,0.6)', backdropFilter:'blur(12px)',
                }}>
                  <p style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.68rem', fontWeight:700,
                    letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'0.85rem' }}>
                    Points per question
                  </p>
                  <ScoreChart history={history} />
                  <div style={{ display:'flex', gap:'1.25rem', marginTop:'0.75rem' }}>
                    {[
                      { color:'#4ade80', label:'Correct' },
                      { color:'#f43f5e', label:'Wrong' },
                      { color:'rgba(56,189,248,0.55)', label:'Score trend', dashed:true },
                    ].map(l => (
                      <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        {l.dashed
                          ? <div style={{ width:16, height:0, borderTop:`2px dashed ${l.color}` }} />
                          : <div style={{ width:9, height:9, borderRadius:3, background:l.color }} />
                        }
                        <span style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.7rem', fontWeight:600 }}>
                          {l.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-question list */}
                <p style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.68rem', fontWeight:700,
                  letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'0.75rem' }}>
                  Question breakdown — tap any to see answers
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {history.map((entry, i) => (
                    <QuestionRow key={i} entry={entry} index={i} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CTAs ──────────────────────────────────────────────────────── */}
        <div style={{
          display:'flex', gap:'1rem', flexWrap:'wrap', justifyContent:'center',
          marginTop:'2.5rem', animation:'fadeIn 0.8s 0.5s ease both',
        }}>
          <button className="btn btn-primary btn-xl"
            onClick={() => { resetGame(); navigate('/join'); }}>
            🎮 Play Again
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/join')}>
            Join Different Game
          </button>
        </div>
      </div>
    </div>
  );
}