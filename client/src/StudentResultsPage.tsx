import { useEffect, useState } from 'react';
import { myReportCards, type StudentReportCard } from './api';

export function StudentResultsPage() {
  const [reportCards, setReportCards] = useState<StudentReportCard[]>([]);
  const [studentId, setStudentId] = useState('');
  const [schoolYearId, setSchoolYearId] = useState('');
  const [term, setTerm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    myReportCards().then(({ reportCards: results }) => {
      if (!active) return;
      setReportCards(results);
      setStudentId((current) => current || results[0]?.studentId._id || '');
      setSchoolYearId((current) => current || results[0]?.schoolYearId._id || '');
      setTerm((current) => current || results[0]?.term || '');
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load results'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const students = [...new Map(reportCards.map((card) => [card.studentId._id, card.studentId])).values()];
  const years = [...new Map(reportCards.filter((card) => card.studentId._id === studentId).map((card) => [card.schoolYearId._id, card.schoolYearId])).values()];
  const terms = [...new Set(reportCards.filter((card) => card.studentId._id === studentId && card.schoolYearId._id === schoolYearId).map((card) => card.term))];
  const result = reportCards.find((card) => card.studentId._id === studentId && card.schoolYearId._id === schoolYearId && card.term === term);
  const studentName = (card: StudentReportCard['studentId']) => card.userId ? `${card.userId.firstName} ${card.userId.lastName}` : card.admissionNumber ?? 'Student';

  return <section className="results-page">
    <div className="results-heading"><div><small>PUBLISHED ACADEMIC RECORD</small><h2>Result checker</h2></div>{result && <span className="published-label">Published {new Date(result.publishedAt).toLocaleDateString()}</span>}</div>
    {loading ? <p className="muted" aria-live="polite">Loading published results...</p> : error ? <p className="form-error" role="alert">{error}</p> : reportCards.length === 0 ? <div className="results-empty"><h3>No published results yet</h3><p className="muted">Your results will appear here after the school publishes them.</p></div> : <>
      <div className="results-filters">
        {students.length > 1 && <label>Student<select value={studentId} onChange={(event) => { setStudentId(event.target.value); const firstCard = reportCards.find((card) => card.studentId._id === event.target.value); setSchoolYearId(firstCard?.schoolYearId._id ?? ''); setTerm(firstCard?.term ?? ''); }}>{students.map((student) => <option key={student._id} value={student._id}>{studentName(student)}</option>)}</select></label>}
        <label>Session<select value={schoolYearId} onChange={(event) => { setSchoolYearId(event.target.value); const firstCard = reportCards.find((card) => card.studentId._id === studentId && card.schoolYearId._id === event.target.value); setTerm(firstCard?.term ?? ''); }}>{years.map((year) => <option key={year._id} value={year._id}>{year.name}</option>)}</select></label>
        <label>Term<select value={term} onChange={(event) => setTerm(event.target.value)}>{terms.map((availableTerm) => <option key={availableTerm}>{availableTerm}</option>)}</select></label>
      </div>
      {result ? <>
        <div className="results-summary"><div><small>STUDENT</small><strong>{studentName(result.studentId)}</strong></div><div><small>CLASS POSITION</small><strong>{result.position ?? '—'}</strong></div><div><small>TERM AVERAGE</small><strong>{result.average.toFixed(2)}%</strong></div></div>
        <div className="results-table-wrap"><table className="results-table"><thead><tr><th>Subject</th><th>Average</th><th>Grade</th></tr></thead><tbody>{result.subjects.map((subject) => <tr key={subject.subjectName}><td>{subject.subjectName}</td><td>{subject.average.toFixed(2)}%</td><td><strong>{subject.grade}</strong></td></tr>)}</tbody></table></div>
        {(result.teacherComment || result.principalComment) && <div className="results-comments">{result.teacherComment && <p><small>CLASS TEACHER</small>{result.teacherComment}</p>}{result.principalComment && <p><small>PRINCIPAL</small>{result.principalComment}</p>}</div>}
      </> : <div className="results-empty"><h3>Result not published</h3><p className="muted">There is no published result for this session and term.</p></div>}
    </>}
  </section>;
}