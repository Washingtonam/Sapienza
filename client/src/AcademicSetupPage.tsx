import { useEffect, useState } from 'react';
import { assignClassTeacher, createSchoolClass, createSchoolTerm, createSchoolYear, deleteSchoolClass, deleteSchoolTerm, deleteSchoolYear, schoolClasses, schoolTeachers, schoolTerms, schoolYears, updateSchoolClass, updateSchoolTerm, updateSchoolYear, type SchoolClass, type SchoolTerm, type SchoolYear, type TeacherStaff } from './api';
import './class-assignment.css';

export function AcademicSetupPage() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [terms, setTerms] = useState<SchoolTerm[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<TeacherStaff[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [yearName, setYearName] = useState('');
  const [yearStart, setYearStart] = useState('');
  const [yearEnd, setYearEnd] = useState('');
  const [termName, setTermName] = useState('First Term');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [className, setClassName] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingYearId, setEditingYearId] = useState('');
  const [editingYearName, setEditingYearName] = useState('');
  const [editingYearStart, setEditingYearStart] = useState('');
  const [editingYearEnd, setEditingYearEnd] = useState('');
  const [editingYearStatus, setEditingYearStatus] = useState<SchoolYear['status']>('planned');
  const [editingTermId, setEditingTermId] = useState('');
  const [editingTermName, setEditingTermName] = useState('');
  const [editingTermOrder, setEditingTermOrder] = useState(1);
  const [editingTermStart, setEditingTermStart] = useState('');
  const [editingTermEnd, setEditingTermEnd] = useState('');
  const [editingClassId, setEditingClassId] = useState('');
  const [editingClassName, setEditingClassName] = useState('');
  const [editingClassLevel, setEditingClassLevel] = useState('');
  const [editingClassTeacher, setEditingClassTeacher] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([schoolYears(), schoolTerms(), schoolClasses(), schoolTeachers()]).then(([yearData, termData, classData, teacherData]) => {
      if (!active) return;
      setYears(yearData.schoolYears);
      setTerms(termData.terms);
      setClasses(classData.classes);
      setTeachers(teacherData.teachers);
      setSelectedYear((current) => current || yearData.schoolYears[0]?._id || '');
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load academic setup'); });
    return () => { active = false; };
  }, [reloadKey]);

  const selectedYearTerms = terms.filter((term) => term.schoolYearId === selectedYear);
  const selectedYearClasses = classes.filter((schoolClass) => schoolClass.schoolYearId === selectedYear);

  async function submit(event: React.FormEvent, action: () => Promise<unknown>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try { await action(); setReloadKey((key) => key + 1); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to save academic setup'); }
    finally { setBusy(false); }
  }

  async function changeClassTeacher(schoolClass: SchoolClass, teacherId: string) {
    setBusy(true);
    setError('');
    try { await assignClassTeacher(schoolClass._id, teacherId || null); setReloadKey((key) => key + 1); }
    catch (assignmentError) { setError(assignmentError instanceof Error ? assignmentError.message : 'Unable to assign class teacher'); }
    finally { setBusy(false); }
  }

  const yearLabel = (id: string) => years.find((year) => year._id === id)?.name ?? 'School year';
  const dateValue = (date?: string) => date ? new Date(date).toLocaleDateString() : '';
  const dateInputValue = (date?: string) => date ? new Date(date).toISOString().slice(0, 10) : '';

  async function removeRecord(action: () => Promise<unknown>) {
    if (!window.confirm('Delete this academic record? Linked records cannot be deleted.')) return;
    setBusy(true);
    setError('');
    try { await action(); setReloadKey((key) => key + 1); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete academic record'); }
    finally { setBusy(false); }
  }

  return <section className="academic-setup">
    <p className="muted">Configure the school calendar structure used by classes and results.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="academic-year-picker"><label htmlFor="academic-year">School year</label><select id="academic-year" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}><option value="">Select a school year</option>{years.map((year) => <option key={year._id} value={year._id}>{year.name}</option>)}</select></div>
    <div className="academic-setup-grid">
      <section className="academic-panel">
        <header><small>01 / SCHOOL YEARS</small><h2>Add a session</h2></header>
        <form onSubmit={(event) => submit(event, async () => {
          const result = await createSchoolYear({ name: yearName, startsAt: yearStart, endsAt: yearEnd, status: 'planned' });
          setSelectedYear(result.schoolYear._id);
          setYearName(''); setYearStart(''); setYearEnd('');
        })}>
          <label>Session name<input placeholder="2026-2027" value={yearName} onChange={(event) => setYearName(event.target.value)} required /></label>
          <div className="academic-date-fields"><label>Starts<input type="date" value={yearStart} onChange={(event) => setYearStart(event.target.value)} required /></label><label>Ends<input type="date" value={yearEnd} onChange={(event) => setYearEnd(event.target.value)} required /></label></div>
          <button className="primary" disabled={busy}>{busy ? 'Saving...' : 'Add school year'}</button>
        </form>
        <ul className="academic-record-list">{years.map((year) => <li key={year._id}>
          {editingYearId === year._id ? <form className="academic-edit-form" onSubmit={(event) => submit(event, async () => { await updateSchoolYear(year._id, { name: editingYearName, startsAt: editingYearStart, endsAt: editingYearEnd, status: editingYearStatus }); setEditingYearId(''); })}>
            <label>Session name<input value={editingYearName} onChange={(event) => setEditingYearName(event.target.value)} required /></label>
            <label>Starts<input type="date" value={editingYearStart} onChange={(event) => setEditingYearStart(event.target.value)} required /></label>
            <label>Ends<input type="date" value={editingYearEnd} onChange={(event) => setEditingYearEnd(event.target.value)} required /></label>
            <label>Status<select value={editingYearStatus} onChange={(event) => setEditingYearStatus(event.target.value as SchoolYear['status'])}><option value="planned">Planned</option><option value="active">Active</option><option value="closed">Closed</option></select></label>
            <div className="academic-record-actions"><button type="submit" disabled={busy}>Save</button><button type="button" onClick={() => setEditingYearId('')}>Cancel</button></div>
          </form> : <><span><strong>{year.name}</strong><small>{dateValue(year.startsAt)} – {dateValue(year.endsAt)}</small></span><div className="academic-record-actions"><small>{year.status}</small><button type="button" onClick={() => { setEditingYearId(year._id); setEditingYearName(year.name); setEditingYearStart(dateInputValue(year.startsAt)); setEditingYearEnd(dateInputValue(year.endsAt)); setEditingYearStatus(year.status); }}>Edit</button><button type="button" className="danger" disabled={busy} onClick={() => void removeRecord(() => deleteSchoolYear(year._id))}>Delete</button></div></>}
        </li>)}</ul>
      </section>

      <section className="academic-panel">
        <header><small>02 / TERMS</small><h2>Add a term</h2></header>
        <form onSubmit={(event) => submit(event, async () => {
          if (!selectedYear) throw new Error('Create or select a school year first');
          const order = ['First Term', 'Second Term', 'Third Term'].indexOf(termName) + 1;
          await createSchoolTerm({ name: termName, schoolYearId: selectedYear, order, ...(termStart ? { startsAt: termStart } : {}), ...(termEnd ? { endsAt: termEnd } : {}) });
          setTermStart(''); setTermEnd('');
        })}>
          <label>School year<select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} required><option value="">Select a school year</option>{years.map((year) => <option key={year._id} value={year._id}>{year.name}</option>)}</select></label>
          <label>Term<select value={termName} onChange={(event) => setTermName(event.target.value)}>{['First Term', 'Second Term', 'Third Term'].map((name) => <option key={name}>{name}</option>)}</select></label>
          <div className="academic-date-fields"><label>Starts<input type="date" value={termStart} onChange={(event) => setTermStart(event.target.value)} /></label><label>Ends<input type="date" value={termEnd} onChange={(event) => setTermEnd(event.target.value)} /></label></div>
          <button className="primary" disabled={busy || !selectedYear}>{busy ? 'Saving...' : 'Add term'}</button>
        </form>
        <ul className="academic-record-list">{selectedYearTerms.map((term) => <li key={term._id}>
          {editingTermId === term._id ? <form className="academic-edit-form" onSubmit={(event) => submit(event, async () => { await updateSchoolTerm(term._id, { name: editingTermName, order: editingTermOrder, startsAt: editingTermStart || null, endsAt: editingTermEnd || null }); setEditingTermId(''); })}>
            <label>Term name<input value={editingTermName} onChange={(event) => setEditingTermName(event.target.value)} required /></label>
            <label>Order<select value={editingTermOrder} onChange={(event) => setEditingTermOrder(Number(event.target.value))}>{[1, 2, 3].map((order) => <option key={order} value={order}>{order}</option>)}</select></label>
            <label>Starts<input type="date" value={editingTermStart} onChange={(event) => setEditingTermStart(event.target.value)} /></label>
            <label>Ends<input type="date" value={editingTermEnd} onChange={(event) => setEditingTermEnd(event.target.value)} /></label>
            <div className="academic-record-actions"><button type="submit" disabled={busy}>Save</button><button type="button" onClick={() => setEditingTermId('')}>Cancel</button></div>
          </form> : <><span><strong>{term.name}</strong><small>{[dateValue(term.startsAt), dateValue(term.endsAt)].filter(Boolean).join(' – ') || 'Dates not set'}</small></span><div className="academic-record-actions"><small>TERM {term.order}</small><button type="button" onClick={() => { setEditingTermId(term._id); setEditingTermName(term.name); setEditingTermOrder(term.order); setEditingTermStart(dateInputValue(term.startsAt)); setEditingTermEnd(dateInputValue(term.endsAt)); }}>Edit</button><button type="button" className="danger" disabled={busy} onClick={() => void removeRecord(() => deleteSchoolTerm(term._id))}>Delete</button></div></>}
        </li>)}</ul>
      </section>

      <section className="academic-panel academic-panel-wide">
        <header><small>03 / CLASS LEVELS</small><h2>Add a class</h2></header>
        <form className="academic-class-form" onSubmit={(event) => submit(event, async () => {
          if (!selectedYear) throw new Error('Create or select a school year first');
          await createSchoolClass({ name: className, level: classLevel, schoolYearId: selectedYear, ...(classTeacherId ? { classTeacherId } : {}) });
          setClassName(''); setClassLevel(''); setClassTeacherId('');
        })}>
          <label>School year<select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} required><option value="">Select a school year</option>{years.map((year) => <option key={year._id} value={year._id}>{year.name}</option>)}</select></label>
          <label>Class name<input placeholder="JSS 1 Blue" value={className} onChange={(event) => setClassName(event.target.value)} required /></label>
          <label>Level<input placeholder="Junior Secondary" value={classLevel} onChange={(event) => setClassLevel(event.target.value)} required /></label>
          <label>Class teacher<select value={classTeacherId} onChange={(event) => setClassTeacherId(event.target.value)}><option value="">Assign later</option>{teachers.map((teacher) => <option key={teacher._id} value={teacher._id}>{teacher.userId.firstName} {teacher.userId.lastName}</option>)}</select></label>
          <button className="primary" disabled={busy || !selectedYear}>{busy ? 'Saving...' : 'Add class'}</button>
        </form>
        <ul className="academic-record-list academic-class-list">{selectedYearClasses.map((schoolClass) => {
          const currentTeacherId = typeof schoolClass.classTeacherId === 'string' ? schoolClass.classTeacherId : schoolClass.classTeacherId?._id ?? '';
          return <li key={schoolClass._id}>
            {editingClassId === schoolClass._id ? <form className="academic-edit-form" onSubmit={(event) => submit(event, async () => { await updateSchoolClass(schoolClass._id, { name: editingClassName, level: editingClassLevel, classTeacherId: editingClassTeacher || null }); setEditingClassId(''); })}>
              <label>Class name<input value={editingClassName} onChange={(event) => setEditingClassName(event.target.value)} required /></label>
              <label>Level<input value={editingClassLevel} onChange={(event) => setEditingClassLevel(event.target.value)} required /></label>
              <label>Class teacher<select value={editingClassTeacher} onChange={(event) => setEditingClassTeacher(event.target.value)}><option value="">Unassigned</option>{teachers.map((teacher) => <option key={teacher._id} value={teacher._id}>{teacher.userId.firstName} {teacher.userId.lastName}</option>)}</select></label>
              <div className="academic-record-actions"><button type="submit" disabled={busy}>Save</button><button type="button" onClick={() => setEditingClassId('')}>Cancel</button></div>
            </form> : <><span><strong>{schoolClass.name}</strong><small>{schoolClass.level} · {yearLabel(schoolClass.schoolYearId)}</small></span><label className="class-teacher-picker"><span>Class teacher</span><select value={currentTeacherId} onChange={(event) => void changeClassTeacher(schoolClass, event.target.value)} disabled={busy}><option value="">Unassigned</option>{teachers.map((teacher) => <option key={teacher._id} value={teacher._id}>{teacher.userId.firstName} {teacher.userId.lastName}</option>)}</select></label><div className="academic-record-actions"><button type="button" onClick={() => { setEditingClassId(schoolClass._id); setEditingClassName(schoolClass.name); setEditingClassLevel(schoolClass.level); setEditingClassTeacher(currentTeacherId); }}>Edit</button><button type="button" className="danger" disabled={busy} onClick={() => void removeRecord(() => deleteSchoolClass(schoolClass._id))}>Delete</button></div></>}
          </li>;
        })}</ul>
      </section>
    </div>
  </section>;
}