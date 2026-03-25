import { useEffect } from 'react';
import { useTimer } from '../hooks/useTimer';

export default function Timer({ seconds, running, onExpire }) {
  const { timeLeft, start, stop } = useTimer(onExpire);

  useEffect(() => {
    if (running) start(seconds);
    else         stop();
  }, [running, seconds]);

  const pct     = seconds > 0 ? (timeLeft / seconds) * 100 : 0;
  const danger  = timeLeft <= 5 && timeLeft > 0;
  const warning = timeLeft <= seconds * 0.4 && !danger;

  const trackColor = danger  ? 'rgba(255,0,110,0.25)'
                   : warning ? 'rgba(255,107,53,0.25)'
                   : 'rgba(124,58,237,0.25)';
  const fillColor  = danger  ? 'var(--pink)'
                   : warning ? 'var(--orange)'
                   : 'var(--purple-glow)';
  const glowColor  = danger  ? 'rgba(255,0,110,0.6)'
                   : warning ? 'rgba(255,107,53,0.6)'
                   : 'rgba(157,92,255,0.5)';

  const circleR = 44;
  const circleC = 2 * Math.PI * circleR;
  const dash    = circleC * (pct / 100);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.75rem' }}>
      {/* Circular timer */}
      <div style={{ position:'relative', width:120, height:120 }}>
        <svg width="120" height="120" style={{ transform:'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="60" cy="60" r={circleR}
            fill="none" stroke={trackColor} strokeWidth="8" />
          {/* Progress */}
          <circle cx="60" cy="60" r={circleR}
            fill="none" stroke={fillColor} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circleC}`}
            style={{
              transition: 'stroke-dasharray 1s linear, stroke 0.3s',
              filter: `drop-shadow(0 0 6px ${glowColor})`,
            }}
          />
        </svg>
        {/* Number */}
        <div style={{
          position:'absolute', inset:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-display)', fontSize:'2rem', fontWeight:900,
          color: fillColor,
          textShadow: `0 0 20px ${glowColor}`,
          animation: danger ? 'timer-pulse 0.5s ease-in-out infinite' : 'none',
        }}>
          {timeLeft}
        </div>
      </div>

      {/* Linear bar */}
      <div style={{
        width: '100%', maxWidth: 500,
        height: 8, borderRadius: 4,
        background: trackColor,
        overflow: 'hidden',
      }}>
        <div style={{
          height:'100%', borderRadius:4,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${fillColor}, white)`,
          boxShadow: `0 0 12px ${glowColor}`,
          transition: 'width 1s linear, background 0.3s',
        }} />
      </div>
    </div>
  );
}
