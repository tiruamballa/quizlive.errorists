import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  createQuiz, updateQuiz, getQuiz,
  createQuestion, deleteQuestion,
  previewCSV, importCSV,
} from '../../api/quizApi';
import StarBackground from '../../components/StarBackground';

const BLANK_OPT = (order) => ({ text: '', is_correct: false, order });
const BLANK_Q   = () => ({
  text: '', question_type: 'mcq', difficulty: 'medium',
  time_limit_secs: 30, base_points: 100,
  options: [BLANK_OPT(0), BLANK_OPT(1), BLANK_OPT(2), BLANK_OPT(3)],
});

const DIFF_STYLES = {
  easy:   { bg: 'rgba(0,255,135,0.1)',  color: 'var(--green)',  border: 'rgba(0,255,135,0.3)'  },
  medium: { bg: 'rgba(255,107,53,0.1)', color: 'var(--orange)', border: 'rgba(255,107,53,0.3)' },
  hard:   { bg: 'rgba(255,0,110,0.1)',  color: 'var(--pink)',   border: 'rgba(255,0,110,0.3)'  },
};

const OPTION_COLORS = ['var(--purple-glow)', 'var(--cyan)', 'var(--green)', 'var(--orange)'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ─── CSV template (generated client-side) ────────────────────────────────────
const CSV_TEMPLATE = [
  'question,option_a,option_b,option_c,option_d,correct,difficulty,time_limit,points',
  'What is the capital of France?,London,Paris,Berlin,Madrid,B,easy,20,100',
  'Water boils at 100°C at sea level.,True,False,,,A,medium,30,150',
  'Which planet is closest to the sun?,Venus,Earth,Mercury,Mars,C,hard,30,200',
  'The Great Wall of China is visible from space.,True,False,,,B,medium,25,150',
].join('\n');

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'quizlive_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function DiffBadge({ diff }) {
  const ds = DIFF_STYLES[diff] || DIFF_STYLES.medium;
  return (
    <span style={{
      padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)',
      background: ds.bg, color: ds.color, border: `1px solid ${ds.border}`,
      fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize',
    }}>
      {diff}
    </span>
  );
}

// ─── Preview table ────────────────────────────────────────────────────────────
function PreviewTable({ questions }) {
  if (!questions.length) return null;
  return (
    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ background: 'rgba(124,58,237,0.12)', borderBottom: '1px solid rgba(124,58,237,0.25)' }}>
            {['#', 'Question', 'Options', '✓', 'Diff', '⏱', 'Pts'].map(h => (
              <th key={h} style={{
                padding: '0.6rem 0.75rem', textAlign: 'left',
                color: 'var(--text-dim)', fontWeight: 700,
                fontSize: '0.7rem', letterSpacing: '0.08em',
                textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {questions.map((q, i) => (
            <tr key={i} style={{
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
            }}>
              <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.75rem' }}>
                {i + 1}
              </td>
              <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-bright)', maxWidth: 260, fontWeight: 500 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}
                  title={q.text}>
                  {q.text}
                </div>
              </td>
              <td style={{ padding: '0.55rem 0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  {q.options.map((o, oi) => (
                    <span key={oi} style={{
                      color: o.is_correct ? 'var(--green)' : 'var(--text-dim)',
                      fontWeight: o.is_correct ? 700 : 400,
                      fontSize: '0.78rem', display: 'flex', gap: '0.3rem', alignItems: 'center',
                    }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 3, display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        fontSize: '0.6rem', fontWeight: 900,
                        background: o.is_correct ? 'rgba(0,255,135,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${o.is_correct ? 'rgba(0,255,135,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        color: o.is_correct ? 'var(--green)' : 'var(--text-dim)',
                      }}>
                        {OPTION_LABELS[oi]}
                      </span>
                      <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={o.text}>
                        {o.text}
                      </span>
                    </span>
                  ))}
                </div>
              </td>
              <td style={{ padding: '0.55rem 0.75rem', color: 'var(--green)', fontWeight: 900, fontSize: '0.8rem' }}>
                {q.correct_label}
              </td>
              <td style={{ padding: '0.55rem 0.75rem' }}>
                <DiffBadge diff={q.difficulty} />
              </td>
              <td style={{ padding: '0.55rem 0.75rem', color: 'var(--cyan)', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                {q.time_limit_secs}s
              </td>
              <td style={{ padding: '0.55rem 0.75rem', color: 'var(--gold)', fontWeight: 700, fontSize: '0.78rem' }}>
                {q.base_points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function QuizBuilderPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = Boolean(id);

  // existing state
  const [quiz,      setQuiz]    = useState({ title: '', description: '', is_public: false });
  const [questions, setQs]      = useState([]);
  const [newQ,      setNewQ]    = useState(BLANK_Q());
  const [saving,    setSaving]  = useState(false);
  const [adding,    setAdding]  = useState(false);
  const [quizId,    setQuizId]  = useState(id || null);
  const [saved,     setSaved]   = useState(false);
  const [tab,       setTab]     = useState('details');

  // CSV import state
  const [csvPreview,     setCsvPreview]     = useState(null);
  const [csvParsing,     setCsvParsing]     = useState(false);
  const [csvImporting,   setCsvImporting]   = useState(false);
  const [csvImportTitle, setCsvImportTitle] = useState('');
  const [csvDragOver,    setCsvDragOver]    = useState(false);
  const [csvFileError,   setCsvFileError]   = useState('');
  const [csvFileName,    setCsvFileName]    = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isEdit) {
      getQuiz(id).then(r => {
        const d = r.data;
        setQuiz({ title: d.title, description: d.description || '', is_public: d.is_public });
        setQs(d.questions || []);
        setCsvImportTitle(d.title || '');
        if (d.questions?.length > 0) setTab('questions');
      });
    }
  }, [id, isEdit]);

  // Keep import title in sync with quiz title when user types in details tab
  useEffect(() => {
    if (!csvImportTitle && quiz.title) setCsvImportTitle(quiz.title);
  }, [quiz.title]);

  // ── Quiz save ────────────────────────────────────────────────────────────────
  const saveQuiz = async () => {
    if (!quiz.title.trim()) { alert('Quiz title is required.'); return; }
    setSaving(true); setSaved(false);
    const effectiveId = quizId || id;   // guard: prefer state, fall back to URL param
    try {
      if (effectiveId) {
        await updateQuiz(effectiveId, quiz);
        if (!quizId) setQuizId(effectiveId);  // sync state if it was out of date
      } else {
        const { data } = await createQuiz(quiz);
        setQuizId(data.id);
        navigate(`/quiz/${data.id}/edit`, { replace: true });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  // ── Add question ─────────────────────────────────────────────────────────────
  const addQuestion = async () => {
    if (!quizId) { alert('Save the quiz first.'); return; }
    if (!newQ.text.trim()) { alert('Question text is required.'); return; }
    const filledOpts = newQ.options.filter(o => o.text.trim());
    if (filledOpts.length < 2) { alert('Add at least 2 answer options.'); return; }
    if (!filledOpts.some(o => o.is_correct)) { alert('Mark at least one correct answer.'); return; }
    setAdding(true);
    try {
      const opts     = filledOpts.map((o, i) => ({ ...o, order: i }));
      const { data } = await createQuestion(quizId, { ...newQ, options: opts });
      setQs(prev => [...prev, data]);
      setNewQ(BLANK_Q());
    } finally { setAdding(false); }
  };

  const removeQ = async (qId) => {
    if (!confirm('Remove this question?')) return;
    await deleteQuestion(quizId, qId);
    setQs(prev => prev.filter(q => q.id !== qId));
  };

  const setOptCorrect = (idx) => {
    setNewQ(prev => ({
      ...prev,
      options: prev.options.map((o, i) => ({ ...o, is_correct: i === idx })),
    }));
  };

  // ── CSV helpers ──────────────────────────────────────────────────────────────
  const handleCsvFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvFileError('Please upload a .csv file.');
      return;
    }
    setCsvFileError('');
    setCsvFileName(file.name);
    setCsvPreview(null);
    setCsvParsing(true);
    try {
      const { data } = await previewCSV(file);
      setCsvPreview(data);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to parse CSV — check the file format.';
      setCsvFileError(msg);
      setCsvFileName('');
    } finally {
      setCsvParsing(false);
    }
  }, []);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleCsvFile(file);
    e.target.value = ''; // allow re-uploading the same file
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setCsvDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleCsvFile(file);
  };

  const handleImport = async () => {
    if (!csvPreview?.questions?.length) return;
    if (!quizId && !csvImportTitle.trim()) {
      setCsvFileError('Please enter a title for your quiz.');
      return;
    }
    setCsvImporting(true);
    setCsvFileError('');
    try {
      const { data } = await importCSV({
        title:       csvImportTitle.trim(),
        description: quiz.description || '',
        is_public:   quiz.is_public   || false,
        ...(quizId ? { quiz_id: quizId } : {}),
        questions:   csvPreview.questions,
      });
      // Navigate to the (new) quiz edit page — useEffect will set tab to 'questions'
      navigate(`/quiz/${data.quiz_id}/edit`, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Import failed — please try again.';
      setCsvFileError(msg);
    } finally {
      setCsvImporting(false);
    }
  };

  const resetCsv = () => {
    setCsvPreview(null);
    setCsvFileName('');
    setCsvFileError('');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-bg" style={{ minHeight: '100vh' }}>
      <StarBackground density={30} />

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(5,5,16,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 2rem', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/dashboard">
            <button className="btn btn-ghost btn-sm">← Dashboard</button>
          </Link>
          <span style={{ color: 'var(--border-subtle)' }}>|</span>
          <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-bright)', fontSize: '1.1rem' }}>
            {isEdit ? 'Edit Quiz' : 'New Quiz'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {saved && (
            <span className="badge badge-green" style={{ animation: 'fadeIn 0.3s ease' }}>✓ Saved!</span>
          )}
          <button className="btn btn-primary" onClick={saveQuiz} disabled={saving}>
            {saving
              ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</>
              : quizId ? '💾 Save Changes' : '💾 Save Quiz'}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem', position: 'relative', zIndex: 1 }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[
            { id: 'details',   label: '📋 Details' },
            { id: 'questions', label: `❓ Questions${questions.length > 0 ? ` (${questions.length})` : ''}` },
            { id: 'add',       label: '➕ Add Question', disabled: !quizId },
            { id: 'import',    label: '📥 Import CSV' },
          ].map(t => (
            <button key={t.id} onClick={() => !t.disabled && setTab(t.id)}
              className="btn"
              style={{
                padding: '0.6rem 1.25rem', fontSize: '0.9rem',
                background: tab === t.id ? 'var(--purple)' : 'var(--bg-card)',
                color:      tab === t.id ? '#fff' : t.disabled ? 'var(--text-dim)' : 'var(--text-mid)',
                border:     `1px solid ${tab === t.id ? 'var(--purple)' : 'var(--border-subtle)'}`,
                boxShadow:  tab === t.id ? '0 0 20px rgba(124,58,237,0.4)' : 'none',
                opacity:    t.disabled ? 0.5 : 1,
                cursor:     t.disabled ? 'not-allowed' : 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── DETAILS ──────────────────────────────────────────────────────────── */}
        {tab === 'details' && (
          <div className="card animate-fade-in" style={{ padding: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-bright)', marginBottom: '1.5rem' }}>
              Quiz Details
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.75rem',
                  fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Quiz Title *
                </label>
                <input className="input" placeholder="Give your quiz an awesome name..."
                  value={quiz.title} onChange={e => setQuiz({ ...quiz, title: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.75rem',
                  fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Description
                </label>
                <textarea className="input" placeholder="What's this quiz about?"
                  rows={3} style={{ resize: 'vertical' }}
                  value={quiz.description} onChange={e => setQuiz({ ...quiz, description: e.target.value })} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <div style={{ position: 'relative' }}>
                  <input type="checkbox" checked={quiz.is_public} style={{ display: 'none' }}
                    onChange={e => setQuiz({ ...quiz, is_public: e.target.checked })} />
                  <div onClick={() => setQuiz({ ...quiz, is_public: !quiz.is_public })} style={{
                    width: 48, height: 26, borderRadius: 13, cursor: 'pointer',
                    background: quiz.is_public ? 'var(--purple)' : 'var(--bg-card)',
                    border: `2px solid ${quiz.is_public ? 'var(--purple)' : 'var(--border-subtle)'}`,
                    transition: 'all 0.3s', position: 'relative',
                    boxShadow: quiz.is_public ? '0 0 12px rgba(124,58,237,0.5)' : 'none',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: 'white',
                      position: 'absolute', top: 2, left: quiz.is_public ? 24 : 2,
                      transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }} />
                  </div>
                </div>
                <span style={{ color: 'var(--text-mid)' }}>Make this quiz public</span>
              </label>
            </div>
            <div style={{ marginTop: '1.75rem', display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={saveQuiz} disabled={saving}>
                {saving ? 'Saving...' : quizId ? 'Save Changes' : 'Save & Continue →'}
              </button>
              {quizId && (
                <button className="btn btn-cyan" onClick={() => setTab('add')}>
                  Add Questions →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── QUESTIONS ────────────────────────────────────────────────────────── */}
        {tab === 'questions' && (
          <div className="animate-fade-in">
            {questions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❓</div>
                <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>No questions yet.</p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => setTab('add')}>Add First Question →</button>
                  <button className="btn btn-cyan" onClick={() => setTab('import')}>📥 Import from CSV</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {questions.map((q, i) => {
                  const ds = DIFF_STYLES[q.difficulty] || DIFF_STYLES.medium;
                  return (
                    <div key={q.id} className="card" style={{
                      padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start',
                      animation: 'slideInLeft 0.3s ease', animationDelay: `${i * 0.04}s`,
                    }}>
                      <div style={{
                        minWidth: 40, height: 40, borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(124,58,237,0.2)', border: '2px solid rgba(124,58,237,0.4)',
                        fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--purple-glow)', fontSize: '1rem',
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: 'var(--text-bright)', marginBottom: '0.5rem', fontWeight: 600 }}>
                          {q.text}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span className="badge" style={{
                            background: ds.bg, color: ds.color, border: `1px solid ${ds.border}`,
                          }}>{q.difficulty}</span>
                          <span className="badge badge-purple">{q.question_type === 'mcq' ? 'MCQ' : 'T/F'}</span>
                          <span className="badge badge-cyan">⏱ {q.time_limit_secs}s</span>
                          <span className="badge badge-gold">⭐ {q.base_points} pts</span>
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
                            {q.options?.filter(o => o.is_correct).map(o => `✓ ${o.text}`).join(', ')}
                          </span>
                        </div>
                      </div>
                      <button className="btn btn-danger btn-icon" onClick={() => removeQ(q.id)} title="Remove">✕</button>
                    </div>
                  );
                })}
                <button className="btn btn-primary" onClick={() => setTab('add')} style={{ marginTop: '0.5rem' }}>
                  ➕ Add Another Question
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ADD QUESTION ─────────────────────────────────────────────────────── */}
        {tab === 'add' && (
          <div className="card animate-fade-in" style={{ padding: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-bright)', marginBottom: '1.5rem' }}>
              Add Question {questions.length + 1}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.75rem',
                  fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Question *
                </label>
                <textarea className="input" rows={3} placeholder="Type your question here..."
                  style={{ resize: 'vertical' }}
                  value={newQ.text} onChange={e => setNewQ({ ...newQ, text: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.7rem',
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Type
                  </label>
                  <select className="input" value={newQ.question_type}
                    onChange={e => setNewQ({
                      ...newQ, question_type: e.target.value,
                      options: e.target.value === 'truefalse'
                        ? [{ text: 'True', is_correct: true, order: 0 }, { text: 'False', is_correct: false, order: 1 }]
                        : BLANK_Q().options,
                    })}
                    style={{ background: 'var(--bg-deep)', cursor: 'pointer' }}>
                    <option value="mcq">Multiple Choice</option>
                    <option value="truefalse">True / False</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.7rem',
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Difficulty
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {['easy', 'medium', 'hard'].map(d => {
                      const ds = DIFF_STYLES[d];
                      return (
                        <button key={d} type="button" onClick={() => setNewQ({ ...newQ, difficulty: d })}
                          style={{
                            flex: 1, padding: '0.5rem 0', borderRadius: 'var(--radius-sm)', border: '1px solid',
                            borderColor: newQ.difficulty === d ? ds.border : 'var(--border-subtle)',
                            background:  newQ.difficulty === d ? ds.bg : 'transparent',
                            color:       newQ.difficulty === d ? ds.color : 'var(--text-dim)',
                            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                            transition: 'all 0.2s', textTransform: 'capitalize',
                          }}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.7rem',
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Time (sec)
                  </label>
                  <input className="input" type="number" min={10} max={120}
                    value={newQ.time_limit_secs}
                    onChange={e => setNewQ({ ...newQ, time_limit_secs: parseInt(e.target.value) || 30 })} />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.7rem',
                    fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Base Pts
                  </label>
                  <input className="input" type="number" min={10} max={1000} step={10}
                    value={newQ.base_points}
                    onChange={e => setNewQ({ ...newQ, base_points: parseInt(e.target.value) || 100 })} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.75rem',
                  fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Answer Options — click the label to mark correct answer
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {newQ.options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <button type="button" onClick={() => setOptCorrect(i)}
                        style={{
                          minWidth: 36, height: 36, borderRadius: '50%',
                          border: `2px solid ${opt.is_correct ? OPTION_COLORS[i] : 'var(--border-subtle)'}`,
                          background: opt.is_correct ? `${OPTION_COLORS[i]}33` : 'transparent',
                          color:      opt.is_correct ? OPTION_COLORS[i] : 'var(--text-dim)',
                          cursor: 'pointer', fontWeight: 900, fontSize: '0.9rem',
                          boxShadow:  opt.is_correct ? `0 0 12px ${OPTION_COLORS[i]}80` : 'none',
                          transition: 'all 0.2s',
                        }}>
                        {opt.is_correct ? '✓' : OPTION_LABELS[i]}
                      </button>
                      <input className="input" placeholder={`Option ${OPTION_LABELS[i]}`}
                        value={opt.text}
                        onChange={e => setNewQ(prev => ({
                          ...prev,
                          options: prev.options.map((o, j) => j === i ? { ...o, text: e.target.value } : o),
                        }))}
                        style={{
                          borderColor: opt.is_correct ? OPTION_COLORS[i] : 'var(--border-subtle)',
                          boxShadow:   opt.is_correct ? `0 0 12px ${OPTION_COLORS[i]}40` : 'none',
                        }} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button className="btn btn-primary" onClick={addQuestion} disabled={adding}>
                  {adding
                    ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Adding...</>
                    : '➕ Add Question'}
                </button>
                {questions.length > 0 && (
                  <button className="btn btn-cyan" onClick={() => setTab('questions')}>
                    View All ({questions.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── IMPORT CSV ───────────────────────────────────────────────────────── */}
        {tab === 'import' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Header */}
            <div className="card" style={{
              padding: '1.75rem 2rem',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(124,58,237,0.06))',
              border: '1px solid rgba(0,212,255,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-bright)', margin: '0 0 0.4rem' }}>
                    📥 Import from CSV
                  </h2>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', margin: 0, maxWidth: 460 }}>
                    Upload a CSV file to create a quiz instantly. Download the template,
                    fill it in Excel or Google Sheets, then upload it here.
                  </p>
                </div>
                <button onClick={downloadTemplate} className="btn" style={{
                  background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.35)',
                  color: 'var(--cyan)', fontWeight: 700, fontSize: '0.85rem',
                  padding: '0.6rem 1.25rem', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  ⬇ Download Template
                </button>
              </div>

              {/* Column reference */}
              <div style={{
                marginTop: '1.25rem', padding: '0.85rem 1rem',
                background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.72rem', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                  CSV Columns
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {[
                    { name: 'question',   req: true,  note: 'Question text (max 500 chars)' },
                    { name: 'option_a',   req: true,  note: 'Option A text' },
                    { name: 'option_b',   req: true,  note: 'Option B text' },
                    { name: 'option_c',   req: false, note: 'Option C (optional)' },
                    { name: 'option_d',   req: false, note: 'Option D (optional)' },
                    { name: 'correct',    req: true,  note: 'A, B, C, or D' },
                    { name: 'difficulty', req: false, note: 'easy / medium / hard  (default: medium)' },
                    { name: 'time_limit', req: false, note: 'Seconds 10–120  (default: 30)' },
                    { name: 'points',     req: false, note: 'Base points 10–1000  (default: 100)' },
                  ].map(col => (
                    <span key={col.name} title={col.note} style={{
                      padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-pill)',
                      background: col.req ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${col.req ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      color: col.req ? 'var(--purple-glow)' : 'var(--text-dim)',
                      fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace', cursor: 'default',
                    }}>
                      {col.name}{col.req ? ' *' : ''}
                    </span>
                  ))}
                </div>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '0.5rem', opacity: 0.7 }}>
                  * Required. True/False type is auto-detected when options are exactly "True" and "False".
                </p>
              </div>
            </div>

            {/* Dropzone — hidden once preview is loaded */}
            {!csvPreview && (
              <div
                onDragOver={e => { e.preventDefault(); setCsvDragOver(true); }}
                onDragLeave={() => setCsvDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !csvParsing && fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${
                    csvDragOver  ? 'var(--cyan)'
                    : csvFileError ? 'var(--pink)'
                    : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '3.5rem 2rem',
                  textAlign: 'center',
                  cursor: csvParsing ? 'default' : 'pointer',
                  background: csvDragOver
                    ? 'rgba(0,212,255,0.06)'
                    : csvFileError
                    ? 'rgba(255,0,110,0.04)'
                    : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                  transform: csvDragOver ? 'scale(1.01)' : 'scale(1)',
                  boxShadow: csvDragOver ? '0 0 30px rgba(0,212,255,0.15)' : 'none',
                }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handleFileInput}
                />
                {csvParsing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                    <p style={{ color: 'var(--text-dim)', margin: 0 }}>Parsing CSV…</p>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem', lineHeight: 1 }}>
                      {csvFileError ? '⚠️' : '📄'}
                    </div>
                    {csvFileError ? (
                      <p style={{ color: 'var(--pink)', fontWeight: 600, margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
                        {csvFileError}
                      </p>
                    ) : (
                      <p style={{ color: 'var(--text-bright)', fontWeight: 600, margin: '0 0 0.4rem', fontSize: '1rem' }}>
                        Drop your CSV here, or click to browse
                      </p>
                    )}
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', margin: 0 }}>
                      .csv files only · max 5 MB · up to 200 questions
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Preview results */}
            {csvPreview && (
              <>
                {/* Summary bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                  padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)',
                  background: 'rgba(13,13,46,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span>📋</span>
                  <span style={{ color: 'var(--text-mid)', fontSize: '0.85rem', fontWeight: 600 }}>
                    {csvFileName}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {csvPreview.valid_count > 0 && (
                      <span style={{
                        padding: '0.25rem 0.8rem', borderRadius: 'var(--radius-pill)',
                        background: 'rgba(0,255,135,0.12)', border: '1px solid rgba(0,255,135,0.35)',
                        color: 'var(--green)', fontWeight: 700, fontSize: '0.8rem',
                      }}>
                        ✓ {csvPreview.valid_count} valid
                      </span>
                    )}
                    {csvPreview.error_count > 0 && (
                      <span style={{
                        padding: '0.25rem 0.8rem', borderRadius: 'var(--radius-pill)',
                        background: 'rgba(255,0,110,0.12)', border: '1px solid rgba(255,0,110,0.35)',
                        color: 'var(--pink)', fontWeight: 700, fontSize: '0.8rem',
                      }}>
                        ✗ {csvPreview.error_count} error{csvPreview.error_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    <button onClick={resetCsv} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}>
                      ✕ Change file
                    </button>
                  </div>
                </div>

                {/* Row errors */}
                {csvPreview.parse_errors?.length > 0 && (
                  <div className="card" style={{
                    padding: '1.25rem 1.5rem',
                    border: '1px solid rgba(255,0,110,0.25)',
                    background: 'rgba(255,0,110,0.04)',
                  }}>
                    <p style={{ color: 'var(--pink)', fontWeight: 700, fontSize: '0.85rem',
                      marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      ⚠️ Rows skipped — fix in your CSV and re-upload to include them
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {csvPreview.parse_errors.map((err, i) => (
                        <div key={i} style={{
                          padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255,0,110,0.06)', border: '1px solid rgba(255,0,110,0.15)',
                        }}>
                          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                            <span style={{
                              background: 'rgba(255,0,110,0.2)', color: 'var(--pink)',
                              borderRadius: 'var(--radius-sm)', padding: '0.1rem 0.5rem',
                              fontSize: '0.7rem', fontWeight: 800, flexShrink: 0, fontFamily: 'monospace',
                            }}>
                              Row {err.row}
                            </span>
                            {err.question_preview && (
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontStyle: 'italic', lineHeight: 1.4 }}>
                                "{err.question_preview}"
                              </span>
                            )}
                          </div>
                          <ul style={{ margin: '0.2rem 0 0 0.25rem', padding: 0, listStyle: 'none' }}>
                            {err.messages.map((m, mi) => (
                              <li key={mi} style={{ color: 'var(--pink)', fontSize: '0.78rem',
                                display: 'flex', gap: '0.35rem', lineHeight: 1.5 }}>
                                <span style={{ opacity: 0.55 }}>→</span> {m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid preview */}
                {csvPreview.questions?.length > 0 && (
                  <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.85rem' }}>
                      Preview — {csvPreview.valid_count} question{csvPreview.valid_count !== 1 ? 's' : ''} ready to import
                    </p>
                    <PreviewTable questions={csvPreview.questions} />
                  </div>
                )}

                {/* Zero valid questions */}
                {csvPreview.valid_count === 0 && (
                  <div className="card" style={{ textAlign: 'center', padding: '2.5rem',
                    border: '1px solid rgba(255,0,110,0.2)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>😕</div>
                    <p style={{ color: 'var(--pink)', fontWeight: 600, marginBottom: '0.5rem' }}>
                      No valid questions found
                    </p>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                      Fix the errors above and re-upload your CSV.
                    </p>
                    <button onClick={resetCsv} className="btn btn-primary">Try Again</button>
                  </div>
                )}

                {/* Import action */}
                {csvPreview.valid_count > 0 && (
                  <div className="card" style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(0,255,135,0.04), rgba(124,58,237,0.04))',
                    border: '1px solid rgba(0,255,135,0.2)',
                  }}>
                    {/* Title input — only when creating a new quiz */}
                    {!quizId && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.72rem',
                          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                          Quiz Title *
                        </label>
                        <input
                          className="input"
                          placeholder="Enter a title for your new quiz…"
                          value={csvImportTitle}
                          onChange={e => { setCsvImportTitle(e.target.value); setCsvFileError(''); }}
                          style={{ borderColor: csvFileError ? 'var(--pink)' : undefined }}
                        />
                      </div>
                    )}

                    {quizId && (
                      <p style={{ color: 'var(--text-mid)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        {csvPreview.valid_count} question{csvPreview.valid_count !== 1 ? 's' : ''} will be
                        appended to{' '}
                        <strong style={{ color: 'var(--text-bright)' }}>"{quiz.title}"</strong>.
                      </p>
                    )}

                    {csvFileError && (
                      <p style={{ color: 'var(--pink)', fontSize: '0.82rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                        ⚠️ {csvFileError}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-green"
                        onClick={handleImport}
                        disabled={csvImporting}
                        style={{ fontSize: '0.95rem', padding: '0.7rem 1.75rem' }}>
                        {csvImporting
                          ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Importing…</>
                          : `✓ Import ${csvPreview.valid_count} Question${csvPreview.valid_count !== 1 ? 's' : ''}`}
                      </button>
                      {csvPreview.error_count > 0 && (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                          {csvPreview.error_count} row{csvPreview.error_count !== 1 ? 's' : ''} with errors will be skipped
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
