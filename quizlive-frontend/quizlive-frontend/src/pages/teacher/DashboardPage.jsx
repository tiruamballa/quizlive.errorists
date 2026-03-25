import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getQuizzes, deleteQuiz } from '../../api/quizApi';
import { createSession } from '../../api/sessionApi';
import StarBackground from '../../components/StarBackground';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [launching, setLaunching] = useState(null);

  useEffect(() => {
    getQuizzes().then(r => {
      const data = r.data;
      setQuizzes(Array.isArray(data) ? data : data.results || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this quiz? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteQuiz(id);
      setQuizzes(q => q.filter(x => x.id !== id));
    } finally { setDeleting(null); }
  };

  const handleLaunch = async (quizId) => {
    setLaunching(quizId);
    try {
      const { data } = await createSession(quizId);
      navigate(`/host/${data.game_code}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not create session.');
      setLaunching(null);
    }
  };

  const statCards = [
    { label:'Quizzes', value: quizzes.length, icon:'📚', color:'var(--purple-glow)' },
    { label:'Questions', value: quizzes.reduce((a,q) => a + (q.question_count||0), 0), icon:'❓', color:'var(--cyan)' },
    { label:'Sessions', value: '—', icon:'🎮', color:'var(--green)' },
  ];

  return (
    <div className="page-bg" style={{ minHeight:'100vh' }}>
      <StarBackground density={40} />

      {/* Navbar */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(5,5,16,0.85)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--border-subtle)',
        padding:'0 2rem', height:68,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <span style={{ fontSize:'1.75rem' }}>🎯</span>
          <span style={{
            fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:900,
            background:'linear-gradient(135deg, var(--purple-glow), var(--cyan))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          }}>QUIZLIVE</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <div style={{
            background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.3)',
            padding:'0.4rem 1rem', borderRadius:'var(--radius-pill)',
            color:'var(--text-mid)', fontSize:'0.875rem',
          }}>
            👨‍🏫 <strong style={{ color:'var(--text-bright)' }}>{user?.username}</strong>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="container" style={{ padding:'2rem 1.5rem', position:'relative', zIndex:1 }}>
        {/* Header */}
        <div style={{ marginBottom:'2.5rem', animation:'fadeIn 0.5s ease' }}>
          <h1 style={{
            fontFamily:'var(--font-heading)', fontSize:'2.5rem', fontWeight:700,
            color:'var(--text-bright)', marginBottom:'0.5rem',
          }}>
            Welcome back, <span style={{ color:'var(--purple-glow)' }}>{user?.username}</span> 👋
          </h1>
          <p style={{ color:'var(--text-dim)' }}>Manage your quizzes and launch live game sessions.</p>
        </div>

        {/* Stats */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',
          gap:'1rem', marginBottom:'2.5rem',
        }} className="stagger">
          {statCards.map(s => (
            <div key={s.label} className="card animate-fade-in" style={{
              textAlign:'center', padding:'1.5rem',
              background:`linear-gradient(135deg, rgba(13,13,46,0.8), var(--bg-card))`,
              borderColor: 'var(--border-subtle)',
            }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem', animation:'float 3s ease-in-out infinite' }}>{s.icon}</div>
              <div style={{
                fontFamily:'var(--font-display)', fontSize:'2.5rem', fontWeight:900,
                color:s.color, lineHeight:1,
              }}>{s.value}</div>
              <div style={{ color:'var(--text-dim)', fontSize:'0.85rem', marginTop:'0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quiz list header */}
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          marginBottom:'1.25rem',
        }}>
          <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'1.5rem', color:'var(--text-bright)', margin:0 }}>
            My Quizzes
          </h2>
          <Link to="/quiz/new">
            <button className="btn btn-primary" style={{ gap:'0.4rem' }}>
              ＋ New Quiz
            </button>
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display:'flex', justifyContent:'center', padding:'4rem 0' }}>
            <div className="spinner" style={{ width:48, height:48 }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && quizzes.length === 0 && (
          <div className="card" style={{
            textAlign:'center', padding:'4rem 2rem',
            background:'linear-gradient(135deg, rgba(124,58,237,0.08), var(--bg-card))',
            borderStyle:'dashed', borderColor:'rgba(124,58,237,0.3)',
            animation:'fadeIn 0.5s ease',
          }}>
            <div style={{ fontSize:'4rem', marginBottom:'1rem', animation:'float 3s ease-in-out infinite' }}>📝</div>
            <h3 style={{ color:'var(--text-bright)', marginBottom:'0.5rem', fontFamily:'var(--font-heading)' }}>
              No quizzes yet
            </h3>
            <p style={{ color:'var(--text-dim)', marginBottom:'1.5rem' }}>
              Create your first quiz and start hosting live games!
            </p>
            <Link to="/quiz/new">
              <button className="btn btn-primary btn-xl">Create My First Quiz</button>
            </Link>
          </div>
        )}

        {/* Quiz grid */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',
          gap:'1rem',
        }} className="stagger">
          {quizzes.map((q, i) => (
            <div key={q.id} className="card animate-fade-in" style={{
              display:'flex', flexDirection:'column', gap:'0', padding:0, overflow:'hidden',
              background:'var(--bg-card)',
              animationDelay: `${i * 0.05}s`,
              cursor:'default',
              transition:'all 0.3s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
            >
              {/* Card top accent */}
              <div style={{
                height:4,
                background:`linear-gradient(90deg, var(--purple), var(--cyan))`,
              }} />

              <div style={{ padding:'1.25rem', flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
                  <h3 style={{
                    fontFamily:'var(--font-heading)', fontSize:'1.15rem', fontWeight:700,
                    color:'var(--text-bright)', margin:0, lineHeight:1.3,
                    flex:1, marginRight:'0.5rem',
                  }}>{q.title}</h3>
                  <span className="badge badge-purple" style={{ flexShrink:0 }}>
                    {q.question_count} Q
                  </span>
                </div>
                {q.description && (
                  <p style={{
                    color:'var(--text-dim)', fontSize:'0.85rem', marginBottom:'0.75rem',
                    overflow:'hidden', display:'-webkit-box',
                    WebkitLineClamp:2, WebkitBoxOrient:'vertical',
                  }}>{q.description}</p>
                )}
                <p style={{ color:'var(--text-dim)', fontSize:'0.75rem' }}>
                  {new Date(q.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                </p>
              </div>

              {/* Actions */}
              <div style={{
                display:'flex', gap:'0.5rem', padding:'0.75rem 1.25rem',
                borderTop:'1px solid var(--border-subtle)',
                background:'rgba(0,0,0,0.2)',
              }}>
                <button className="btn btn-green" style={{ flex:1, gap:'0.3rem' }}
                  onClick={() => handleLaunch(q.id)}
                  disabled={launching === q.id}>
                  {launching === q.id ? (
                    <><span className="spinner" style={{ width:16,height:16,borderWidth:2 }} /> Starting...</>
                  ) : '▶ Play'}
                </button>
                <Link to={`/quiz/${q.id}/edit`} style={{ flex:1 }}>
                  <button className="btn btn-ghost" style={{ width:'100%' }}>✏ Edit</button>
                </Link>
                <button className="btn btn-danger btn-icon"
                  onClick={() => handleDelete(q.id)}
                  disabled={deleting === q.id}
                  title="Delete quiz">
                  {deleting === q.id ? '…' : '🗑'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
