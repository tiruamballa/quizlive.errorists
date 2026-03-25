/**
 * src/pages/auth/RegisterPage.jsx
 *
 * Fix 1: InputField moved OUTSIDE the component so React never
 *         unmounts/remounts it on re-render → no more focus-loss-per-keystroke.
 *
 * Fix 2: Error messages from Django (password too common, etc.) are now
 *         extracted from nested response structures and shown clearly.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StarBackground from '../../components/StarBackground';

// ── OUTSIDE the component — React treats this as a stable component type ─────
function InputField({ name, type, label, placeholder, value, onChange }) {
  return (
    <div>
      <label style={{
        display: 'block', color: 'var(--text-dim)', fontSize: '0.75rem',
        fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: '0.4rem',
      }}>
        {label}
      </label>
      <input
        className="input"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
      />
    </div>
  );
}

function extractError(data) {
  if (!data) return 'Registration failed.';
  if (typeof data === 'string') return data;
  // Django returns { field: ["error msg", ...], ... } or { detail: "..." }
  if (data.detail) return data.detail;
  const msgs = Object.entries(data)
    .flatMap(([field, errs]) => {
      const list = Array.isArray(errs) ? errs : [errs];
      return list.map(e => field === 'non_field_errors' ? e : `${field}: ${e}`);
    });
  return msgs[0] || 'Registration failed.';
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate      = useNavigate();
  const [form,    setForm]    = useState({
    email: '', username: '', role: 'student', password: '', password2: '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password2) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await register(form);
      navigate(user.role === 'teacher' ? '/dashboard' : '/join');
    } catch (err) {
      setError(extractError(err.response?.data));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem', minHeight: '100vh',
    }}>
      <StarBackground density={60} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', animation: 'fadeIn 0.6s ease' }}>
          <div style={{ fontSize: '3.5rem', animation: 'float 3s ease-in-out infinite', display: 'inline-block' }}>
            🚀
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900,
            background: 'linear-gradient(135deg, var(--purple-glow), var(--cyan))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', margin: '0.25rem 0 0', letterSpacing: '0.08em',
          }}>QUIZLIVE</h1>
        </div>

        <div className="glass card card-glow" style={{
          animation: 'fadeInScale 0.5s cubic-bezier(0.34,1.56,0.64,1)', padding: '2rem',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700,
            color: 'var(--text-bright)', marginBottom: '1.5rem', textAlign: 'center',
          }}>Create Account</h2>

          {error && (
            <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <InputField
              name="email" type="email" label="Email"
              placeholder="your@email.com"
              value={form.email} onChange={handleChange('email')}
            />
            <InputField
              name="username" type="text" label="Username"
              placeholder="Choose a username"
              value={form.username} onChange={handleChange('username')}
            />
            <InputField
              name="password" type="password" label="Password"
              placeholder="Min 8 characters"
              value={form.password} onChange={handleChange('password')}
            />
            <InputField
              name="password2" type="password" label="Confirm Password"
              placeholder="Repeat password"
              value={form.password2} onChange={handleChange('password2')}
            />

            {/* Role selector */}
            <div>
              <label style={{
                display: 'block', color: 'var(--text-dim)', fontSize: '0.75rem',
                fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                marginBottom: '0.6rem',
              }}>
                I am a...
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {['student', 'teacher'].map(r => (
                  <button key={r} type="button"
                    onClick={() => setForm(prev => ({ ...prev, role: r }))}
                    style={{
                      padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '2px solid',
                      borderColor: form.role === r ? 'var(--purple)' : 'var(--border-subtle)',
                      background:  form.role === r ? 'rgba(124,58,237,0.2)' : 'transparent',
                      color: form.role === r ? 'var(--purple-glow)' : 'var(--text-dim)',
                      cursor: 'pointer', fontFamily: 'var(--font-heading)',
                      fontSize: '1.05rem', fontWeight: 700, transition: 'all 0.2s',
                      boxShadow: form.role === r ? '0 0 20px rgba(124,58,237,0.3)' : 'none',
                    }}>
                    {r === 'student' ? '🎓 Student' : '👨‍🏫 Teacher'}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary btn-xl" type="submit" disabled={loading}
              style={{ marginTop: '0.5rem', width: '100%' }}>
              {loading
                ? <><span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Creating...</>
                : 'Create Account →'}
            </button>
          </form>

          <div className="divider" />
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--cyan)', fontWeight: 700 }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
