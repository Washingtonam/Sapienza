import { useEffect, useMemo, useState } from 'react';
import { addCbtQuestion, cbtExamQuestions, cbtExams, createCbtExam, myCbtResults, schoolClasses, schoolSubjects, startCbtExam, submitCbtExam, type CbtExamRecord, type CbtQuestionRecord, type SchoolClass, type SchoolSubject, type SessionUser } from './api';

const defaultExamForm = () => ({
  title: '',
  instructions: '',
  subjectId: '',
  classId: '',
  durationMinutes: 45,
  startsAt: new Date().toISOString().slice(0, 16),
  endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
  status: 'scheduled' as CbtExamRecord['status'],
  published: true
});

const defaultQuestionForm = () => ({
  questionText: '',
  type: 'multiple_choice' as CbtQuestionRecord['type'],
  options: 'A, B, C, D',
  correctAnswer: '',
  points: 5,
  order: 1
});

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function CbtWorkspace({ user }: { user: SessionUser }) {
  const roles = user.roles?.map((role) => role.name) ?? [];
  const isTeacher = roles.some((role) => ['teacher', 'admin', 'super_admin'].includes(role));
  const isStudent = roles.includes('student');

  const [exams, setExams] = useState<CbtExamRecord[]>([]);
  const [examResults, setExamResults] = useState<Array<{ _id: string; examId?: { _id: string; title: string; subjectId?: { name: string; code?: string } }; score?: number; maxScore?: number; percentage?: number; status?: string; submittedAt?: string }>>([]);
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [questions, setQuestions] = useState<CbtQuestionRecord[]>([]);
  const [examForm, setExamForm] = useState(defaultExamForm());
  const [questionForm, setQuestionForm] = useState(defaultQuestionForm());
  const [attempt, setAttempt] = useState<{ id: string; startedAt: string; status: string } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const selectedExam = useMemo(() => exams.find((exam) => exam._id === selectedExamId) ?? null, [exams, selectedExamId]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      if (isTeacher) {
        const [examData, subjectData, classData] = await Promise.all([cbtExams(), schoolSubjects(), schoolClasses()]);
        setExams(examData.exams);
        setSubjects(subjectData.subjects);
        setClasses(classData.classes);
        return;
      }
      if (isStudent) {
        const [examData, resultData] = await Promise.all([cbtExams(), myCbtResults()]);
        setExams(examData.exams);
        setExamResults(resultData.results);
        return;
      }
      const examData = await cbtExams();
      setExams(examData.exams);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load CBT data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [user.id]);

  async function openExam(examId: string) {
    setSelectedExamId(examId);
    setAttempt(null);
    setResult(null);
    setAnswers({});
    try {
      const data = await cbtExamQuestions(examId);
      setQuestions(data.questions);
      if (isStudent) {
        const started = await startCbtExam(examId);
        setAttempt(started.attempt);
      }
    } catch (examError) {
      setError(examError instanceof Error ? examError.message : 'Unable to open the exam');
    }
  }

  const [result, setResult] = useState<{ score: number; maxScore: number; percentage: number; status: string; submittedAt?: string } | null>(null);

  async function createExam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setStatusMessage('');
    try {
      const payload = {
        ...examForm,
        startsAt: new Date(examForm.startsAt).toISOString(),
        endsAt: new Date(examForm.endsAt).toISOString(),
        subjectId: examForm.subjectId,
        classId: examForm.classId
      };
      const created = await createCbtExam(payload);
      setExams((current) => [created.exam, ...current.filter((exam) => exam._id !== created.exam._id)]);
      setExamForm(defaultExamForm());
      setSelectedExamId(created.exam._id);
      setQuestions([]);
      setStatusMessage('Exam created. Add questions below to make it ready for students.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create exam');
    } finally {
      setSaving(false);
    }
  }

  async function addQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExamId) {
      setError('Choose an exam before adding a question');
      return;
    }
    setSaving(true);
    setError('');
    setStatusMessage('');
    try {
      const payload = {
        ...questionForm,
        options: questionForm.type === 'multiple_choice' ? questionForm.options.split(',').map((value) => value.trim()).filter(Boolean) : questionForm.type === 'true_false' ? ['True', 'False'] : [],
        correctAnswer: questionForm.correctAnswer.trim(),
        points: Number(questionForm.points)
      };
      const created = await addCbtQuestion(selectedExamId, payload);
      setQuestions((current) => [...current, created.question].sort((left, right) => left.order - right.order));
      setQuestionForm(defaultQuestionForm());
      setStatusMessage('Question added to the exam.');
    } catch (questionError) {
      setError(questionError instanceof Error ? questionError.message : 'Unable to add question');
    } finally {
      setSaving(false);
    }
  }

  function updateAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  async function submitAnswers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attempt) {
      setError('Start the exam before submitting your answers.');
      return;
    }
    setSaving(true);
    setError('');
    setStatusMessage('');
    try {
      const payload = questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? ''
      }));
      const response = await submitCbtExam(attempt.id, payload);
      setResult(response.result);
      setAttempt((current) => current ? { ...current, status: response.result.status } : current);
      setStatusMessage(`Submitted. Score: ${response.result.score}/${response.result.maxScore} (${response.result.percentage}%).`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit exam');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="content-manager"><p className="muted">Loading CBT workspace...</p></section>;
  }

  return <section className="content-manager">
    <div className="content-manager-heading">
      <div>
        <small>ASSESSMENTS</small>
        <h2>{isStudent ? 'CBT assessments' : 'Assessment workspace'}</h2>
        <p>{isStudent ? 'Take your available assessments and review your recent results.' : 'Create examinations, add questions, and review completed attempts.'}</p>
      </div>
    </div>

    {error && <p className="content-manager-message error" role="alert">{error}</p>}
    {statusMessage && <p className="content-manager-message" role="status">{statusMessage}</p>}

    {isTeacher && <form className="branding-editor" onSubmit={createExam}>
      <div className="branding-header">
        <div><small>NEW EXAM</small><h3>Create assessment</h3></div>
        <button className="save-content" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save exam'}</button>
      </div>
      <div className="editor-fields">
        <label>Title<input value={examForm.title} onChange={(event) => setExamForm((current) => ({ ...current, title: event.target.value }))} required /></label>
        <label>Duration (minutes)<input type="number" min={1} value={examForm.durationMinutes} onChange={(event) => setExamForm((current) => ({ ...current, durationMinutes: Number(event.target.value) || 1 }))} required /></label>
        <label>Subject<select value={examForm.subjectId} onChange={(event) => setExamForm((current) => ({ ...current, subjectId: event.target.value }))} required>
          <option value="">Select a subject</option>
          {subjects.map((subject) => <option value={subject._id} key={subject._id}>{subject.name} ({subject.code})</option>)}
        </select></label>
        <label>Class<select value={examForm.classId} onChange={(event) => setExamForm((current) => ({ ...current, classId: event.target.value }))} required>
          <option value="">Select a class</option>
          {classes.map((schoolClass) => <option value={schoolClass._id} key={schoolClass._id}>{schoolClass.name} · {schoolClass.level}</option>)}
        </select></label>
        <label>Starts at<input type="datetime-local" value={examForm.startsAt} onChange={(event) => setExamForm((current) => ({ ...current, startsAt: event.target.value }))} required /></label>
        <label>Ends at<input type="datetime-local" value={examForm.endsAt} onChange={(event) => setExamForm((current) => ({ ...current, endsAt: event.target.value }))} required /></label>
        <label>Status<select value={examForm.status} onChange={(event) => setExamForm((current) => ({ ...current, status: event.target.value as CbtExamRecord['status'] }))}><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="open">Open</option><option value="closed">Closed</option></select></label>
        <label className="wide-field">Instructions<textarea rows={4} value={examForm.instructions} onChange={(event) => setExamForm((current) => ({ ...current, instructions: event.target.value }))} /></label>
      </div>
    </form>}

    <div className="content-manager-layout notice-layout">
      <div className="content-editor notice-editor">
        <div><small>{isStudent ? 'AVAILABLE EXAMS' : 'EXAM LIST'}</small><h3>{isStudent ? 'Your assessments' : 'Published assessments'}</h3></div>
        {exams.length ? exams.map((exam) => <button type="button" key={exam._id} className={`managed-list-item${selectedExamId === exam._id ? ' selected' : ''}`} onClick={() => { void openExam(exam._id); }}>
          <strong>{exam.title}</strong>
          <span>{typeof exam.subjectId === 'object' ? exam.subjectId.name : exam.subjectId} · {typeof exam.classId === 'object' ? `${exam.classId.name} ${exam.classId.level ?? ''}`.trim() : exam.classId}</span>
          <small>{exam.status} · {formatDateTime(exam.startsAt)} → {formatDateTime(exam.endsAt)}</small>
        </button>) : <p className="muted">No assessments are available yet.</p>}
      </div>

      <aside className="managed-list notice-list">
        {isStudent && selectedExam && <>
          <div className="managed-list-title"><strong>{selectedExam.title}</strong></div>
          <p className="muted">{selectedExam.instructions || 'No additional instructions.'}</p>
          {questions.length ? <form onSubmit={submitAnswers}> <div className="editor-fields"> {questions.map((question, index) => <div className="wide-field" key={question.id}><label>Question {index + 1} ({question.points} pts)<strong>{question.questionText}</strong></label>
            {question.type === 'multiple_choice' && question.options.map((option) => <label key={option} className="muted"><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={(event) => updateAnswer(question.id, event.target.value)} /> {option}</label>)}
            {question.type === 'true_false' && ['True', 'False'].map((option) => <label key={option} className="muted"><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={(event) => updateAnswer(question.id, event.target.value)} /> {option}</label>)}
            {question.type === 'short_answer' && <textarea rows={3} value={answers[question.id] ?? ''} onChange={(event) => updateAnswer(question.id, event.target.value)} placeholder="Type your answer here" />} 
          </div>)} </div><button className="save-content" type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit answers'}</button></form> : <p className="muted">Open an assessment to load questions.</p>}
          {result && <div className="content-manager-message"><strong>Result:</strong> {result.score}/{result.maxScore} ({result.percentage}%)</div>}
        </>}

        {isTeacher && selectedExam && <>
          <div className="managed-list-title"><strong>Add question</strong></div>
          <form onSubmit={addQuestion} className="content-editor">
            <div className="editor-fields">
              <label className="wide-field">Question<textarea rows={3} value={questionForm.questionText} onChange={(event) => setQuestionForm((current) => ({ ...current, questionText: event.target.value }))} required /></label>
              <label>Type<select value={questionForm.type} onChange={(event) => setQuestionForm((current) => ({ ...current, type: event.target.value as CbtQuestionRecord['type'] }))}><option value="multiple_choice">Multiple choice</option><option value="true_false">True / False</option><option value="short_answer">Short answer</option></select></label>
              <label>Points<input type="number" min={1} value={questionForm.points} onChange={(event) => setQuestionForm((current) => ({ ...current, points: Number(event.target.value) || 1 }))} required /></label>
              {questionForm.type !== 'short_answer' && <label className="wide-field">Options<input value={questionForm.options} onChange={(event) => setQuestionForm((current) => ({ ...current, options: event.target.value }))} placeholder={questionForm.type === 'true_false' ? 'True, False' : 'A, B, C, D'} /></label>}
              <label className="wide-field">Correct answer<input value={questionForm.correctAnswer} onChange={(event) => setQuestionForm((current) => ({ ...current, correctAnswer: event.target.value }))} required /></label>
            </div>
            <button className="save-content" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add question'}</button>
          </form>
          {questions.length > 0 && <div className="managed-list-title"><strong>Exam questions</strong></div>}
          {questions.map((question, index) => <article key={question.id} className="notice-item"><strong>{index + 1}. {question.questionText}</strong><span>{question.type} · {question.points} pts</span><small>{question.options.length ? question.options.join(' | ') : 'Short answer'}</small></article>)}
          {selectedExam && <div className="content-manager-message"><strong>Results:</strong> Results are available from completed CBT attempts for this exam.</div>}
        </>}

        {isStudent && examResults.length > 0 && <div className="managed-list-title"><strong>Recent results</strong></div>}
        {isStudent && examResults.map((entry) => <article key={entry._id} className="notice-item"><strong>{entry.examId?.title ?? 'Assessment'}</strong><span>{entry.percentage ?? 0}%</span><small>{entry.status ?? 'completed'} · {entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : ''}</small></article>)}
      </aside>
    </div>
  </section>;
}
