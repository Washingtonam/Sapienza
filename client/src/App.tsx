import { useEffect, useState } from 'react';
import { currentUser, login, publicContent, type SessionUser } from './api';

type Notice = { title: string; body: string; category: string };

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [heroImage, setHeroImage] = useState<string>();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('sapienza.token')) currentUser().then(({ user: nextUser }) => setUser(nextUser)).catch(() => localStorage.removeItem('sapienza.token'));
    publicContent().then(([noticeData, mediaData]) => {
      setNotices(noticeData.notices);
      setHeroImage(mediaData.media.find((asset) => asset.key === 'homepage.hero')?.url);
    }).catch(() => undefined);
  }, []);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const result = await login(email, password);
      localStorage.setItem('sapienza.token', result.token); setUser(result.user); setShowLogin(false);
    } catch (loginError) { setError(loginError instanceof Error ? loginError.message : 'Unable to sign in'); }
    finally { setLoading(false); }
  }

  return <main className="page-shell">
    <nav><strong>SAPIENZA</strong><span>Catholic School</span><button onClick={() => user ? (localStorage.removeItem('sapienza.token'), setUser(null)) : setShowLogin(true)}>{user ? 'Sign out' : 'Sign in'}</button></nav>
    <section className="hero" style={heroImage ? { backgroundImage: `linear-gradient(90deg, rgba(244,241,233,.96) 0%, rgba(244,241,233,.75) 55%, rgba(244,241,233,.2)), url(${heroImage})` } : undefined}>
      <p className="eyebrow">Forming minds. Shaping character.</p><h1>Learn with purpose.<br /><em>Live with faith.</em></h1>
      <p className="intro">A connected school community for students, families, teachers, and alumni.</p>
      <div className="actions"><button className="primary" onClick={() => document.getElementById('notices')?.scrollIntoView({ behavior: 'smooth' })}>Explore Sapienza</button><button className="text-button">Admissions <span>↗</span></button></div>
    </section>
    {user && <section className="welcome"><small>WELCOME BACK</small><h2>{user.firstName}, your school day starts here.</h2><div className="portal-links"><a>Academic records <span>→</span></a><a>Assignments and CBT <span>→</span></a><a>Fees and notifications <span>→</span></a></div></section>}
    <section id="notices" className="portal-strip"><div><small>NOTICE BOARD</small><h2>What is happening at Sapienza.</h2></div><div className="notice-list">{notices.length ? notices.slice(0, 3).map((notice) => <article key={notice.title}><small>{notice.category}</small><h3>{notice.title}</h3><p>{notice.body}</p></article>) : <p className="muted">New school announcements will appear here.</p>}</div></section>
    {showLogin && <div className="modal-backdrop" onClick={() => setShowLogin(false)}><form className="login-panel" onSubmit={handleLogin} onClick={(event) => event.stopPropagation()}><button type="button" className="close" onClick={() => setShowLogin(false)}>×</button><small>SCHOOL PORTAL</small><h2>Sign in to continue.</h2><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="form-error">{error}</p>}<button className="primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button></form></div>}
  </main>;
}
