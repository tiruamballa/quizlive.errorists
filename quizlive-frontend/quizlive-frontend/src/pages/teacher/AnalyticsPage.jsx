import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSummary, getQStats, getPlayerStats, exportCSVUrl } from '../../api/sessionApi';
import StarBackground from '../../components/StarBackground';

const StatCard = ({ icon, value, label, color }) => (
  <div className="card animate-fade-in" style={{
    textAlign:'center', padding:'1.75rem',
    background:`linear-gradient(135deg, rgba(13,13,46,0.8), var(--bg-card))`,
    border:`1px solid ${color}30`,
  }}>
    <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem', animation:'float 4s ease-in-out infinite' }}>{icon}</div>
    <div style={{
      fontFamily:'var(--font-display)', fontSize:'2.2rem', fontWeight:900,
      color, lineHeight:1, animation:'count-up 0.5s ease',
    }}>{value}</div>
    <div style={{ color:'var(--text-dim)', fontSize:'0.8rem', marginTop:'0.35rem' }}>{label}</div>
  </div>
);

const AccuracyBar = ({ pct }) => {
  const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--orange)' : 'var(--pink)';
  return (
    <div style={{ width:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:'0.75rem', color:'var(--text-dim)' }}>Accuracy</span>
        <span style={{ fontSize:'0.75rem', fontWeight:700, color }}>{pct}%</span>
      </div>
      <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
        <div style={{
          height:'100%', borderRadius:3, width:`${pct}%`,
          background:`linear-gradient(90deg, ${color}, ${color}aa)`,
          boxShadow:`0 0 8px ${color}80`,
          transition:'width 1s cubic-bezier(0.34,1.56,0.64,1)',
        }} />
      </div>
    </div>
  );
};

export default function AnalyticsPage() {
  const { code }   = useParams();
  const navigate   = useNavigate();
  const [summary,  setSummary]  = useState(null);
  const [qStats,   setQStats]   = useState([]);
  const [players,  setPlayers]  = useState([]);
  const [tab,      setTab]      = useState('summary');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      getSummary(code).then(r => setSummary(r.data)),
      getQStats(code).then(r => setQStats(r.data.questions || [])),
      getPlayerStats(code).then(r => setPlayers(r.data.players || [])),
    ]).finally(() => setLoading(false));
  }, [code]);

  const tabs = [
    { id:'summary',   label:'📊 Summary' },
    { id:'questions', label:'❓ Questions' },
    { id:'players',   label:'👥 Players' },
  ];

  return (
    <div className="page-bg" style={{ minHeight:'100vh' }}>
      <StarBackground density={25} />

      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(5,5,16,0.9)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--border-subtle)',
        padding:'0 2rem', height:68,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <span style={{ color:'var(--border-subtle)' }}>|</span>
          <span style={{ fontFamily:'var(--font-heading)', color:'var(--text-bright)', fontSize:'1.1rem' }}>
            Analytics —{' '}
            <span style={{ color:'var(--cyan)', fontFamily:'var(--font-display)', fontWeight:700,
              letterSpacing:'0.1em' }}>{code}</span>
          </span>
        </div>
        <a href={exportCSVUrl(code)} download>
          <button className="btn btn-green" style={{ gap:'0.4rem' }}>⬇ Export CSV</button>
        </a>
      </nav>

      <div className="container" style={{ padding:'2rem 1.5rem', position:'relative', zIndex:1 }}>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'6rem' }}>
            <div className="spinner" style={{ width:56, height:56 }} />
          </div>
        ) : (
          <>
            {summary && (
              <div style={{ marginBottom:'1.5rem', animation:'fadeIn 0.5s ease' }}>
                <h2 style={{ fontFamily:'var(--font-heading)', color:'var(--text-bright)', marginBottom:'0.25rem' }}>
                  {summary.quiz_title}
                </h2>
                <p style={{ color:'var(--text-dim)', fontSize:'0.875rem' }}>
                  {new Date(summary.started_at).toLocaleString()} — {new Date(summary.ended_at).toLocaleString()}
                </p>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display:'flex', gap:'0.5rem', marginBottom:'2rem' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className="btn"
                  style={{
                    padding:'0.6rem 1.25rem', fontSize:'0.9rem',
                    background: tab === t.id ? 'var(--purple)' : 'var(--bg-card)',
                    color:   tab === t.id ? '#fff' : 'var(--text-mid)',
                    border:  `1px solid ${tab === t.id ? 'var(--purple)' : 'var(--border-subtle)'}`,
                    boxShadow: tab === t.id ? '0 0 20px rgba(124,58,237,0.4)' : 'none',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* SUMMARY */}
            {tab === 'summary' && summary && (
              <div style={{ animation:'fadeIn 0.4s ease' }}>
                <div style={{
                  display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
                  gap:'1rem', marginBottom:'2rem',
                }} className="stagger">
                  <StatCard icon="👥" value={summary.total_players}    label="Players"       color="var(--cyan)" />
                  <StatCard icon="⭐" value={`${Math.round(summary.avg_score)} pts`} label="Avg Score" color="var(--gold)" />
                  <StatCard icon="🎯" value={`${summary.correct_pct}%`} label="Accuracy"     color="var(--green)" />
                  <StatCard icon="⚡" value={`${summary.avg_resp_time}s`} label="Avg Response" color="var(--purple-glow)" />
                </div>

                {/* Top 3 podium */}
                {players.length >= 3 && (
                  <div className="card" style={{ padding:'2rem', marginTop:'1rem' }}>
                    <h3 style={{ fontFamily:'var(--font-heading)', color:'var(--text-bright)',
                      textAlign:'center', marginBottom:'2rem', fontSize:'1.25rem' }}>
                      🏆 Top Players
                    </h3>
                    <div style={{
                      display:'flex', alignItems:'flex-end', justifyContent:'center',
                      gap:'0.75rem', height:200,
                    }}>
                      {[players[1], players[0], players[2]].map((p, i) => {
                        if (!p) return <div key={i} style={{ flex:1 }} />;
                        const heights = [160, 200, 130];
                        const labels  = ['🥈','🥇','🥉'];
                        const classes = ['podium-2','podium-1','podium-3'];
                        return (
                          <div key={p.player_id} className={`podium-block ${classes[i]}`}
                            style={{ height:heights[i], flex:1, animation:`fadeIn 0.5s ${i*0.1}s ease both` }}>
                            <div style={{ fontSize:'2.5rem' }}>{labels[i]}</div>
                            <div style={{ fontWeight:700, color:'var(--text-bright)',
                              fontSize:'0.9rem', marginTop:'0.25rem', wordBreak:'break-word' }}>
                              {p.nickname}
                            </div>
                            <div style={{
                              fontFamily:'var(--font-display)', fontWeight:900,
                              color:'var(--gold)', fontSize:'1rem', marginTop:'0.25rem',
                            }}>{p.final_score.toLocaleString()}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QUESTIONS */}
            {tab === 'questions' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', animation:'fadeIn 0.4s ease' }}>
                {qStats.map((q, i) => (
                  <div key={q.question_id} className="card animate-fade-in"
                    style={{ padding:'1.25rem', animationDelay:`${i*0.04}s` }}>
                    <div style={{ display:'flex', gap:'1rem', alignItems:'flex-start' }}>
                      <div style={{
                        minWidth:40, height:40, borderRadius:'50%', display:'flex',
                        alignItems:'center', justifyContent:'center',
                        background:'rgba(0,212,255,0.1)', border:'2px solid rgba(0,212,255,0.3)',
                        fontFamily:'var(--font-display)', fontWeight:900, color:'var(--cyan)',
                      }}>
                        {q.order + 1}
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ color:'var(--text-bright)', fontWeight:600, marginBottom:'0.75rem' }}>
                          {q.question_text}
                        </p>
                        <AccuracyBar pct={q.accuracy_pct} />
                        <div style={{ display:'flex', gap:'1.5rem', marginTop:'0.75rem' }}>
                          <span style={{ color:'var(--text-dim)', fontSize:'0.8rem' }}>
                            ✓ {q.correct}/{q.total} answered correctly
                          </span>
                          <span style={{ color:'var(--text-dim)', fontSize:'0.8rem' }}>
                            ⚡ {q.avg_time_secs}s avg response
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PLAYERS */}
            {tab === 'players' && (
              <div style={{ animation:'fadeIn 0.4s ease' }}>
                <div className="card" style={{ padding:0, overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:'rgba(0,0,0,0.3)' }}>
                        {['Rank','Player','Score','Correct','Accuracy','Avg Time'].map(h => (
                          <th key={h} style={{
                            padding:'0.875rem 1.25rem', textAlign:'left',
                            fontFamily:'var(--font-heading)', fontSize:'0.8rem', fontWeight:700,
                            color:'var(--text-dim)', letterSpacing:'0.08em', textTransform:'uppercase',
                            borderBottom:'1px solid var(--border-subtle)',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p, i) => {
                        const medals = ['🥇','🥈','🥉'];
                        return (
                          <tr key={p.player_id} style={{
                            background: i === 0 ? 'rgba(255,215,0,0.05)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                            borderBottom:'1px solid rgba(255,255,255,0.04)',
                            animation:`rank-slide 0.3s ${i*0.03}s ease both`,
                          }}>
                            <td style={{ padding:'0.875rem 1.25rem', fontWeight:700,
                              color: i < 3 ? ['var(--gold)','silver','#cd7f32'][i] : 'var(--text-dim)' }}>
                              {i < 3 ? medals[i] : `#${p.final_rank}`}
                            </td>
                            <td style={{ padding:'0.875rem 1.25rem', color:'var(--text-bright)', fontWeight:600 }}>
                              {p.nickname}
                            </td>
                            <td style={{ padding:'0.875rem 1.25rem',
                              fontFamily:'var(--font-display)', fontWeight:700, color:'var(--gold)' }}>
                              {p.final_score.toLocaleString()}
                            </td>
                            <td style={{ padding:'0.875rem 1.25rem', color:'var(--text-mid)' }}>
                              {p.correct}/{p.total_answers}
                            </td>
                            <td style={{ padding:'0.875rem 1.25rem' }}>
                              <span style={{
                                fontWeight:700, fontSize:'0.9rem',
                                color: p.accuracy_pct >= 70 ? 'var(--green)' : p.accuracy_pct >= 40 ? 'var(--orange)' : 'var(--pink)',
                              }}>
                                {p.accuracy_pct}%
                              </span>
                            </td>
                            <td style={{ padding:'0.875rem 1.25rem', color:'var(--text-dim)', fontSize:'0.9rem' }}>
                              {p.avg_resp_time}s
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
