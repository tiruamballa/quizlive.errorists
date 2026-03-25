import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StarBackground from '../../components/StarBackground';

export default function LoginPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'teacher' ? '/dashboard' : '/join');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-bg" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
      <StarBackground density={80} />

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'440px', padding:'1.5rem' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2.5rem', animation:'fadeIn 0.6s ease' }}>
          <div style={{
            fontSize:'4rem', marginBottom:'0.5rem',
            animation:'float 3s ease-in-out infinite',
            display:'inline-block',
          }}>🎯</div>
          <h1 style={{
            fontFamily:'var(--font-display)', fontSize:'2.5rem', fontWeight:900,
            background:'linear-gradient(135deg, var(--purple-glow), var(--cyan))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundClip:'text', margin:0, letterSpacing:'0.08em',
          }}>QUIZLIVE</h1>
          <p style={{ color:'var(--text-dim)', marginTop:'0.25rem', fontSize:'0.9rem' }}>
            Play. Learn. Compete.
          </p>
        </div>

        {/* Card */}
        <div className="glass card card-glow" style={{
          animation:'fadeInScale 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          padding:'2.5rem',
        }}>
          <h2 style={{
            fontFamily:'var(--font-heading)', fontSize:'1.5rem', fontWeight:700,
            color:'var(--text-bright)', marginBottom:'1.75rem', textAlign:'center',
          }}>
            Welcome Back
          </h2>

          {error && <div className="alert-error" style={{ marginBottom:'1.25rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div>
              <label style={{ display:'block', color:'var(--text-dim)', fontSize:'0.8rem',
                fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>
                Email
              </label>
              <input className="input"
                type="email" placeholder="your@email.com"
                value={form.email}
                onFocus={() => setFocused('email')}
                onBlur={()  => setFocused('')}
                onChange={e => setForm({...form, email: e.target.value})}
                required
                style={focused === 'email' ? { borderColor:'var(--cyan)', boxShadow:'0 0 0 3px rgba(0,212,255,0.15)' } : {}}
              />
            </div>
            <div>
              <label style={{ display:'block', color:'var(--text-dim)', fontSize:'0.8rem',
                fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>
                Password
              </label>
              <input className="input"
                type="password" placeholder="••••••••"
                value={form.password}
                onFocus={() => setFocused('pass')}
                onBlur={()  => setFocused('')}
                onChange={e => setForm({...form, password: e.target.value})}
                required
                style={focused === 'pass' ? { borderColor:'var(--cyan)', boxShadow:'0 0 0 3px rgba(0,212,255,0.15)' } : {}}
              />
            </div>

            <button className="btn btn-primary btn-xl"
              type="submit" disabled={loading}
              style={{ marginTop:'0.5rem', width:'100%', position:'relative', overflow:'hidden' }}>
              {loading ? (
                <><span className="spinner" style={{ width:20, height:20, borderWidth:2 }} /> Signing in...</>
              ) : 'Sign In →'}
            </button>
          </form>

          <div className="divider" />

          <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:'0.6rem' }}>
            <p style={{ color:'var(--text-dim)', fontSize:'0.875rem' }}>
              No account?{' '}
              <Link to="/register" style={{ color:'var(--cyan)', fontWeight:700 }}>
                Create one →
              </Link>
            </p>
            <p style={{ color:'var(--text-dim)', fontSize:'0.875rem' }}>
              Student?{' '}
              <Link to="/join" style={{ color:'var(--green)', fontWeight:700 }}>
                Join a game →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
