import { useEffect, useState } from 'react';
import { classEnrollments, createRecordAssessment, createRecordAssignment, downloadOperationsReport, enrollmentClasses, recordsAssessments, recordsAssignments, recordsAttendance, recordsGrades, saveAttendance, saveRecordGrade, schoolSubjects, schoolYears, schoolTerms, submitRecordAssignment, type AssessmentRecord, type AttendanceRecord, type EnrollmentClass, type SchoolSubject } from './api';
import './records-workspaces.css';

type Enrollment = Awaited<ReturnType<typeof classEnrollments>>['enrollments'][number];

function localDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function studentName(enrollment: Enrollment) {
  const user = enrollment.studentId.userId;
  return `${user.firstName} ${user.lastName}`;
}

function messageText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function ClassPicker({ classes, value, onChange }: { classes: EnrollmentClass[]; value: string; onChange: (value: string) => void }) {
  return <label>Class<select required value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select class</option>{classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.schoolYearId.name}</option>)}</select></label>;
}

export function AttendanceWorkspace() {
  const [classes, setClasses] = useState<EnrollmentClass[]>([]);
  const [classId, setClassId] = useState('');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(localDate());
  const [status, setStatus] = useState<AttendanceRecord['status']>('present');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    enrollmentClasses().then(({ classes: nextClasses }) => {
      setClasses(nextClasses);
      setClassId(nextClasses[0]?._id ?? '');
    }).catch((loadError) => setError(messageText(loadError, 'Unable to load classes'))).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const selectedClass = classes.find((item) => item._id === classId);
    if (!selectedClass) return;
    setLoading(true);
    Promise.all([
      classEnrollments(classId, selectedClass.schoolYearId._id),
      recordsAttendance({ classId, date })
    ]).then(([roster, records]) => {
      setEnrollments(roster.enrollments);
      setStudentId((current) => roster.enrollments.some((item) => item.studentId._id === current) ? current : roster.enrollments[0]?.studentId._id ?? '');
      setAttendance(records.attendance);
    }).catch((loadError) => setError(messageText(loadError, 'Unable to load attendance register'))).finally(() => setLoading(false));
  }, [classes, classId, date]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await saveAttendance({ studentId, classId, date, status, remarks: remarks.trim() || undefined });
      setAttendance((current) => [result.attendance, ...current.filter((record) => (typeof record.studentId === 'string' ? record.studentId : record.studentId._id) !== studentId)]);
      setMessage('Attendance saved.');
      setRemarks('');
    } catch (saveError) { setError(messageText(saveError, 'Unable to save attendance')); }
    finally { setSaving(false); }
  }

  return <section className="records-workspace">
    <header className="records-heading"><div><small>CLASSROOM</small><h2>Attendance register</h2><p>Record or update attendance for your assigned class.</p></div></header>
    {error && <p className="records-message error" role="alert">{error}</p>}{message && <p className="records-message" role="status">{message}</p>}
    <div className="records-filters"><ClassPicker classes={classes} value={classId} onChange={setClassId} /><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label></div>
    {loading ? <p aria-live="polite">Loading class register...</p> : !classes.length ? <p className="records-empty">No classes are assigned to your account.</p> : !enrollments.length ? <p className="records-empty">No students are enrolled in this class for the selected school year.</p> : <>
      <form className="records-form" onSubmit={submit}>
        <label>Student<select required value={studentId} onChange={(event) => setStudentId(event.target.value)}>{enrollments.map((item) => <option key={item.studentId._id} value={item.studentId._id}>{studentName(item)}</option>)}</select></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as AttendanceRecord['status'])}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></label>
        <label className="records-wide">Remarks<input value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>
        <button type="submit" disabled={saving || !studentId}>{saving ? 'Saving...' : 'Save attendance'}</button>
      </form>
      <div className="records-table-wrap"><table className="records-table"><thead><tr><th>Student</th><th>Status</th><th>Remarks</th></tr></thead><tbody>{attendance.map((record) => <tr key={record._id}><td>{typeof record.studentId === 'string' ? 'Student' : `${record.studentId.userId.firstName} ${record.studentId.userId.lastName}`}</td><td>{record.status}</td><td>{record.remarks || '—'}</td></tr>)}</tbody></table>{!attendance.length && <p className="records-empty">No attendance has been recorded for this date.</p>}</div>
    </>}
  </section>;
}

export function AssignmentsWorkspace({ isStudent }: { isStudent: boolean }) {
  const [classes, setClasses] = useState<EnrollmentClass[]>([]);
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [classId, setClassId] = useState('');
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof recordsAssignments>>['assignments']>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const requests = isStudent ? [recordsAssignments()] : [enrollmentClasses(), schoolSubjects()];
    Promise.all(requests).then((results) => {
      if (isStudent) setAssignments((results[0] as Awaited<ReturnType<typeof recordsAssignments>>).assignments);
      else {
        const availableClasses = (results[0] as Awaited<ReturnType<typeof enrollmentClasses>>).classes;
        const availableSubjects = (results[1] as Awaited<ReturnType<typeof schoolSubjects>>).subjects;
        setClasses(availableClasses);
        setClassId(availableClasses[0]?._id ?? '');
        setSubjects(availableSubjects);
        setSubjectId(availableSubjects[0]?._id ?? '');
      }
    }).catch((loadError) => setError(messageText(loadError, 'Unable to load assignments'))).finally(() => setLoading(false));
  }, [isStudent]);

  useEffect(() => {
    if (isStudent || !classId) return;
    recordsAssignments(classId).then(({ assignments: nextAssignments }) => setAssignments(nextAssignments)).catch((loadError) => setError(messageText(loadError, 'Unable to load assignments')));
  }, [classId, isStudent]);

  async function createAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      await createRecordAssignment({ title, description, subjectId, classId, dueAt: new Date(dueAt).toISOString(), status: 'published' });
      setTitle(''); setDescription(''); setMessage('Assignment published.');
      const result = await recordsAssignments(classId);
      setAssignments(result.assignments);
    } catch (saveError) { setError(messageText(saveError, 'Unable to create assignment')); }
    finally { setSaving(false); }
  }

  async function submitAnswer(event: React.FormEvent<HTMLFormElement>, assignmentId: string) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      await submitRecordAssignment({ assignmentId, answerText: answers[assignmentId] ?? '' });
      setMessage('Your assignment was submitted.');
      setAnswers((current) => ({ ...current, [assignmentId]: '' }));
    } catch (submitError) { setError(messageText(submitError, 'Unable to submit assignment')); }
    finally { setSaving(false); }
  }

  return <section className="records-workspace">
    <header className="records-heading"><div><small>LEARNING</small><h2>{isStudent ? 'Assignments' : 'Assignment workspace'}</h2><p>{isStudent ? 'Review current work and submit your answers.' : 'Publish work for your assigned classes.'}</p></div></header>
    {error && <p className="records-message error" role="alert">{error}</p>}{message && <p className="records-message" role="status">{message}</p>}
    {!isStudent && <form className="records-form records-form-wide" onSubmit={createAssignment}>
      <ClassPicker classes={classes} value={classId} onChange={setClassId} />
      <label>Subject<select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Select subject</option>{subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name} · {subject.code}</option>)}</select></label>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label>Due date<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} required /></label>
      <label className="records-wide">Instructions<textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} required /></label>
      <button type="submit" disabled={saving || !classId || !subjectId}>{saving ? 'Publishing...' : 'Publish assignment'}</button>
    </form>}
    {loading ? <p aria-live="polite">Loading assignments...</p> : assignments.length ? <div className="records-list">{assignments.map((assignment) => <article className="records-item" key={assignment._id}><div><small>{typeof assignment.subjectId === 'string' ? 'SUBJECT' : assignment.subjectId.name} · {assignment.status.toUpperCase()}</small><h3>{assignment.title}</h3><p>{assignment.description}</p><time dateTime={assignment.dueAt}>Due {new Date(assignment.dueAt).toLocaleString()}</time></div>{isStudent && <form onSubmit={(event) => void submitAnswer(event, assignment._id)}><label>Your answer<textarea rows={3} value={answers[assignment._id] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [assignment._id]: event.target.value }))} required /></label><button type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit assignment'}</button></form>}</article>)}</div> : <p className="records-empty">{isStudent ? 'There are no published assignments for your class.' : classId ? 'No assignments for this class yet.' : 'No assigned classes are available.'}</p>}
  </section>;
}

export function GradesWorkspace() {
  const [classes, setClasses] = useState<EnrollmentClass[]>([]);
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [terms, setTerms] = useState<Array<{ _id: string; name: string }>>([]);
  const [classId, setClassId] = useState('');
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [assessmentId, setAssessmentId] = useState('');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [studentId, setStudentId] = useState('');
  const [grades, setGrades] = useState<Awaited<ReturnType<typeof recordsGrades>>['grades']>([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AssessmentRecord['type']>('test');
  const [subjectId, setSubjectId] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [term, setTerm] = useState('');
  const [score, setScore] = useState('');
  const [grade, setGrade] = useState('');
  const [remarks, setRemarks] = useState('');
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([enrollmentClasses(), schoolSubjects()]).then(([classResult, subjectResult]) => {
      setClasses(classResult.classes); setClassId(classResult.classes[0]?._id ?? '');
      setSubjects(subjectResult.subjects); setSubjectId(subjectResult.subjects[0]?._id ?? '');
    }).catch((loadError) => setError(messageText(loadError, 'Unable to load grade workspace'))).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const selectedClass = classes.find((item) => item._id === classId);
    if (!selectedClass) return;
    Promise.all([
      recordsAssessments(classId),
      classEnrollments(classId, selectedClass.schoolYearId._id),
      schoolTerms(selectedClass.schoolYearId._id),
      recordsGrades()
    ]).then(([assessmentResult, roster, termResult, gradeResult]) => {
      setAssessments(assessmentResult.assessments);
      setAssessmentId((current) => assessmentResult.assessments.some((item) => item._id === current) ? current : assessmentResult.assessments[0]?._id ?? '');
      setEnrollments(roster.enrollments);
      setStudentId((current) => roster.enrollments.some((item) => item.studentId._id === current) ? current : roster.enrollments[0]?.studentId._id ?? '');
      setTerms(termResult.terms);
      setTerm((current) => termResult.terms.some((item) => item.name === current) ? current : termResult.terms[0]?.name ?? '');
      setGrades(gradeResult.grades);
    }).catch((loadError) => setError(messageText(loadError, 'Unable to load class grades')));
  }, [classes, classId]);

  async function createAssessment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedClass = classes.find((item) => item._id === classId);
    if (!selectedClass) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await createRecordAssessment({ title, type, subjectId, classId, schoolYearId: selectedClass.schoolYearId._id, term, maxScore: Number(maxScore), published });
      setAssessments((current) => [result.assessment, ...current]); setAssessmentId(result.assessment._id); setTitle(''); setMessage('Assessment created.');
    } catch (saveError) { setError(messageText(saveError, 'Unable to create assessment')); }
    finally { setSaving(false); }
  }

  async function submitGrade(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const result = await saveRecordGrade({ assessmentId, studentId, score: Number(score), grade: grade.trim() || undefined, remarks: remarks.trim() || undefined });
      setGrades((current) => [result.grade, ...current.filter((item) => {
        const itemAssessmentId = typeof item.assessmentId === 'string' ? item.assessmentId : item.assessmentId._id;
        return itemAssessmentId !== assessmentId || item.studentId !== studentId;
      })]);
      setMessage('Grade saved.'); setScore(''); setGrade(''); setRemarks('');
    } catch (saveError) { setError(messageText(saveError, 'Unable to save grade')); }
    finally { setSaving(false); }
  }

  const selectedAssessment = assessments.find((item) => item._id === assessmentId);
  const assessmentGrades = grades.filter((item) => typeof item.assessmentId !== 'string' && item.assessmentId._id === assessmentId);

  return <section className="records-workspace">
    <header className="records-heading"><div><small>RECORDS</small><h2>Grades &amp; assessments</h2><p>Create assessments and record student scores.</p></div></header>
    {error && <p className="records-message error" role="alert">{error}</p>}{message && <p className="records-message" role="status">{message}</p>}
    <div className="records-filters"><ClassPicker classes={classes} value={classId} onChange={setClassId} /></div>
    {loading ? <p aria-live="polite">Loading grade workspace...</p> : !classes.length ? <p className="records-empty">No classes are assigned to your account.</p> : <>
      <form className="records-form records-form-wide" onSubmit={createAssessment}>
        <h3 className="records-wide">Create assessment</h3>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
        <label>Type<select value={type} onChange={(event) => setType(event.target.value as AssessmentRecord['type'])}><option value="test">Test</option><option value="exam">Exam</option><option value="project">Project</option><option value="assignment">Assignment</option></select></label>
        <label>Subject<select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Select subject</option>{subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name} · {subject.code}</option>)}</select></label>
        <label>Term<select required value={term} onChange={(event) => setTerm(event.target.value)}><option value="">Select term</option>{terms.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}</select></label>
        <label>Maximum score<input type="number" min="1" step="any" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} required /></label>
        <label className="records-check"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Publish to students</label>
        <button type="submit" disabled={saving || !subjectId || !term}>{saving ? 'Creating...' : 'Create assessment'}</button>
      </form>
      <form className="records-form" onSubmit={submitGrade}>
        <h3 className="records-wide">Record student grade</h3>
        <label>Assessment<select required value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)}><option value="">Select assessment</option>{assessments.map((item) => <option key={item._id} value={item._id}>{item.title} · {item.maxScore} points</option>)}</select></label>
        <label>Student<select required value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Select student</option>{enrollments.map((item) => <option key={item.studentId._id} value={item.studentId._id}>{studentName(item)}</option>)}</select></label>
        <label>Score<input type="number" min="0" max={selectedAssessment?.maxScore} step="any" value={score} onChange={(event) => setScore(event.target.value)} required /></label>
        <label>Grade<input value={grade} onChange={(event) => setGrade(event.target.value)} /></label>
        <label className="records-wide">Remarks<input value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>
        <button type="submit" disabled={saving || !assessmentId || !studentId}>{saving ? 'Saving...' : 'Save grade'}</button>
      </form>
      {selectedAssessment && <div className="records-table-wrap"><h3>{selectedAssessment.title} · recorded scores</h3><table className="records-table"><thead><tr><th>Student ID</th><th>Score</th><th>Grade</th><th>Remarks</th></tr></thead><tbody>{assessmentGrades.map((item) => <tr key={item._id}><td>{item.studentId}</td><td>{item.score} / {selectedAssessment.maxScore}</td><td>{item.grade || '—'}</td><td>{item.remarks || '—'}</td></tr>)}</tbody></table>{!assessmentGrades.length && <p className="records-empty">No grades have been entered for this assessment.</p>}</div>}
    </>}
  </section>;
}

export function ReportsWorkspace() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function download(report: 'attendance' | 'invoices' | 'cbt-results') {
    setBusy(report); setError('');
    try { await downloadOperationsReport(report); }
    catch (downloadError) { setError(messageText(downloadError, 'Unable to download report')); }
    finally { setBusy(''); }
  }
  return <section className="records-workspace">
    <header className="records-heading"><div><small>OPERATIONS</small><h2>Reports</h2><p>Download current school records as CSV files.</p></div></header>
    {error && <p className="records-message error" role="alert">{error}</p>}
    <div className="report-downloads">{([['attendance', 'Attendance records'], ['invoices', 'Invoices'], ['cbt-results', 'CBT results']] as const).map(([report, label]) => <div className="report-download" key={report}><div><strong>{label}</strong><small>{report}.csv</small></div><button type="button" onClick={() => void download(report)} disabled={Boolean(busy)} aria-label={`Download ${label} CSV`}>{busy === report ? 'Preparing...' : 'Download CSV'}</button></div>)}</div>
  </section>;
}