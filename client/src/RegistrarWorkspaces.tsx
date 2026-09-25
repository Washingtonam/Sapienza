import { useEffect, useState } from 'react';
import { publishReportCard, schoolReportCards, schoolStaff, schoolStudents, schoolTerms, schoolYears, type ManagedReportCard, type SchoolStudent, type SchoolTerm, type SchoolYear, type StaffRecord } from './api';
import './registrar-workspaces.css';

export function RegistrarStaffPage() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    schoolStaff().then(({ staff: entries }) => { if (active) setStaff(entries); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load staff records'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = staff.filter((member) => `${member.userId.firstName} ${member.userId.lastName} ${member.userId.email ?? ''} ${member.employeeNumber} ${member.department ?? ''} ${member.jobTitle}`.toLowerCase().includes(normalizedQuery));

  return <section className="registrar-workspace">
    <div className="registrar-heading"><div><small>PEOPLE &amp; OPERATIONS</small><h2>Staff directory</h2></div><label>Search staff<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, employee number, department" /></label></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <p className="muted" aria-live="polite">Loading staff records...</p> : <div className="registrar-table-wrap"><table className="registrar-table"><thead><tr><th>Staff member</th><th>Employee number</th><th>Job title</th><th>Department</th><th>Status</th><th>Hire date</th></tr></thead><tbody>{filtered.map((member) => <tr key={member._id}><td><strong>{member.userId.firstName} {member.userId.lastName}</strong><small>{member.userId.email}</small></td><td>{member.employeeNumber}</td><td>{member.jobTitle}</td><td>{member.department || '—'}</td><td className="capitalize">{member.employmentStatus.replace('_', ' ')}</td><td>{member.hireDate ? new Date(member.hireDate).toLocaleDateString() : '—'}</td></tr>)}</tbody></table>{filtered.length === 0 && <p className="muted">No staff records match this search.</p>}</div>}
  </section>;
}

export function RegistrarRecordsPage() {
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [terms, setTerms] = useState<SchoolTerm[]>([]);
  const [reportCards, setReportCards] = useState<ManagedReportCard[]>([]);
  const [studentId, setStudentId] = useState('');
  const [schoolYearId, setSchoolYearId] = useState('');
  const [termName, setTermName] = useState('');
  const [teacherComment, setTeacherComment] = useState('');
  const [principalComment, setPrincipalComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([schoolStudents(), schoolYears(), schoolTerms(), schoolReportCards()]).then(([studentData, yearData, termData, cardData]) => {
      if (!active) return;
      setStudents(studentData.students);
      setYears(yearData.schoolYears);
      setTerms(termData.terms);
      setReportCards(cardData.reportCards);
      setStudentId(studentData.students[0]?._id ?? '');
      const preferredYear = yearData.schoolYears.find((year) => year.status === 'active') ?? yearData.schoolYears[0];
      setSchoolYearId(preferredYear?._id ?? '');
      setTermName(termData.terms.find((term) => term.schoolYearId === preferredYear?._id)?.name ?? '');
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load academic records'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const availableTerms = terms.filter((term) => term.schoolYearId === schoolYearId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await publishReportCard(studentId, { schoolYearId, term: termName, ...(teacherComment.trim() ? { teacherComment: teacherComment.trim() } : {}), ...(principalComment.trim() ? { principalComment: principalComment.trim() } : {}) });
      const { reportCards: refreshed } = await schoolReportCards();
      setReportCards(refreshed);
      setNotice('Report card published.');
      setTeacherComment('');
      setPrincipalComment('');
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Unable to publish report card');
    } finally {
      setSaving(false);
    }
  }

  return <section className="registrar-workspace">
    <div className="registrar-heading"><div><small>ACADEMIC RECORDS</small><h2>Report cards</h2></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="registrar-notice" role="status">{notice}</p>}
    {loading ? <p className="muted" aria-live="polite">Loading academic records...</p> : <>
      <form className="registrar-publish-form" onSubmit={submit}>
        <header><small>PUBLICATION</small><h3>Calculate and publish a result</h3></header>
        <div className="registrar-publish-grid">
          <label>Student<select value={studentId} onChange={(event) => setStudentId(event.target.value)} required><option value="">Select student</option>{students.map((student) => <option key={student._id} value={student._id}>{student.userId.firstName} {student.userId.lastName} · {student.admissionNumber}</option>)}</select></label>
          <label>School year<select value={schoolYearId} onChange={(event) => { const nextYearId = event.target.value; setSchoolYearId(nextYearId); setTermName(terms.find((term) => term.schoolYearId === nextYearId)?.name ?? ''); }} required><option value="">Select year</option>{years.map((year) => <option key={year._id} value={year._id}>{year.name}</option>)}</select></label>
          <label>Term<select value={termName} onChange={(event) => setTermName(event.target.value)} required><option value="">Select term</option>{availableTerms.map((term) => <option key={term._id} value={term.name}>{term.name}</option>)}</select></label>
          <label>Teacher comment<textarea value={teacherComment} onChange={(event) => setTeacherComment(event.target.value)} rows={2} /></label>
          <label>Principal comment<textarea value={principalComment} onChange={(event) => setPrincipalComment(event.target.value)} rows={2} /></label>
        </div>
        <button className="primary" type="submit" disabled={saving || !studentId || !termName}>{saving ? 'Publishing...' : 'Publish report card'}</button>
      </form>
      <div className="registrar-table-wrap"><table className="registrar-table"><thead><tr><th>Student</th><th>Class</th><th>School year</th><th>Term</th><th>Average</th><th>Published</th></tr></thead><tbody>{reportCards.filter((card) => card.publishedAt).map((card) => <tr key={card._id}><td><strong>{card.studentId.userId.firstName} {card.studentId.userId.lastName}</strong><small>{card.studentId.admissionNumber}</small></td><td>{card.studentId.classId?.name ?? '—'}</td><td>{card.schoolYearId.name}</td><td>{card.term}</td><td>{card.average.toFixed(2)}%</td><td>{new Date(card.publishedAt!).toLocaleDateString()}</td></tr>)}</tbody></table>{reportCards.filter((card) => card.publishedAt).length === 0 && <p className="muted">No report cards have been published.</p>}</div>
    </>}
  </section>;
}