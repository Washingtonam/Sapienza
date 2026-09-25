import { useEffect, useState } from 'react';
import { classEnrollments, enrollmentClasses, enrollStudent, reenrollStudent, schoolTerms, type ClassEnrollment, type EnrollmentClass, type SchoolTerm } from './api';
import './student-enrollment.css';

function localDateInput() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function StudentEnrollmentPage() {
  const [classes, setClasses] = useState<EnrollmentClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [terms, setTerms] = useState<SchoolTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [returningLoginCode, setReturningLoginCode] = useState('');
  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [admissionDate, setAdmissionDate] = useState(localDateInput);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [enrollmentMessage, setEnrollmentMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    enrollmentClasses().then(({ classes: availableClasses }) => {
      if (!active) return;
      setClasses(availableClasses);
      const preferredClass = availableClasses.find((schoolClass) => schoolClass.schoolYearId.status === 'active') ?? availableClasses[0];
      setSelectedClassId(preferredClass?._id ?? '');
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load class registers'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedClass = classes.find((schoolClass) => schoolClass._id === selectedClassId);

  useEffect(() => {
    if (!selectedClass) {
      setTerms([]);
      setEnrollments([]);
      setSelectedTermId('');
      return;
    }
    let active = true;
    setError('');
    Promise.all([schoolTerms(selectedClass.schoolYearId._id), classEnrollments(selectedClass._id, selectedClass.schoolYearId._id)])
      .then(([termData, enrollmentData]) => {
        if (!active) return;
        setTerms(termData.terms);
        setSelectedTermId((current) => termData.terms.some((term) => term._id === current) ? current : termData.terms[0]?._id ?? '');
        setEnrollments(enrollmentData.enrollments);
      })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load this class register'); });
    return () => { active = false; };
  }, [selectedClass]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClass || !selectedTermId) return;
    setSaving(true);
    setError('');
    setEnrollmentMessage('');
    try {
      const result = await enrollStudent({
        firstName,
        lastName,
        password,
        admissionDate,
        schoolYearId: selectedClass.schoolYearId._id,
        termId: selectedTermId,
        classId: selectedClass._id,
        ...(dateOfBirth ? { dateOfBirth } : {}),
        ...(gender ? { gender: gender as 'female' | 'male' | 'other' | 'undisclosed' } : {}),
        ...(address.trim() ? { address: address.trim() } : {})
      });
      setEnrollmentMessage(`${result.student.firstName} ${result.student.lastName} registered. Login code: ${result.student.loginCode}`);
      setFirstName('');
      setLastName('');
      setPassword('');
      setDateOfBirth('');
      setGender('');
      setAddress('');
      const refreshed = await classEnrollments(selectedClass._id, selectedClass.schoolYearId._id);
      setEnrollments(refreshed.enrollments);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to register student');
    } finally {
      setSaving(false);
    }
  }

  async function submitReturningStudent(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClass || !selectedTermId) return;
    setSaving(true);
    setError('');
    setEnrollmentMessage('');
    try {
      const result = await reenrollStudent({ loginCode: returningLoginCode, schoolYearId: selectedClass.schoolYearId._id, termId: selectedTermId, classId: selectedClass._id });
      setEnrollmentMessage(`${result.student.firstName} ${result.student.lastName} added to this session. Login code remains ${result.student.loginCode}.`);
      setReturningLoginCode('');
      const refreshed = await classEnrollments(selectedClass._id, selectedClass.schoolYearId._id);
      setEnrollments(refreshed.enrollments);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to enroll returning student');
    } finally {
      setSaving(false);
    }
  }

  return <section className="student-register">
    <div className="student-register-heading"><div><small>STUDENT ENROLMENT</small><h2>Class register</h2></div><label>Class and session<select value={selectedClassId} onChange={(event) => { setSelectedClassId(event.target.value); setEnrollmentMessage(''); }} disabled={loading || classes.length === 0}><option value="">Select a class</option>{classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.schoolYearId.name}</option>)}</select></label></div>
    {selectedClass && <label className="student-register-term">Term<select value={selectedTermId} onChange={(event) => setSelectedTermId(event.target.value)} required disabled={!terms.length}><option value="">Select a term</option>{terms.map((term) => <option key={term._id} value={term._id}>{term.name}</option>)}</select></label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <p className="muted" aria-live="polite">Loading your class registers...</p> : !classes.length ? <div className="student-register-empty"><h3>No class register is assigned</h3><p className="muted">Ask an administrator to assign you as the class teacher before enrolling students.</p></div> : <>
      <form className="student-returning-form" onSubmit={submitReturningStudent}>
        <div><small>RETURNING STUDENT</small><h3>Enroll an existing student</h3></div>
        <label>Student login code<input value={returningLoginCode} onChange={(event) => setReturningLoginCode(event.target.value.toUpperCase())} placeholder="SAP12345678" required /></label>
        <button type="submit" disabled={saving || !selectedTermId}>{saving ? 'Saving...' : 'Enroll for this session'}</button>
      </form>
      <form className="student-register-form" onSubmit={submit}>
        <header><small>NEW STUDENT</small><h3>Register a student</h3></header>
        <div className="student-register-fields">
          <label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required /></label>
          <label>Surname<input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required /></label>
          <label>Initial password<input type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <label>Date of birth<input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></label>
          <label>Registration date<input type="date" value={admissionDate} onChange={(event) => setAdmissionDate(event.target.value)} required /></label>
          <label>Gender<select value={gender} onChange={(event) => setGender(event.target.value)}><option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option><option value="undisclosed">Prefer not to say</option></select></label>
          <label>Address<input value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" /></label>
        </div>
        <button className="primary" disabled={saving || !selectedTermId}>{saving ? 'Registering...' : 'Register student'}</button>
      </form>
      {enrollmentMessage && <p className="student-login-code" role="status">{enrollmentMessage}</p>}
      <section className="student-register-roster" aria-label="Enrolled students">
        <header><div><small>{selectedClass?.schoolYearId.name ?? 'SCHOOL YEAR'}</small><h3>{selectedClass?.name ?? 'Class roster'}</h3></div><span>{enrollments.length} {enrollments.length === 1 ? 'student' : 'students'}</span></header>
        {enrollments.length ? <div className="results-table-wrap"><table className="results-table"><thead><tr><th>Student</th><th>Student login code</th></tr></thead><tbody>{enrollments.map((enrollment) => <tr key={enrollment._id}><td>{enrollment.studentId.userId.firstName} {enrollment.studentId.userId.lastName}</td><td><strong>{enrollment.studentId.userId.loginCode || enrollment.studentId.admissionNumber}</strong></td></tr>)}</tbody></table></div> : <p className="muted">No students are registered in this class yet.</p>}
      </section>
    </>}
  </section>;
}
