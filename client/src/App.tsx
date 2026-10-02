import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { adminDashboard, currentSchoolSettings, currentUser, login, publicContent, type AdminDashboard, type SchoolSettings, type SessionUser } from './api';
import { ContentManagement } from './ContentManagement';
import { AcademicSetupPage } from './AcademicSetupPage';
import { StudentResultsPage } from './StudentResultsPage';
import { UserRoleManagement } from './UserRoleManagement';
import { StudentEnrollmentPage } from './StudentEnrollmentPage';
import { BursarFinancePage } from './BursarFinancePage';
import { StudentFeesPage } from './StudentFeesPage';
import { RegistrarRecordsPage, RegistrarStaffPage } from './RegistrarWorkspaces';
import { ExploreDirectory, ExplorePage } from './ExploreSapienza';
import { CbtWorkspace } from './CbtWorkspace';
import './academic.css';

type Notice = { title: string; body: string; category: string };

function roleNames(user: SessionUser | null) { return user?.roles?.map((role) => role.name) ?? []; }
function homeFor(user: SessionUser) {
  const roles = roleNames(user);
  if (roles.includes('super_admin') || roles.includes('admin')) return '/admin';
  if (roles.includes('bursar')) return '/bursar';
  if (roles.includes('registrar')) return '/registrar';
  return roles.includes('teacher') ? '/staff' : '/student';
}

function PublicLayout({ user, onLogout }: { user: SessionUser | null; onLogout: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<SchoolSettings>({
    themePreset: 'wine-and-beige',
    schoolName: 'SAPIENZA',
    tagline: 'Catholic School',
    palette: {
      primary: '#4F1D2F',
      secondary: '#F4E9D8',
      accent: '#B77A59',
      background: '#F8F4EE',
      text: '#1F2937',
      muted: '#5F6C6D'
    }
  });

  useEffect(() => {
    currentSchoolSettings().then(({ settings: nextSettings }) => setSettings(nextSettings)).catch(() => undefined);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', settings.palette.primary);
    root.style.setProperty('--color-secondary', settings.palette.secondary);
    root.style.setProperty('--color-accent', settings.palette.accent);
    root.style.setProperty('--color-background', settings.palette.background);
    root.style.setProperty('--color-text', settings.palette.text);
    root.style.setProperty('--color-muted', settings.palette.muted);
  }, [settings]);

  const closeMenu = () => setMenuOpen(false);
  return <main className="page-shell"><nav className="site-nav"><Link className="brand" to="/" onClick={closeMenu}><strong>{settings.schoolName}</strong><span>{settings.tagline}</span></Link><button className="nav-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="public-navigation" onClick={() => setMenuOpen((open) => !open)}><span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button><div className="site-menu" id="public-navigation" hidden={!menuOpen}><Link to="/" onClick={closeMenu}>Home</Link><Link to="/explore" onClick={closeMenu}>Explore</Link><Link to="/#portals" onClick={closeMenu}>Portals</Link><Link to="/admissions" onClick={closeMenu}>Admissions</Link><div className="nav-actions">{user ? <><Link to={homeFor(user)} onClick={closeMenu}>Open portal</Link><button onClick={() => { closeMenu(); onLogout(); }}>Sign out</button></> : <Link to="/login" onClick={closeMenu}>Sign in</Link>}</div></div></nav><Outlet /></main>;
}

function Landing({ user }: { user: SessionUser | null }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [heroImage, setHeroImage] = useState<string>();
  useEffect(() => { publicContent().then(([noticeData, mediaData]) => { setNotices(noticeData.notices); setHeroImage(mediaData.media.find((asset) => asset.key === 'homepage.hero')?.url); }).catch(() => undefined); }, []);
  const roles = roleNames(user);
  const destinations = [
    ['Student Portal', roles.includes('student') ? '/student' : '/login'],
    ['Staff Portal', roles.some((role) => ['teacher', 'bursar', 'registrar'].includes(role)) ? homeFor(user!) : '/login'],
    ['Admin Portal', roles.some((role) => ['admin', 'super_admin'].includes(role)) ? '/admin' : '/login']
  ];
  return <><section className="hero" style={heroImage ? { backgroundImage: `linear-gradient(90deg, rgba(244,241,233,.96), rgba(244,241,233,.2)), url(${heroImage})` } : undefined}><p className="eyebrow">Forming minds. Shaping character.</p><h1>Learn with purpose.<br /><em>Live with faith.</em></h1><p className="intro">A connected school community for students, families, teachers, and alumni.</p><div className="actions"><Link className="primary" to="/explore">Explore Sapienza</Link><Link className="text-button" to="/admissions">Admissions <span>↗</span></Link></div></section><section id="portals" className="portal-strip portals"><div><small>PORTALS</small><h2>Choose the space that fits your role.</h2></div><div className="portal-links">{destinations.map(([label, path]) => <Link key={label} to={path}>{label} <span>→</span></Link>)}</div></section><section id="notices" className="portal-strip"><div><small>NOTICE BOARD</small><h2>What is happening at Sapienza.</h2></div><div className="notice-list">{notices.length ? notices.slice(0, 3).map((notice) => <article key={notice.title}><small>{notice.category}</small><h3>{notice.title}</h3><p>{notice.body}</p></article>) : <p className="muted">New school announcements will appear here.</p>}</div></section></>;
}

function Admissions() { return <section className="admissions"><small>ADMISSIONS</small><h2>Begin your Sapienza journey.</h2><p>Our admissions team helps families understand programs, application steps, and the life of the school.</p></section>; }

function AuthPage({ onAuthenticated }: { onAuthenticated: (user: SessionUser) => void }) {
  const navigate = useNavigate(); const [identifier, setIdentifier] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); setError(''); try { const result = await login(identifier, password); localStorage.setItem('sapienza.token', result.token); const session = await currentUser(); onAuthenticated(session.user); navigate(homeFor(session.user)); } catch (authError) { setError(authError instanceof Error ? authError.message : 'Unable to continue'); } finally { setLoading(false); } }
  return <div className="auth-page"><form className="login-panel" onSubmit={submit}><small>SCHOOL PORTAL</small><h2>Sign in to continue.</h2><label>Email or student login code<input type="text" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="form-error">{error}</p>}<button className="primary" disabled={loading}>{loading ? 'Please wait...' : 'Sign in'}</button></form></div>;
}

function ProtectedRoute({ user, roles }: { user: SessionUser | null; roles?: string[] }) { if (!user) return <Navigate to="/login" replace />; if (roles && !roles.some((role) => roleNames(user).includes(role))) return <Navigate to={homeFor(user)} replace />; return <AuthenticatedLayout user={user} />; }
function PermissionRoute({ user, permission }: { user: SessionUser | null; permission: string }) { if (!user) return <Navigate to="/login" replace />; if (!user.roles?.some((role) => role.permissions.includes(permission))) return <Navigate to={homeFor(user)} replace />; return <AuthenticatedLayout user={user} />; }
function AuthenticatedLayout({ user }: { user: SessionUser }) { const navigate = useNavigate(); const location = useLocation(); const [menuOpen, setMenuOpen] = useState(true); const roles = roleNames(user); const admin = roles.includes('admin') || roles.includes('super_admin'); const bursar = roles.includes('bursar'); const registrar = roles.includes('registrar'); const staff = roles.some((role) => ['teacher', 'bursar', 'registrar', 'admin', 'super_admin'].includes(role)); const permissions = user.roles?.flatMap((role) => role.permissions) ?? [];
  const canManageSchoolContent = permissions.includes('content:manage') || permissions.includes('media:manage');
  const canManageAcademics = permissions.includes('academics:manage');
  const canEnrollStudents = permissions.includes('academics:enroll');
  const links = admin ? [['Dashboard', '/admin'], ...(permissions.includes('users:manage') ? [['Users & roles', '/admin/users']] : []), ['Academics', '/admin/academics'], ['Finance', '/admin/finance'], ['Reports', '/admin/reports']] : bursar ? [['Dashboard', '/bursar'], ['Fee structures', '/bursar/fees'], ['Invoices', '/bursar/invoices'], ['Payments', '/bursar/payments']] : registrar ? [['Dashboard', '/registrar'], ['Students', '/registrar/students'], ['Staff', '/registrar/staff'], ['Classes', '/registrar/classes'], ['Academic records', '/registrar/records']] : staff ? [['Dashboard', '/staff'], ['Attendance', '/staff/attendance'], ['Assignments', '/staff/assignments'], ['Grades', '/staff/grades'], ['CBT', '/staff/cbt']] : [['Dashboard', '/student'], ['Academic records', '/student/records'], ['Assignments', '/student/assignments'], ['CBT', '/student/cbt'], ['Fees', '/student/fees']];
  const registerLink = canEnrollStudents && !registrar ? [['Student register', admin ? '/admin/students' : '/staff/students']] : [];
  const navigationLinks = [...links, ...registerLink, ...(canManageAcademics && !admin && !registrar ? [['Academic setup', '/academic-setup']] : []), ...(canManageSchoolContent ? [['Content & media', '/content-management']] : [])];
  return <main className={`portal-shell${menuOpen ? '' : ' nav-collapsed'}`}><aside><div className="sidebar-top"><Link className="brand" to="/"><strong>SAPIENZA</strong><span>Portal</span></Link><button className="menu-toggle" type="button" aria-label={menuOpen ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span aria-hidden="true">☰</span></button></div><small className="portal-role">{admin ? 'ADMINISTRATION' : bursar ? 'FINANCE OFFICE' : registrar ? 'REGISTRAR OFFICE' : staff ? 'TEACHER PORTAL' : 'STUDENT PORTAL'}</small><div className="side-links">{navigationLinks.map(([label, path]) => <Link aria-label={label} title={label} className={location.pathname === path ? 'active' : ''} key={path} to={path}><span className="nav-label">{label}</span><span aria-hidden="true">→</span></Link>)}</div><button className="signout" onClick={() => { localStorage.removeItem('sapienza.token'); navigate('/'); }}>Sign out</button></aside><section className="portal-content"><header><small>{user.firstName} {user.lastName}</small><h1>{navigationLinks.find(([, path]) => path === location.pathname)?.[0] ?? 'Dashboard'}</h1></header><Outlet /></section></main>; }

function AdminOverview() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    adminDashboard().then((result) => { if (active) setData(result); }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard data'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryKey]);
  const number = (value: number) => new Intl.NumberFormat().format(value);
  const money = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  if (loading) return <section className="admin-overview" aria-live="polite"><p className="muted">Loading school overview...</p></section>;
  if (error) return <section className="admin-overview overview-error" role="alert"><p>{error}</p><button type="button" onClick={() => setRetryKey((key) => key + 1)}>Try again</button></section>;
  if (!data) return null;
  const attendanceTotal = data.attendance.reduce((total, item) => total + item.count, 0);
  return <section className="admin-overview" aria-label="School overview">
    <div className="overview-metrics">
      <article><small>ACTIVE STUDENTS</small><strong>{number(data.students)}</strong></article>
      <article><small>ATTENDANCE RECORDS</small><strong>{number(attendanceTotal)}</strong><span>Across all recorded statuses</span></article>
      <article><small>COLLECTED</small><strong>{money(data.finance.collected)}</strong><span>Of {money(data.finance.billed)} billed</span></article>
      <article><small>OUTSTANDING</small><strong>{money(data.finance.outstanding)}</strong><span>{number(data.invoices.reduce((total, invoice) => total + invoice.count, 0))} invoices</span></article>
      <article><small>CBT ATTEMPTS</small><strong>{number(data.cbt.attempts)}</strong><span>{data.cbt.averagePercentage.toFixed(1)}% average score</span></article>
    </div>
    <div className="overview-attendance"><div><small>ATTENDANCE BREAKDOWN</small><h3>Recorded attendance</h3></div>{data.attendance.length ? <dl>{data.attendance.map((item) => <div key={item._id}><dt>{item._id}</dt><dd>{number(item.count)}</dd></div>)}</dl> : <p className="muted">No attendance records yet.</p>}</div>
  </section>;
}

function DashboardPage({ kind }: { kind: 'student' | 'staff' | 'admin' | 'bursar' | 'registrar' }) { const copy = { student: ['Your school day, in one place.', 'Review your records, assignments, tests, and fees.'], staff: ['Keep the school moving forward.', 'Manage attendance, learning, grades, and assessments.'], bursar: ['Finance office workspace.', 'Manage school fees, invoices, and payment records.'], registrar: ['School records workspace.', 'Maintain student, staff, class, and academic records.'], admin: ['The school at a glance.', 'Manage people, operations, finance, content, and reports.'] }[kind]; const modules = { student: [['Academic records', '/student/records', 'REVIEW', 'See your grades and attendance.'], ['Assignments', '/student/assignments', 'LEARNING', 'View work and submission status.'], ['CBT', '/student/cbt', 'ASSESSMENTS', 'Open tests and assessment history.'], ['Fees', '/student/fees', 'ACCOUNT', 'Review school fees and payments.']], staff: [['Attendance', '/staff/attendance', 'CLASSROOM', 'Open class registers and attendance.'], ['Assignments', '/staff/assignments', 'LEARNING', 'Manage learning tasks and submissions.'], ['Grades', '/staff/grades', 'RECORDS', 'Enter and review student grades.'], ['CBT', '/staff/cbt', 'ASSESSMENTS', 'Manage computer-based tests.']], bursar: [['Fee structures', '/bursar/fees', 'FINANCE', 'Configure approved school fees.'], ['Invoices', '/bursar/invoices', 'ACCOUNTS', 'Create and review student invoices.'], ['Payments', '/bursar/payments', 'RECONCILIATION', 'Review receipts and payment status.']], registrar: [['Students', '/registrar/students', 'ENROLMENT', 'Maintain student records.'], ['Staff', '/registrar/staff', 'PEOPLE', 'Maintain staff profiles.'], ['Classes', '/registrar/classes', 'ACADEMICS', 'Review classes and assignments.'], ['Academic records', '/registrar/records', 'RECORDS', 'Manage school academic records.']], admin: [['Users & roles', '/admin/users', 'PEOPLE', 'Manage accounts and access.'], ['Academics', '/admin/academics', 'LEARNING', 'Open classes, subjects, and school years.'], ['Finance', '/admin/finance', 'OPERATIONS', 'Review fees and payment records.'], ['Reports', '/admin/reports', 'INSIGHTS', 'Open school reporting tools.']] }[kind]; return <div className="dashboard-grid"><article className="dashboard-lead"><small>OVERVIEW</small><h2>{copy[0]}</h2><p>{copy[1]}</p></article>{kind === 'admin' && <div className="dashboard-wide"><AdminOverview /></div>}{modules.map(([label, path, category, description]) => <Link className="dashboard-tile" key={path} to={path}><small>{category}</small><h3>{label}</h3><p>{description}</p><span className="tile-arrow" aria-hidden="true">→</span></Link>)}</div>; }
function PlaceholderPage() { const location = useLocation(); const segments = location.pathname.split('/').filter(Boolean); const title = segments[segments.length - 1]?.replace(/-/g, ' ') ?? 'Workspace'; return <div className="empty-state"><small>WORKSPACE</small><h2>{title.replace(/\b\w/g, (letter) => letter.toUpperCase())}</h2><p className="muted">This module is connected to your role. Live records and actions will appear here as the module is configured.</p></div>; }

export function App() { const [user, setUser] = useState<SessionUser | null>(null); useEffect(() => { if (localStorage.getItem('sapienza.token')) {
      currentUser().then(({ user: nextUser }) => setUser(nextUser)).catch(() => {
        localStorage.removeItem('sapienza.token');
        setUser(null);
      });
    }
  }, []);

  return <Routes>
    <Route element={<PublicLayout user={user} onLogout={() => { localStorage.removeItem('sapienza.token'); setUser(null); }} />}>
      <Route path="/" element={<Landing user={user} />} />
      <Route path="/explore" element={<ExploreDirectory />} />
      <Route path="/explore/:slug" element={<ExplorePage />} />
      <Route path="/admissions" element={<Admissions />} />
      <Route path="/login" element={<AuthPage onAuthenticated={setUser} />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
    </Route>
    <Route element={<PermissionRoute user={user} permission="content:manage" />}>
      <Route path="/content-management" element={<ContentManagement user={user!} />} />
    </Route>
    <Route element={<PermissionRoute user={user} permission="academics:manage" />}>
      <Route path="/academic-setup" element={<AcademicSetupPage />} />
    </Route>
    <Route element={<ProtectedRoute user={user} roles={['student']} />}>
      <Route path="/student" element={<DashboardPage kind="student" />} />
      <Route path="/student/records" element={<StudentResultsPage />} />
      <Route path="/student/fees" element={<StudentFeesPage />} />
      <Route path="/student/cbt" element={<CbtWorkspace user={user!} />} />
      <Route path="/student/*" element={<PlaceholderPage />} />
    </Route>
    <Route element={<ProtectedRoute user={user} roles={['teacher']} />}>
      <Route path="/staff" element={<DashboardPage kind="staff" />} />
      <Route path="/staff/students" element={<StudentEnrollmentPage />} />
      <Route path="/staff/cbt" element={<CbtWorkspace user={user!} />} />
      <Route path="/staff/*" element={<PlaceholderPage />} />
    </Route>
    <Route element={<ProtectedRoute user={user} roles={['bursar']} />}>
      <Route path="/bursar" element={<DashboardPage kind="bursar" />} />
      <Route path="/bursar/fees" element={<BursarFinancePage view="fees" />} />
      <Route path="/bursar/invoices" element={<BursarFinancePage view="invoices" />} />
      <Route path="/bursar/payments" element={<BursarFinancePage view="payments" />} />
      <Route path="/bursar/*" element={<PlaceholderPage />} />
    </Route>
    <Route element={<ProtectedRoute user={user} roles={['registrar']} />}>
      <Route path="/registrar" element={<DashboardPage kind="registrar" />} />
      <Route path="/registrar/students" element={<StudentEnrollmentPage />} />
      <Route path="/registrar/staff" element={<RegistrarStaffPage />} />
      <Route path="/registrar/classes" element={<AcademicSetupPage />} />
      <Route path="/registrar/records" element={<RegistrarRecordsPage />} />
      <Route path="/registrar/*" element={<PlaceholderPage />} />
    </Route>
    <Route element={<ProtectedRoute user={user} roles={['admin', 'super_admin']} />}>
      <Route path="/admin" element={<DashboardPage kind="admin" />} />
      <Route path="/admin/users" element={<UserRoleManagement />} />
      <Route path="/admin/students" element={<StudentEnrollmentPage />} />
      <Route path="/admin/academics" element={<AcademicSetupPage />} />
      <Route path="/admin/finance" element={<BursarFinancePage view="invoices" />} />
      <Route path="/admin/finance/fees" element={<BursarFinancePage view="fees" />} />
      <Route path="/admin/finance/invoices" element={<BursarFinancePage view="invoices" />} />
      <Route path="/admin/finance/payments" element={<BursarFinancePage view="payments" />} />
      <Route path="/admin/*" element={<PlaceholderPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>; }
