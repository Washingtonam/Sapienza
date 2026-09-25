import { useEffect, useState } from 'react';
import { createSchoolClass, createSchoolTerm, createSchoolYear, schoolClasses, schoolTerms, schoolYears, type SchoolClass, type SchoolTerm, type SchoolYear } from './api';

export function AcademicSetupPage() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [terms, setTerms] = useState<SchoolTerm[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [yearName, setYearName] = useState('');
  const [yearStart, setYearStart] = useState('');
  const [yearEnd, setYearEnd] = useState('');
  const [termName, setTermName] = useState('First Term');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [className, setClassName] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([schoolYears(), schoolTerms(), schoolClasses()]).then(([yearData, termData, classData]) => {
      if (!active) return;
      setYears(yearData.schoolYears);
      setTerms(termData.terms);
      setClasses(classData.classes);
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

  const yearLabel = (id: string) => years.find((year) => year._id === id)?.name ?? 'School year';
  const dateValue = (date?: string) => date ? new Date(date).toLocaleDateString() : '';

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
        <ul className="academic-record-list">{years.map((year) => <li key={year._id}><span><strong>{year.name}</strong><small>{dateValue(year.startsAt)} – {dateValue(year.endsAt)}</small></span><small>{year.status}</small></li>)}</ul>
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
        <ul className="academic-record-list">{selectedYearTerms.map((term) => <li key={term._id}><span><strong>{term.name}</strong><small>{[dateValue(term.startsAt), dateValue(term.endsAt)].filter(Boolean).join(' – ') || 'Dates not set'}</small></span><small>TERM {term.order}</small></li>)}</ul>
      </section>

      <section className="academic-panel academic-panel-wide">
        <header><small>03 / CLASS LEVELS</small><h2>Add a class</h2></header>
        <form className="academic-class-form" onSubmit={(event) => submit(event, async () => {
          if (!selectedYear) throw new Error('Create or select a school year first');
          await createSchoolClass({ name: className, level: classLevel, schoolYearId: selectedYear });
          setClassName(''); setClassLevel('');
        })}>
          <label>School year<select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} required><option value="">Select a school year</option>{years.map((year) => <option key={year._id} value={year._id}>{year.name}</option>)}</select></label>
          <label>Class name<input placeholder="JSS 1 Blue" value={className} onChange={(event) => setClassName(event.target.value)} required /></label>
          <label>Level<input placeholder="Junior Secondary" value={classLevel} onChange={(event) => setClassLevel(event.target.value)} required /></label>
          <button className="primary" disabled={busy || !selectedYear}>{busy ? 'Saving...' : 'Add class'}</button>
        </form>
        <ul className="academic-record-list academic-class-list">{selectedYearClasses.map((schoolClass) => <li key={schoolClass._id}><span><strong>{schoolClass.name}</strong><small>{schoolClass.level}</small></span><small>{yearLabel(schoolClass.schoolYearId)}</small></li>)}</ul>
      </section>
    </div>
  </section>;
}