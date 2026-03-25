/**
 * src/pages/student/JoinPage.jsx
 * 
 * Uses joinGame() (POST /sessions/join/) instead of getStatus() (GET).
 * joinGame sends both code and nickname, backend validates both,
 * returns status. On success navigate to lobby.
 */
import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { joinGame } from '../../api/sessionApi';
import StarBackground from '../../components/StarBackground';

export default function JoinPage() {
  const { code: paramCode } = useParams();
  const navigate            = useNavigate();
  const { updateGame }      = useGame();
  const [code,    setCode]    = useState(paramCode || '');
  const [nickname, setNickname] = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [codeFoc, setCodeFoc] = useState(false);
  const [nickFoc, setNickFoc] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    const uc   = code.trim().toUpperCase();
    const nick = nickname.trim().slice(0, 30);
    if (uc.length !== 6) { setError('Enter a valid 6-character game code.'); return; }
    if (!nick)           { setError('Pick a nickname!'); return; }

    setLoading(true);
    try {
      const { data } = await joinGame(uc, nick);
      // Backend already validated status — if we're here it's joinable
      updateGame({ gameCode: data.game_code, nickname: nick, status: 'lobby' });
      navigate(`/lobby/${data.game_code}?nickname=${encodeURIComponent(nick)}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Game not found. Double-check the code.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="page-bg" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:'1rem' }}>
      <StarBackground density={80} />

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:460, animation:'fadeIn 0.6s ease' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <div style={{ fontSize:'5rem', display:'inline-block', animation:'float 3s ease-in-out infinite' }}>🎯</div>
          <h1 style={{
            fontFamily:'var(--font-display)', fontSize:'3rem', fontWeight:900,
            background:'linear-gradient(135deg, var(--purple-glow), var(--cyan))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            margin:'0.25rem 0 0', letterSpacing:'0.1em',
          }}>QUIZLIVE</h1>
          <p style={{ color:'var(--text-dim)', marginTop:'0.25rem' }}>Enter the game code to join</p>
        </div>

        <div className="glass card card-glow" style={{ padding:'2.5rem', animation:'fadeInScale 0.5s 0.1s cubic-bezier(0.34,1.56,0.64,1) both' }}>

          {error && <div className="alert-error" style={{ marginBottom:'1.5rem' }}>{error}</div>}

          <form onSubmit={handleJoin} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            {/* Code input */}
            <div>
              <label style={{ display:'block', color:'var(--text-dim)', fontSize:'0.75rem',
                fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'0.5rem',
                textAlign:'center' }}>
                Game Code
              </label>
              <input
                className="input input-lg"
                placeholder="ABC123"
                value={code}
                maxLength={6}
                autoFocus
                onFocus={() => setCodeFoc(true)}
                onBlur={()  => setCodeFoc(false)}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}
                style={{
                  fontSize:'2.5rem', letterSpacing:'0.4em', textAlign:'center',
                  fontFamily:'var(--font-display)', fontWeight:900,
                  color: code ? 'var(--gold)' : 'var(--text-dim)',
                  borderColor: codeFoc ? 'var(--gold)' : 'var(--border-subtle)',
                  boxShadow: codeFoc ? '0 0 0 3px rgba(255,215,0,0.15), 0 0 30px rgba(255,215,0,0.1)' : 'none',
                  background: code ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.03)',
                }}
              />
            </div>

            {/* Nickname */}
            <div>
              <label style={{ display:'block', color:'var(--text-dim)', fontSize:'0.75rem',
                fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'0.5rem',
                textAlign:'center' }}>
                Your Nickname
              </label>
              <input
                className="input"
                placeholder="Pick a cool name..."
                value={nickname}
                maxLength={30}
                onFocus={() => setNickFoc(true)}
                onBlur={()  => setNickFoc(false)}
                onChange={e => setNickname(e.target.value)}
                style={{
                  fontSize:'1.2rem', textAlign:'center', fontWeight:700,
                  borderColor: nickFoc ? 'var(--cyan)' : 'var(--border-subtle)',
                  boxShadow: nickFoc ? '0 0 0 3px rgba(0,212,255,0.15)' : 'none',
                }}
              />
            </div>

            <button className="btn btn-green btn-xl" type="submit" disabled={loading}
              style={{ width:'100%', fontSize:'1.2rem', marginTop:'0.5rem' }}>
              {loading ? (
                <><span className="spinner" style={{ width:22,height:22,borderWidth:2 }} /> Joining...</>
              ) : 'Join Game →'}
            </button>
          </form>

          <div className="divider" />
          <div style={{ textAlign:'center' }}>
            <Link to="/login" style={{ color:'var(--text-dim)', fontSize:'0.875rem' }}>
              Teacher? <span style={{ color:'var(--purple-glow)' }}>Sign in →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
