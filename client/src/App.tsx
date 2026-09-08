import { useEffect, useState } from 'react';
import { currentUser, login, publicContent, register, type SessionUser } from './api';

type Notice = { title: string; body: string; category: string };

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [heroImage, setHeroImage] = useState<string>();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
      localStorage.setItem('sapienza.token', result.token);
      const session = await currentUser();
      setUser(session.user); setShowLogin(false);
    } catch (loginError) { setError(loginError instanceof Error ? loginError.message : 'Unable to sign in'); }
    finally { setLoading(false); }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const result = await register(firstName, lastName, email, password);
      localStorage.setItem('sapienza.token', result.token);
      const session = await currentUser();
      setUser(session.user); setShowRegister(false);
    } catch (registrationError) { setError(registrationError instanceof Error ? registrationError.message : 'Unable to create account'); }
    finally { setLoading(false); }
  }

  function openRegistration() {
    setError(''); setShowLogin(false); setShowRegister(true);
  }

  function openLogin() {
    setError(''); setShowRegister(false); setShowLogin(true);
  }

  const roleNames = user?.roles?.map((role) => role.name) ?? [];
  const canAccessStaff = roleNames.some((role) => ['teacher', 'admin', 'super_admin'].includes(role));
  const canAccessAdmin = roleNames.some((role) => ['admin', 'super_admin'].includes(role));

  return <main className="page-shell">
    <nav><strong>SAPIENZA</strong><span>Catholic School</span><div className="nav-actions">{!user && <button onClick={openRegistration}>Create account</button>}<button onClick={() => user ? (localStorage.removeItem('sapienza.token'), setUser(null)) : openLogin()}>{user ? 'Sign out' : 'Sign in'}</button></div></nav>
    <section className="hero" style={heroImage ? { backgroundImage: `linear-gradient(90deg, rgba(244,241,233,.96) 0%, rgba(244,241,233,.75) 55%, rgba(244,241,233,.2)), url(${heroImage})` } : undefined}>
      <p className="eyebrow">Forming minds. Shaping character.</p><h1>Learn with purpose.<br /><em>Live with faith.</em></h1>
      <p className="intro">A connected school community for students, families, teachers, and alumni.</p>
      <div className="actions"><button className="primary" onClick={() => document.getElementById('notices')?.scrollIntoView({ behavior: 'smooth' })}>Explore Sapienza</button><button className="text-button" onClick={() => document.getElementById('admissions')?.scrollIntoView({ behavior: 'smooth' })}>Admissions <span>↗</span></button></div>
    </section>
    <section className="portal-strip portals"><div><small>PORTALS</small><h2>Choose the space that fits your role.</h2></div><div className="portal-links"><button onClick={() => user ? document.getElementById('portal-status')?.scrollIntoView({ behavior: 'smooth' }) : openLogin()}>Student Portal <span>→</span></button><button onClick={() => canAccessStaff ? document.getElementById('portal-status')?.scrollIntoView({ behavior: 'smooth' }) : openLogin()}>Staff Portal <span>→</span></button><button onClick={() => canAccessAdmin ? document.getElementById('portal-status')?.scrollIntoView({ behavior: 'smooth' }) : openLogin()}>Admin Portal <span>→</span></button></div></section>
    {user && <section id="portal-status" className="welcome"><small>WELCOME BACK</small><h2>{user.firstName}, your school day starts here.</h2><p className="muted">Signed in as {roleNames.join(', ') || 'school community member'}.</p><div className="portal-links"><button>Academic records <span>→</span></button><button>Assignments and CBT <span>→</span></button><button>Fees and notifications <span>→</span></button></div></section>}
    <section id="notices" className="portal-strip"><div><small>NOTICE BOARD</small><h2>What is happening at Sapienza.</h2></div><div className="notice-list">{notices.length ? notices.slice(0, 3).map((notice) => <article key={notice.title}><small>{notice.category}</small><h3>{notice.title}</h3><p>{notice.body}</p></article>) : <p className="muted">New school announcements will appear here.</p>}</div></section>
    <section id="admissions" className="admissions"><small>ADMISSIONS</small><h2>Begin your Sapienza journey.</h2><p>Our admissions team helps families understand programs, application steps, and the life of the school.</p><button className="text-button" onClick={() => openRegistration()}>Create a family account <span>↗</span></button></section>
    {showLogin && <div className="modal-backdrop" onClick={() => setShowLogin(false)}><form className="login-panel" onSubmit={handleLogin} onClick={(event) => event.stopPropagation()}><button type="button" className="close" onClick={() => setShowLogin(false)}>×</button><small>SCHOOL PORTAL</small><h2>Sign in to continue.</h2><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="form-error">{error}</p>}<button className="primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button><button type="button" className="text-button" onClick={openRegistration}>Need an account? Create one</button></form></div>}
    {showRegister && <div className="modal-backdrop" onClick={() => setShowRegister(false)}><form className="login-panel" onSubmit={handleRegister} onClick={(event) => event.stopPropagation()}><button type="button" className="close" onClick={() => setShowRegister(false)}>×</button><small>JOIN SAPIENZA</small><h2>Create your account.</h2><div className="name-fields"><label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label><label>Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label></div><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="form-error">{error}</p>}<button className="primary" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button><button type="button" className="text-button" onClick={openLogin}>Already have an account? Sign in</button></form></div>}
  </main>;
}
