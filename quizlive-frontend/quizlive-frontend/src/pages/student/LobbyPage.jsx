import { useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import StarBackground from '../../components/StarBackground';

const AVATAR_COLORS = [
  'var(--purple)', 'var(--cyan)', 'var(--green)', 'var(--pink)',
  'var(--orange)', '#fbbf24', '#818cf8', '#34d399',
];

function getColor(nickname) {
  let hash = 0;
  for (let c of nickname) hash = (hash << 5) - hash + c.charCodeAt(0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function LobbyPage() {
  const { code }           = useParams();
  const [searchParams]     = useSearchParams();
  const nickname           = searchParams.get('nickname') || 'Player';
  const navigate           = useNavigate();
  const { game, updateGame, handleWsEvent } = useGame();

  // sendRef lets onMessage call send without a circular dependency
  // (onMessage is defined before useWebSocket runs, so send doesn't exist yet)
  const sendRef = useRef(null);

  const onMessage = useCallback((type, payload) => {
    handleWsEvent(type, payload);
    if (type === 'connected') {
      sendRef.current?.('player.join', { nickname });
    }
    if (type === 'game.started') {
      navigate(`/play/${code}`);
    }
  }, [code, navigate, handleWsEvent, nickname]);

  const _token = localStorage.getItem('access') || '';
  const { send } = useWebSocket(code, onMessage, _token);
  sendRef.current = send;  // always keep ref current

  useEffect(() => {
    updateGame({ gameCode: code, nickname });
  }, [code, nickname]);

  return (
    <div className="page-bg" style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:'2rem 1rem',
    }}>
      <StarBackground density={60} />

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:600, textAlign:'center' }}>
        {/* Logo */}
        <div style={{ marginBottom:'2rem', animation:'fadeIn 0.5s ease' }}>
          <span style={{ fontSize:'3rem', display:'inline-block', animation:'float 3s ease-in-out infinite' }}>🎯</span>
          <h1 style={{
            fontFamily:'var(--font-display)', fontSize:'2rem', fontWeight:900,
            color:'var(--text-bright)', margin:'0.25rem 0',
          }}>QUIZLIVE</h1>
        </div>

        {/* Code display */}
        <div style={{
          marginBottom:'2rem',
          animation:'fadeInScale 0.5s 0.1s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <p style={{ color:'var(--text-dim)', fontSize:'0.85rem', marginBottom:'0.35rem' }}>Game Code</p>
          <div className="game-code">{code}</div>
        </div>

        {/* Status card */}
        <div className="glass card card-glow" style={{
          padding:'2rem', marginBottom:'2rem',
          animation:'fadeIn 0.6s 0.2s ease both',
        }}>
          {/* Waiting animation */}
          <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem', marginBottom:'1rem' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width:12, height:12, borderRadius:'50%',
                background:'var(--purple-glow)',
                animation:`pulse 1.2s ${i*0.2}s ease-in-out infinite`,
                boxShadow:'0 0 10px var(--purple-glow)',
              }} />
            ))}
          </div>
          <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'1.4rem', color:'var(--text-bright)', marginBottom:'0.5rem' }}>
            Waiting for host to start…
          </h2>
          <p style={{ color:'var(--text-dim)', fontSize:'0.9rem' }}>
            You're in as{' '}
            <strong style={{
              color:'var(--cyan)',
              fontFamily:'var(--font-heading)', fontSize:'1.1rem',
            }}>{nickname}</strong>
          </p>
        </div>

        {/* Players */}
        <div className="card glass" style={{ padding:'1.5rem', animation:'fadeIn 0.7s 0.3s ease both' }}>
          <h3 style={{
            fontFamily:'var(--font-heading)', fontSize:'1rem', fontWeight:700,
            color:'var(--text-dim)', letterSpacing:'0.08em', marginBottom:'1rem',
          }}>
            {game.players.length} PLAYER{game.players.length !== 1 ? 'S' : ''} JOINED
          </h3>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.6rem', justifyContent:'center' }}>
            {game.players.map((p, i) => {
              const isMe  = p.nickname === nickname;
              const color = getColor(p.nickname);
              return (
                <div key={p.id || i} style={{
                  display:'flex', alignItems:'center', gap:'0.5rem',
                  padding:'0.4rem 1rem', borderRadius:'var(--radius-pill)',
                  background: isMe ? `${color}25` : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${isMe ? color : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: isMe ? `0 0 12px ${color}50` : 'none',
                  animation:'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                  animationDelay: `${i * 0.05}s`,
                  animationFillMode:'both',
                }}>
                  {/* Avatar circle */}
                  <div style={{
                    width:24, height:24, borderRadius:'50%',
                    background:color, display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.7rem', fontWeight:900, color:'#000',
                    flexShrink:0,
                  }}>
                    {p.nickname[0].toUpperCase()}
                  </div>
                  <span style={{
                    fontWeight: isMe ? 800 : 600,
                    color: isMe ? color : 'var(--text-mid)',
                    fontSize:'0.875rem',
                  }}>
                    {p.nickname}{isMe ? ' (you)' : ''}
                  </span>
                </div>
              );
            })}
            {game.players.length === 0 && (
              <p style={{ color:'var(--text-dim)', fontSize:'0.875rem' }}>Waiting for others…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
