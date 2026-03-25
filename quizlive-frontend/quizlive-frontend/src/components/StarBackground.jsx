import { useMemo } from 'react';

export default function StarBackground({ density = 60 }) {
  const stars = useMemo(() => Array.from({ length: density }, (_, i) => ({
    id: i,
    x:    Math.random() * 100,
    y:    Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    dur:  Math.random() * 4 + 3,
    del:  Math.random() * 5,
    opacity: Math.random() * 0.6 + 0.2,
  })), [density]);

  // Drifting orbs in background
  const orbs = useMemo(() => [
    { x: 15, y: 20, size: 300, color: 'rgba(124,58,237,0.07)' },
    { x: 75, y: 60, size: 250, color: 'rgba(0,212,255,0.05)'  },
    { x: 50, y: 85, size: 200, color: 'rgba(255,0,110,0.04)'  },
  ], []);

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
    }}>
      {/* Orb glows */}
      {orbs.map((o, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${o.x}%`, top: `${o.y}%`,
          width: o.size, height: o.size,
          borderRadius: '50%',
          background: o.color,
          filter: 'blur(60px)',
          transform: 'translate(-50%, -50%)',
          animation: `float ${6 + i * 2}s ease-in-out infinite`,
          animationDelay: `${i * 1.5}s`,
        }} />
      ))}
      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
      {/* Stars */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
        {stars.map(s => (
          <circle key={s.id}
            cx={`${s.x}%`} cy={`${s.y}%`}
            r={s.size} fill="white" opacity={s.opacity}
            style={{ animation: `pulse ${s.dur}s ease-in-out infinite`, animationDelay: `${s.del}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
