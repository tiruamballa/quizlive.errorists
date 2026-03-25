/**
 * LandingPage.jsx
 * Drop in:  src/pages/LandingPage.jsx
 * Route  :  <Route path="/" element={<LandingPage />} />
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import TrueFocus      from '../components/TrueFocus';
import ElectricBorder from '../components/ElectricBorder';

// ─── Particle canvas ─────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Build particle pool
    const COUNT = 110;
    const particles = Array.from({ length: COUNT }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height,
      r:    Math.random() * 1.6 + 0.3,
      vx:   (Math.random() - 0.5) * 0.35,
      vy:   (Math.random() - 0.5) * 0.35,
      // colour: mix of purple, cyan, white
      hue:  [270, 190, 220, 260, 195][Math.floor(Math.random() * 5)],
      alpha: Math.random() * 0.5 + 0.15,
    }));

    const CONNECT_DIST = 130;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Move
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      // Draw connections
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const opacity = (1 - dist / CONNECT_DIST) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${particles[i].hue}, 80%, 65%, ${opacity})`;
            ctx.lineWidth   = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.alpha})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  );
}

// ─── Typewriter ───────────────────────────────────────────────────────────────
const TOPICS = ['Python', 'Django', 'JavaScript', 'Maths', 'HTML & CSS', 'Data Structures', 'Algebra', 'SQL', 'Git'];

function Typewriter() {
  const [topicIdx, setTopicIdx]   = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting,  setDeleting]  = useState(false);
  const [paused,    setPaused]    = useState(false);

  useEffect(() => {
    const topic   = TOPICS[topicIdx];
    if (paused) {
      const t = setTimeout(() => { setDeleting(true); setPaused(false); }, 1600);
      return () => clearTimeout(t);
    }
    if (!deleting) {
      if (displayed.length < topic.length) {
        const t = setTimeout(() => setDisplayed(topic.slice(0, displayed.length + 1)), 72);
        return () => clearTimeout(t);
      } else {
        setPaused(true);
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 38);
        return () => clearTimeout(t);
      } else {
        setDeleting(false);
        setTopicIdx(i => (i + 1) % TOPICS.length);
      }
    }
  }, [displayed, deleting, paused, topicIdx]);

  return (
    <span style={{ color: 'var(--cyan)', fontWeight: 800 }}>
      {displayed}
      <span style={{
        display: 'inline-block', width: 3, height: '1em',
        background: 'var(--cyan)', marginLeft: 3,
        verticalAlign: 'middle',
        animation: 'cursorBlink 0.9s step-end infinite',
      }} />
    </span>
  );
}

// ─── Quiz card — inner content rendered inside ElectricBorder ────────────────
const DIFF_META = {
  easy:   { color: '#4ade80', label: 'Easy'   },
  medium: { color: '#fb923c', label: 'Medium' },
  hard:   { color: '#f43f5e', label: 'Hard'   },
};

function QuizCardInner({ emoji, title, score, difficulty, time }) {
  const diff = DIFF_META[difficulty] || DIFF_META.medium;
  return (
    <div style={{
      background: 'rgba(8,8,28,0.82)',
      backdropFilter: 'blur(18px)',
      borderRadius: 18,
      padding: '1.4rem 1.6rem',
      width: 210,
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      {/* Emoji + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{
          fontSize: '1.75rem', lineHeight: 1,
          filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
        }}>{emoji}</span>
        <p style={{
          color: '#f0f0ff', fontWeight: 800, fontSize: '0.95rem',
          margin: 0, lineHeight: 1.25,
        }}>{title}</p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {/* Badges */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <span style={{
          padding: '0.18rem 0.6rem', borderRadius: 99,
          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em',
          background: `${diff.color}18`,
          color: diff.color,
          border: `1px solid ${diff.color}40`,
        }}>{diff.label}</span>
        <span style={{
          padding: '0.18rem 0.6rem', borderRadius: 99,
          fontSize: '0.65rem', fontWeight: 700,
          background: 'rgba(6,182,212,0.1)',
          color: '#38bdf8',
          border: '1px solid rgba(6,182,212,0.28)',
        }}>⏱ {time}s</span>
      </div>

      {/* Score row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 2,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', fontWeight: 600 }}>
          Top score
        </span>
        <span style={{
          color: '#fbbf24', fontWeight: 900, fontSize: '1.05rem',
          textShadow: '0 0 12px rgba(251,191,36,0.5)',
        }}>
          {score}
        </span>
      </div>
    </div>
  );
}

// Each card gets its own electric colour keyed to topic
const CARD_COLORS = {
  '🐍': '#4ade80',   // Python   — green
  '⚡': '#f43f5e',   // Django   — red/pink
  '🧮': '#a78bfa',   // Algebra  — purple
  '🌐': '#38bdf8',   // JS       — cyan
};

// ─── Floating card wrapper ────────────────────────────────────────────────────
function FloatingCard({ children, delay = 0, xOffset = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'relative' }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 3.5 + delay,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: delay * 0.4,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────
function StepCard({ number, icon, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      style={{
        flex: '1 1 220px', maxWidth: 280,
        background: 'rgba(13,13,46,0.7)',
        border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: 20, padding: '2rem 1.75rem',
        backdropFilter: 'blur(16px)',
        position: 'relative', overflow: 'hidden',
        cursor: 'default',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Number watermark */}
      <span style={{
        position: 'absolute', top: -14, right: 16,
        fontSize: '5rem', fontWeight: 900, opacity: 0.04,
        color: 'white', lineHeight: 1, userSelect: 'none',
        fontFamily: 'monospace',
      }}>{number}</span>

      <div style={{ fontSize: '2.4rem', marginBottom: '0.75rem' }}>{icon}</div>
      <h3 style={{
        color: 'var(--text-bright)', fontWeight: 800, fontSize: '1rem',
        marginBottom: '0.5rem', fontFamily: 'var(--font-heading)',
      }}>{title}</h3>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
        {desc}
      </p>
    </motion.div>
  );
}

// ─── Stat counter ─────────────────────────────────────────────────────────────
function StatPill({ value, label, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      style={{
        textAlign: 'center', padding: '1.5rem 2rem',
        background: 'rgba(13,13,46,0.6)',
        border: `1px solid ${color}33`,
        borderRadius: 20, backdropFilter: 'blur(12px)',
        flex: '1 1 140px',
      }}
    >
      <div style={{ fontSize: '2.4rem', fontWeight: 900, color, fontFamily: 'var(--font-display, monospace)' }}>
        {value}
      </div>
      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 4, fontWeight: 600 }}>
        {label}
      </div>
    </motion.div>
  );
}

// ─── Full-screen intro overlay ───────────────────────────────────────────────
function IntroOverlay({ onDone }) {
  // Phase: 'in' → hold → 'out' → done
  const [phase, setPhase] = useState('in');

  useEffect(() => {
    // After TrueFocus has cycled both words (≈ 2.8 s), start fade-out
    const holdTimer = setTimeout(() => setPhase('out'), 2800);
    return () => clearTimeout(holdTimer);
  }, []);

  // When the fade-out transition ends, tell parent we're done
  const handleTransitionEnd = () => {
    if (phase === 'out') onDone();
  };

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-void, #050510)',
        opacity: phase === 'out' ? 0 : 1,
        pointerEvents: phase === 'out' ? 'none' : 'all',
        transition: 'opacity 0.85s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Glow blob behind text */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      {/* TrueFocus — big, centred */}
      <div style={{
        position: 'relative', zIndex: 1,
        opacity: phase === 'in' ? 1 : 0,
        transform: phase === 'in' ? 'scale(1)' : 'scale(1.06)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        <TrueFocus
          sentence="QUIZ LIVE"
          manualMode={false}
          blurAmount={7}
          borderColor="#06b6d4"
          glowColor="rgba(6,182,212,0.75)"
          animationDuration={0.55}
          pauseBetweenAnimations={1.1}
        />
      </div>

      {/* Subtle tagline that fades in after 0.4 s */}
      <p style={{
        position: 'relative', zIndex: 1,
        marginTop: '2rem',
        color: 'rgba(255,255,255,0.3)',
        fontFamily: 'var(--font-heading, sans-serif)',
        fontSize: '0.9rem', fontWeight: 700,
        letterSpacing: '0.25em', textTransform: 'uppercase',
        animation: 'fadeIn 0.6s 0.4s ease both',
      }}>
        Play · Learn · Compete
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate    = useNavigate();
  const heroRef     = useRef(null);
  const [joinCode,   setJoinCode]   = useState('');
  const [introDone,  setIntroDone]  = useState(false);

  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY       = useTransform(scrollYProgress, [0, 0.6], [0, -80]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim()) navigate(`/join/${joinCode.trim().toUpperCase()}`);
  };

  // How long to delay the landing page content after intro starts fading (ms)
  const CONTENT_DELAY = introDone ? 0 : 0.4;

  return (
    <div style={{
      background: 'var(--bg-deep, #05050f)',
      color: 'var(--text-bright, #f0f0ff)',
      fontFamily: 'var(--font-body, system-ui)',
      overflowX: 'hidden',
      minHeight: '100vh',
    }}>

      {/* ── Full-screen intro — shown once, then fades away ──────────────── */}
      {!introDone && <IntroOverlay onDone={() => setIntroDone(true)} />}

      {/* ── Keyframes injected once ─────────────────────────────────────── */}
      <style>{`
        @keyframes cursorBlink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulseRing    { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(1.9);opacity:0} }
        @keyframes gradientShift{ 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes scanline     { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        .lp-cta-primary {
          position: relative;
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.9rem 2.4rem;
          border-radius: 99px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5, #06b6d4);
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
          color: #fff; font-weight: 800; font-size: 1rem;
          border: none; cursor: pointer; text-decoration: none;
          box-shadow: 0 0 30px rgba(124,58,237,0.5), 0 4px 16px rgba(0,0,0,0.4);
          transition: transform 0.2s, box-shadow 0.2s;
          overflow: visible;
        }
        .lp-cta-primary::before {
          content:'';
          position:absolute; inset:-2px; border-radius:99px;
          background: linear-gradient(135deg,#7c3aed,#06b6d4);
          z-index:-1; opacity:0;
          transition: opacity 0.3s;
        }
        .lp-cta-primary:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 0 50px rgba(124,58,237,0.7), 0 8px 24px rgba(0,0,0,0.5); }
        .lp-cta-primary:hover::before { opacity: 1; }
        .lp-cta-secondary {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.875rem 2rem;
          border-radius: 99px;
          background: transparent;
          color: var(--text-bright, #f0f0ff);
          font-weight: 700; font-size: 1rem;
          border: 1px solid rgba(255,255,255,0.2);
          cursor: pointer; text-decoration: none;
          backdrop-filter: blur(8px);
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
        }
        .lp-cta-secondary:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.4);
          transform: translateY(-2px);
        }
        .lp-join-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 12px 0 0 12px;
          padding: 0.75rem 1.25rem;
          color: #fff; font-size: 1rem; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          outline: none; width: 160px;
          transition: border-color 0.2s, background 0.2s;
        }
        .lp-join-input::placeholder { color: rgba(255,255,255,0.25); letter-spacing: 0.1em; text-transform: none; font-weight: 400; }
        .lp-join-input:focus { border-color: rgba(0,212,255,0.6); background: rgba(0,212,255,0.06); }
        .lp-join-btn {
          background: var(--cyan, #06b6d4);
          color: #05050f;
          border: none; cursor: pointer;
          padding: 0.75rem 1.5rem;
          border-radius: 0 12px 12px 0;
          font-weight: 900; font-size: 0.95rem;
          transition: filter 0.2s, transform 0.2s;
        }
        .lp-join-btn:hover { filter: brightness(1.15); transform: scale(1.03); }
        .nav-link {
          color: rgba(255,255,255,0.6);
          text-decoration: none; font-size: 0.9rem; font-weight: 600;
          transition: color 0.2s;
          padding: 0.25rem 0;
        }
        .nav-link:hover { color: rgba(255,255,255,0.95); }
        .lp-section { position: relative; z-index: 1; }
      `}</style>

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={introDone ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 2.5rem', height: 64,
          background: 'rgba(5,5,16,0.75)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', boxShadow: '0 0 12px rgba(124,58,237,0.6)',
          }}>⚡</div>
          <span style={{
            fontFamily: 'var(--font-heading, monospace)', fontWeight: 900,
            fontSize: '1.1rem', letterSpacing: '0.05em',
            background: 'linear-gradient(90deg,#a78bfa,#38bdf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>QUIZ LIVE</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#topics" className="nav-link">Topics</a>
          <Link to="/login" className="nav-link">Sign in</Link>
          <Link to="/register" className="lp-cta-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
            Get Started
          </Link>
        </div>
      </motion.nav>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        style={{
          position: 'relative', minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          paddingTop: 96, paddingBottom: 40, overflow: 'hidden',
        }}
      >
        <ParticleCanvas />

        {/* Radial glow blobs */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '10%', left: '15%',
            width: 600, height: 600, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />
          <div style={{
            position: 'absolute', top: '25%', right: '10%',
            width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', left: '40%',
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,63,94,0.1) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }} />
        </div>

        {/* Scanline effect */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          overflow: 'hidden', opacity: 0.025,
        }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.8),transparent)',
            animation: 'scanline 8s linear infinite',
          }} />
        </div>

        {/* Hero content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={introDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
         // ADD width: '100%'
style={{ opacity: heroOpacity, position: 'relative', zIndex: 1, width: '100%' }}
        >
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center',
            gap: '1.75rem', padding: '0 1rem', maxWidth: 800,margin: '0 auto',
          }}>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={introDone ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 20 }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.35rem 1rem',
                borderRadius: 99,
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.4)',
                color: '#c4b5fd',
                fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#a78bfa',
                  boxShadow: '0 0 8px #a78bfa',
                  display: 'inline-block',
                }} />
                Live Multiplayer Quiz Platform
              </span>
            </motion.div>

            {/* ★ TrueFocus headline ★ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={introDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.35, duration: 0.7 }}
              style={{ width: '100%' }}
            >
              <TrueFocus
                sentence="QUIZ LIVE"
                manualMode={false}
                blurAmount={6}
                borderColor="#06b6d4"
                glowColor="rgba(6,182,212,0.7)"
                animationDuration={0.6}
                pauseBetweenAnimations={1.4}
              />
            </motion.div>

            {/* Typewriter subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={introDone ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
                color: 'rgba(255,255,255,0.55)',
                margin: 0, lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              Real-time quizzes on{' '}
              <Typewriter />
            </motion.p>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={introDone ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.6 }}
              style={{
                color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem',
                maxWidth: 520, lineHeight: 1.7, margin: 0,
              }}
            >
              Host live quiz battles for your class. Students join with a code, answer in real-time,
              and compete on a live leaderboard — all powered by WebSockets.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={introDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ delay: 0.75 }}
              style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}
            >
              {/* Pulsing ring behind primary CTA */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', inset: -6, borderRadius: 99,
                  border: '2px solid rgba(124,58,237,0.5)',
                  animation: 'pulseRing 2s ease-out infinite',
                }} />
                <Link to="/register" className="lp-cta-primary">
                  🚀 Start for Free
                </Link>
              </div>
              <Link to="/login" className="lp-cta-secondary">
                Sign In →
              </Link>
            </motion.div>

            {/* Quick join */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={introDone ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.9 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
            >
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                Got a game code?
              </p>
              <form onSubmit={handleJoin} style={{ display: 'flex' }}>
                <input
                  className="lp-join-input"
                  placeholder="Enter code…"
                  value={joinCode}
                  maxLength={8}
                  onChange={e => setJoinCode(e.target.value)}
                />
                <button type="submit" className="lp-join-btn">Join ⚡</button>
              </form>
            </motion.div>
          </div>

          {/* ── Floating quiz cards with ElectricBorder ─────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={introDone ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 1.0 }}
            style={{
              display: 'flex', gap: '1.5rem', justifyContent: 'center',
              flexWrap: 'wrap', marginTop: '4rem',
              padding: '0 1rem',
            }}
          >
            {[
              { emoji: '🐍', title: 'Python Basics',  score: '2840', difficulty: 'easy',   time: 20, delay: 1.2  },
              { emoji: '⚡', title: 'Django ORM',     score: '3120', difficulty: 'hard',   time: 30, delay: 1.35 },
              { emoji: '🧮', title: 'Algebra',        score: '1950', difficulty: 'medium', time: 25, delay: 1.5  },
              { emoji: '🌐', title: 'JavaScript',     score: '2670', difficulty: 'medium', time: 25, delay: 1.65 },
            ].map(card => (
              <FloatingCard key={card.emoji} delay={card.delay}>
                <ElectricBorder
                  color={CARD_COLORS[card.emoji]}
                  speed={0.9}
                  chaos={0.11}
                  borderRadius={18}
                >
                  <QuizCardInner
                    emoji={card.emoji}
                    title={card.title}
                    score={card.score}
                    difficulty={card.difficulty}
                    time={card.time}
                  />
                </ElectricBorder>
              </FloatingCard>
            ))}
          </motion.div>

        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={introDone ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1.3 }}
          style={{
            position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '0.4rem', zIndex: 1,
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem',
            fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 18, height: 28, borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', justifyContent: 'center', paddingTop: 5 }}
          >
            <div style={{
              width: 3, height: 7, borderRadius: 99,
              background: 'rgba(255,255,255,0.35)',
            }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ══ STATS ════════════════════════════════════════════════════════════ */}
      <section className="lp-section" style={{ padding: '5rem 2rem' }}>
        <div style={{
          maxWidth: 860, margin: '0 auto',
          display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <StatPill value="12+"    label="Quiz Topics"          color="var(--purple-glow, #a78bfa)" />
          <StatPill value="212"    label="Questions Ready"      color="var(--cyan, #38bdf8)"        />
          <StatPill value="∞"      label="Live Players"         color="var(--green, #4ade80)"       />
          <StatPill value="Real‑time" label="WebSocket Powered" color="var(--orange, #fb923c)"      />
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="lp-section" style={{ padding: '4rem 2rem 6rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '3.5rem' }}
        >
          <p style={{ color: 'var(--cyan, #38bdf8)', fontWeight: 700, fontSize: '0.78rem',
            letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            How it works
          </p>
          <h2 style={{
            fontFamily: 'var(--font-heading, monospace)', fontWeight: 900,
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            background: 'linear-gradient(135deg,#f0f0ff 40%,#a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            Three steps to quiz glory
          </h2>
        </motion.div>

        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <StepCard delay={0}   number="01" icon="📋" title="Create your quiz"
            desc="Import questions from CSV or build them manually. Set difficulty, time limits, and point values for each question." />
          <StepCard delay={0.1} number="02" icon="🔗" title="Share the game code"
            desc="Launch a live session and share the 6-digit code with your students. They join instantly — no account needed." />
          <StepCard delay={0.2} number="03" icon="🏆" title="Play & compete live"
            desc="Students answer in real-time. The live leaderboard updates after every question. Power-ups and streaks keep things spicy." />
        </div>
      </section>

      {/* ══ TOPICS MARQUEE ══════════════════════════════════════════════════ */}
      <section id="topics" className="lp-section" style={{
        padding: '3rem 0', overflow: 'hidden',
        borderTop:  '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <style>{`
          @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
          .marquee-track { display:flex; gap:2rem; animation: marquee 28s linear infinite; white-space:nowrap; }
          .marquee-track:hover { animation-play-state: paused; }
        `}</style>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem',
          fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
          marginBottom: '1.5rem' }}>
          Available quiz topics
        </p>

        <div style={{ overflow: 'hidden' }}>
          <div className="marquee-track">
            {[...TOPICS, ...TOPICS].map((t, i) => (
              <span key={i} style={{
                padding: '0.5rem 1.4rem', borderRadius: 99,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.9rem', fontWeight: 700,
                flexShrink: 0,
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES GRID ═══════════════════════════════════════════════════ */}
      <section className="lp-section" style={{ padding: '6rem 2rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '3.5rem' }}
          >
            <h2 style={{
              fontFamily: 'var(--font-heading, monospace)', fontWeight: 900,
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              background: 'linear-gradient(135deg,#f0f0ff 40%,#38bdf8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>
              Everything you need
            </h2>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}>
            {[
              { icon:'⚡', title:'Real-time WebSockets',   desc:'Answers and scores update instantly for every player — no polling, no lag.',                    color:'#38bdf8' },
              { icon:'🔥', title:'Streak Bonuses',         desc:'Keep a streak going for ×1.5 or ×2 score multipliers. Wrong answer resets it.',                 color:'#fb923c' },
              { icon:'🎯', title:'Power-ups',              desc:'50/50, Double Points, and Skip — one of each per game, strategy required.',                      color:'#a78bfa' },
              { icon:'📥', title:'CSV Import',             desc:'Upload a spreadsheet of questions and import an entire quiz in seconds.',                        color:'#4ade80' },
              { icon:'📊', title:'Live Answer Tracking',   desc:'Host sees how many students have answered in real-time with a progress bar.',                    color:'#f59e0b' },
              { icon:'🏅', title:'Live Leaderboard',       desc:'Ranked scoreboard updates after every question. Top 3 are highlighted with special styles.',     color:'#f43f5e' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -3, borderColor: `${f.color}44` }}
                style={{
                  padding: '1.75rem',
                  background: 'rgba(13,13,46,0.6)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 18,
                  backdropFilter: 'blur(12px)',
                  transition: 'border-color 0.2s',
                  cursor: 'default',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, marginBottom: '1rem',
                  background: `${f.color}15`,
                  border: `1px solid ${f.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem',
                }}>
                  {f.icon}
                </div>
                <h3 style={{ color: 'var(--text-bright, #f0f0ff)', fontWeight: 800,
                  fontSize: '0.95rem', margin: '0 0 0.5rem',
                  fontFamily: 'var(--font-heading, monospace)' }}>
                  {f.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem',
                  lineHeight: 1.65, margin: 0 }}>
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════════════════════════════════ */}
      <section className="lp-section" style={{ padding: '5rem 2rem 7rem' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          style={{
            maxWidth: 680, margin: '0 auto', textAlign: 'center',
            padding: '4rem 3rem',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08))',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 28, position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
            width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
            filter: 'blur(30px)', pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
            <h2 style={{
              fontFamily: 'var(--font-heading, monospace)', fontWeight: 900,
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              background: 'linear-gradient(135deg,#f0f0ff,#a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: '1rem',
            }}>
              Ready to run your first quiz?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.95rem',
              lineHeight: 1.7, marginBottom: '2rem', maxWidth: 400, margin: '0 auto 2rem' }}>
              Create an account, upload a CSV, and you can have a live game running in under 2 minutes.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="lp-cta-primary" style={{ fontSize: '1.05rem', padding: '1rem 2.75rem' }}>
                🚀 Create Free Account
              </Link>
              <Link to="/login" className="lp-cta-secondary">Sign In</Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══ TEAM SECTION ════════════════════════════════════════════════════ */}
      <section className="lp-section" style={{ padding: '5rem 2rem 6rem', position: 'relative', overflow: 'hidden' }}>

        {/* Background glow blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{
            position: 'absolute', top: '20%', left: '10%',
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', right: '5%',
            width: 350, height: 350, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }} />
        </div>

        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '1rem' }}
          >
            <p style={{
              color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem',
            }}>
              The people behind it
            </p>

            {/* ERRORISTS team name */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-display, monospace)',
                fontWeight: 900,
                fontSize: 'clamp(2.8rem, 8vw, 5rem)',
                letterSpacing: '0.12em',
                margin: 0,
                background: 'linear-gradient(135deg, #a78bfa 0%, #38bdf8 50%, #a78bfa 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'gradientShift 4s ease infinite',
              }}>
                ERRORISTS
              </h2>
              {/* Glow behind text */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(56,189,248,0.15))',
                filter: 'blur(20px)',
                zIndex: -1,
              }} />
            </div>

            <p style={{
              color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem',
              fontWeight: 500, letterSpacing: '0.04em',
            }}>
              8 developers · 1 mission · endless bugs fixed
            </p>
          </motion.div>

          {/* Thin divider line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              height: 1, maxWidth: 320, margin: '2rem auto 3.5rem',
              background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.5), rgba(56,189,248,0.5), transparent)',
              transformOrigin: 'center',
            }}
          />

          {/* Member cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1.25rem',
          }}>
            {[
              { name: 'Charan Kotaru',          initials: 'CK', color: '#a78bfa' },
              { name: 'Tiru Amballa',            initials: 'TA', color: '#38bdf8' },
              { name: 'Sairam Chitturi',         initials: 'SC', color: '#4ade80' },
              { name: 'Jagadeesh Daketi',        initials: 'JD', color: '#fb923c' },
              { name: 'Bhavyasai Challapalli',   initials: 'BC', color: '#f43f5e' },
              { name: 'Geetha Chikkala',         initials: 'GC', color: '#fbbf24' },
              { name: 'Rohini Chimata',          initials: 'RC', color: '#e879f9' },
              { name: 'Kavya Kanamarlapudi',     initials: 'KK', color: '#34d399' },
            ].map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                style={{
                  /* Glassmorphism */
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 20,
                  padding: '1.75rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${member.color}44`;
                  e.currentTarget.style.boxShadow = `0 8px 40px rgba(0,0,0,0.35), 0 0 20px ${member.color}18, inset 0 1px 0 rgba(255,255,255,0.08)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)';
                }}
              >
                {/* Subtle top-edge colour line */}
                <div style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
                  borderRadius: '0 0 4px 4px',
                  background: `linear-gradient(90deg, transparent, ${member.color}88, transparent)`,
                }} />

                {/* Avatar */}
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 35%, ${member.color}30, ${member.color}10)`,
                  border: `1.5px solid ${member.color}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', fontWeight: 900,
                  color: member.color,
                  fontFamily: 'var(--font-display, monospace)',
                  letterSpacing: '0.04em',
                  boxShadow: `0 0 16px ${member.color}28`,
                  flexShrink: 0,
                }}>
                  {member.initials}
                </div>

                {/* Name */}
                <p style={{
                  color: 'rgba(255,255,255,0.88)',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textAlign: 'center',
                  margin: 0,
                  lineHeight: 1.35,
                  fontFamily: 'var(--font-heading, sans-serif)',
                  letterSpacing: '0.02em',
                }}>
                  {member.name}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(5,5,16,0.6)',
        backdropFilter: 'blur(20px)',
        padding: '3rem 2.5rem 2rem',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Top row — logo + nav */}
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem',
            marginBottom: '2.5rem',
          }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', boxShadow: '0 0 10px rgba(124,58,237,0.5)',
                }}>⚡</div>
                <span style={{
                  fontFamily: 'var(--font-heading, monospace)', fontWeight: 900,
                  fontSize: '1rem', letterSpacing: '0.08em',
                  background: 'linear-gradient(90deg,#a78bfa,#38bdf8)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>QUIZ LIVE</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', maxWidth: 220, lineHeight: 1.6, margin: 0 }}>
                Real-time multiplayer quizzes built on Django + React + WebSockets.
              </p>
            </div>

            {/* Quick links */}
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', fontWeight: 800,
                  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Platform
                </span>
                <a href="#how-it-works" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color='rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.4)'}>How it works</a>
                <a href="#topics" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color='rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.4)'}>Topics</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', fontWeight: 800,
                  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Account
                </span>
                <Link to="/login" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color='rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.4)'}>Sign In</Link>
                <Link to="/register" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color='rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.4)'}>Register</Link>
                <Link to="/join" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color='rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.4)'}>Join a Game</Link>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
            marginBottom: '1.75rem',
          }} />

          {/* Credits row */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '0.85rem',
            textAlign: 'center',
          }}>
            {/* "Crafted by" label */}
            <p style={{
              color: 'rgba(255,255,255,0.18)', fontSize: '0.7rem',
              fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
              margin: 0,
            }}>
              Crafted with ⚡ by
            </p>

            {/* Team name */}
            <span style={{
              fontFamily: 'var(--font-display, monospace)',
              fontWeight: 900, fontSize: '1.15rem',
              letterSpacing: '0.18em',
              background: 'linear-gradient(90deg, #a78bfa, #38bdf8, #a78bfa)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'gradientShift 4s ease infinite',
            }}>
              ERRORISTS
            </span>

            {/* Names row */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
              gap: '0.4rem 0.75rem', maxWidth: 700,
            }}>
              {[
                { name: 'Charan Kotaru',        color: '#a78bfa' },
                { name: 'Tiru Amballa',          color: '#38bdf8' },
                { name: 'Sairam Chitturi',       color: '#4ade80' },
                { name: 'Jagadeesh Daketi',      color: '#fb923c' },
                { name: 'Bhavyasai Challapalli', color: '#f43f5e' },
                { name: 'Geetha Chikkala',       color: '#fbbf24' },
                { name: 'Rohini Chimata',        color: '#e879f9' },
                { name: 'Kavya Kanamarlapudi',   color: '#34d399' },
              ].map((m, i, arr) => (
                <span key={m.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: '0.8rem', fontWeight: 600,
                    transition: 'color 0.2s',
                    cursor: 'default',
                  }}
                    onMouseEnter={e => e.target.style.color = m.color}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}
                  >
                    {m.name}
                  </span>
                  {/* Dot separator — not after last name */}
                  {i < arr.length - 1 && (
                    <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '0.5rem' }}>●</span>
                  )}
                </span>
              ))}
            </div>

            {/* Bottom line */}
            <p style={{
              color: 'rgba(255,255,255,0.12)', fontSize: '0.72rem',
              marginTop: '0.5rem', letterSpacing: '0.04em',
            }}>
              © {new Date().getFullYear()} QuizLive · Built with Django, React & WebSockets
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
