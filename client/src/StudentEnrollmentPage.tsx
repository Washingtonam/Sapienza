import { useEffect, useState } from 'react';
import { classEnrollments, currentUser, enrollmentClasses, enrollStudent, reenrollStudent, schoolTerms, updateStudentPassword, type ClassEnrollment, type EnrollmentClass, type SchoolTerm } from './api';
import './student-enrollment.css';

function localDateInput() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const text = source.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += character;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted value');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvCell(value: string) {
  const safeValue = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function temporaryPassword() {
  return `Sap-${crypto.randomUUID().replace(/-/g, '')}`;
}

export function StudentEnrollmentPage() {
  const [classes, setClasses] = useState<EnrollmentClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [terms, setTerms] = useState<SchoolTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [returningLoginCode, setReturningLoginCode] = useState('');
  const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
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
  const [bulkMessage, setBulkMessage] = useState('');
  const [canManageStudents, setCanManageStudents] = useState(false);
  const [editingPasswordId, setEditingPasswordId] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    let active = true;
    enrollmentClasses().then(({ classes: availableClasses }) => {
      if (!active) return;
      setClasses(availableClasses);
      const preferredClass = availableClasses.find((schoolClass) => schoolClass.schoolYearId.status === 'active') ?? availableClasses[0];
      setSelectedClassId(preferredClass?._id ?? '');
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load class registers'); })
      .finally(() => { if (active) setLoading(false); });
    currentUser().then(({ user }) => { if (active) setCanManageStudents(user.roles?.some((role) => role.permissions.includes('academics:manage')) ?? false); }).catch(() => undefined);
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
        ...(middleName.trim() ? { middleName: middleName.trim() } : {}),
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
      setEnrollmentMessage(`${result.student.firstName} ${result.student.lastName} registered. Login code: ${result.student.loginCode}. Initial password: ${password}`);
      setFirstName('');
      setMiddleName('');
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

  async function importStudents(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedClass || !selectedTermId) return;
    setSaving(true);
    setError('');
    setBulkMessage('');
    try {
      const rows = parseCsv(await file.text());
      const headers = rows.shift()?.map((header) => header.trim().toLowerCase()) ?? [];
      const requiredHeaders = ['firstname', 'lastname'];
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
      if (missingHeaders.length) throw new Error(`Missing required CSV columns: ${missingHeaders.join(', ')}`);
      if (!rows.length) throw new Error('The CSV has no student rows');
      if (rows.length > 250) throw new Error('Import up to 250 students at a time');

      const imported: string[][] = [['firstName', 'middleName', 'lastName', 'loginCode', 'temporaryPassword']];
      const failures: string[] = [];
      for (const [index, values] of rows.entries()) {
        const student = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? '']));
        if (!student.firstname || !student.lastname) { failures.push(`Row ${index + 2}: firstName and lastName are required`); continue; }
        const password = temporaryPassword();
        try {
          const result = await enrollStudent({
            firstName: student.firstname,
            ...(student.middlename ? { middleName: student.middlename } : {}),
            lastName: student.lastname,
            password,
            admissionDate: student.admissiondate || localDateInput(),
            schoolYearId: selectedClass.schoolYearId._id,
            termId: selectedTermId,
            classId: selectedClass._id,
            ...(student.dateofbirth ? { dateOfBirth: student.dateofbirth } : {}),
            ...(student.gender ? { gender: student.gender.toLowerCase() as 'female' | 'male' | 'other' | 'undisclosed' } : {}),
            ...(student.address ? { address: student.address } : {})
          });
          imported.push([student.firstname, student.middlename ?? '', student.lastname, result.student.loginCode, password]);
        } catch (importError) {
          failures.push(`Row ${index + 2}: ${importError instanceof Error ? importError.message : 'Unable to register student'}`);
        }
      }

      if (imported.length > 1) downloadCsv('student-login-credentials.csv', imported);
      const failureSummary = failures.slice(0, 8).join('; ');
      const remainingFailures = failures.length > 8 ? `; and ${failures.length - 8} more` : '';
      setBulkMessage(`${imported.length - 1} student${imported.length === 2 ? '' : 's'} registered.${failures.length ? ` ${failures.length} row${failures.length === 1 ? '' : 's'} need attention: ${failureSummary}${remainingFailures}` : ' Login credentials downloaded.'}`);
      const refreshed = await classEnrollments(selectedClass._id, selectedClass.schoolYearId._id);
      setEnrollments(refreshed.enrollments);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Unable to import students');
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

  async function submitStudentPassword(event: React.FormEvent, studentId: string) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setPasswordMessage('');
    try {
      await updateStudentPassword(studentId, newStudentPassword);
      setPasswordMessage('Student password updated. Share it securely with the student.');
      setEditingPasswordId('');
      setNewStudentPassword('');
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'Unable to update student password');
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
          <label>Middle name<input value={middleName} onChange={(event) => setMiddleName(event.target.value)} autoComplete="additional-name" /></label>
          <label>Surname<input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required /></label>
          <label className="student-password-field">Initial password<div><input type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setPassword(temporaryPassword())}>Generate</button></div></label>
          <label>Date of birth<input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></label>
          <label>Registration date<input type="date" value={admissionDate} onChange={(event) => setAdmissionDate(event.target.value)} required /></label>
          <label>Gender<select value={gender} onChange={(event) => setGender(event.target.value)}><option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="undisclosed">Prefer not to say</option></select></label>
          <label>Address<input value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" /></label>
        </div>
        <button className="primary" disabled={saving || !selectedTermId}>{saving ? 'Registering...' : 'Register student'}</button>
      </form>
      <section className="student-bulk-import">
        <div><small>BULK REGISTRATION</small><h3>Register from a spreadsheet</h3></div>
        <p>Use the CSV template in Excel. Dates should use YYYY-MM-DD. Each successful student receives a temporary password in the credentials download.</p>
        <div className="student-bulk-actions">
          <button type="button" onClick={() => downloadCsv('student-registration-template.csv', [['firstName', 'middleName', 'lastName', 'admissionDate', 'dateOfBirth', 'gender', 'address']])}>Download Excel-compatible CSV template</button>
          <label>Choose completed CSV<input type="file" accept=".csv,text/csv" onChange={(event) => void importStudents(event)} disabled={saving || !selectedTermId} /></label>
        </div>
        {bulkMessage && <p className="student-login-code" role="status">{bulkMessage}</p>}
      </section>
      {enrollmentMessage && <p className="student-login-code" role="status">{enrollmentMessage}</p>}
      <section className="student-register-roster" aria-label="Enrolled students">
        <header><div><small>{selectedClass?.schoolYearId.name ?? 'SCHOOL YEAR'}</small><h3>{selectedClass?.name ?? 'Class roster'}</h3></div><span>{enrollments.length} {enrollments.length === 1 ? 'student' : 'students'}</span></header>
        {enrollments.length ? <div className="results-table-wrap"><table className="results-table"><thead><tr><th>Student</th><th>Student login code</th>{canManageStudents && <th>Account</th>}</tr></thead><tbody>{enrollments.map((enrollment) => <tr key={enrollment._id}><td>{[enrollment.studentId.userId.firstName, enrollment.studentId.userId.middleName, enrollment.studentId.userId.lastName].filter(Boolean).join(' ')}</td><td><strong>{enrollment.studentId.userId.loginCode || enrollment.studentId.admissionNumber}</strong></td>{canManageStudents && <td>{editingPasswordId === enrollment.studentId._id ? <form className="student-password-reset" onSubmit={(event) => void submitStudentPassword(event, enrollment.studentId._id)}><input aria-label="New student password" type="password" minLength={8} autoComplete="new-password" value={newStudentPassword} onChange={(event) => setNewStudentPassword(event.target.value)} required /><button type="submit" disabled={saving}>Save</button><button type="button" onClick={() => { setEditingPasswordId(''); setNewStudentPassword(''); }}>Cancel</button></form> : <button type="button" className="student-password-reset-button" onClick={() => { setEditingPasswordId(enrollment.studentId._id); setNewStudentPassword(''); }}>Reset password</button>}</td>}</tr>)}</tbody></table></div> : <p className="muted">No students are registered in this class yet.</p>}
        {passwordMessage && <p className="student-login-code" role="status">{passwordMessage}</p>}
      </section>
    </>}
  </section>;
}
