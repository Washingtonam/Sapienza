import { useEffect, useState } from 'react';
import { createFeeStructure, createFinanceInvoice, feeStructures, financeClasses, financeInvoices, financePayments, financeStudents, type FeeStructureRecord, type FinanceClass, type FinanceInvoice, type FinanceStudent, type PaymentTransaction } from './api';
import './bursar-finance.css';

type FinanceView = 'fees' | 'invoices' | 'payments';
type FeeItemDraft = { name: string; amount: string };

const money = (amount: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount);

export function BursarFinancePage({ view }: { view: FinanceView }) {
  const [classes, setClasses] = useState<FinanceClass[]>([]);
  const [students, setStudents] = useState<FinanceStudent[]>([]);
  const [fees, setFees] = useState<FeeStructureRecord[]>([]);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [schoolYearId, setSchoolYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [feeStructureId, setFeeStructureId] = useState('');
  const [feeName, setFeeName] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<FeeItemDraft[]>([{ name: '', amount: '' }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [classData, studentData, feeData, invoiceData, paymentData] = await Promise.all([financeClasses(), financeStudents(), feeStructures(), financeInvoices(), financePayments()]);
      setClasses(classData.classes);
      setStudents(studentData.students);
      setFees(feeData.feeStructures);
      setInvoices(invoiceData.invoices);
      setPayments(paymentData.payments);
      const activeClass = classData.classes.find((item) => item.schoolYearId.status === 'active') ?? classData.classes[0];
      setSchoolYearId((current) => current || activeClass?.schoolYearId._id || '');
      setClassId((current) => current || activeClass?._id || '');
      setStudentId((current) => current || studentData.students[0]?._id || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load finance records');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const years = [...new Map(classes.map((item) => [item.schoolYearId._id, item.schoolYearId])).values()];
  const classesForYear = classes.filter((item) => item.schoolYearId._id === schoolYearId);
  const selectedStudent = students.find((student) => student._id === studentId);
  const feesForStudent = fees.filter((fee) => fee.classId._id === selectedStudent?.classId?._id);
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  async function submitFee(event: React.FormEvent) {
    event.preventDefault();
    if (!schoolYearId || !classId) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await createFeeStructure({
        name: feeName.trim(), schoolYearId, classId,
        items: items.map((item) => ({ name: item.name.trim(), amount: Number(item.amount) })),
        dueDate: new Date(`${dueDate}T23:59:59`).toISOString()
      });
      setNotice('Fee structure created.');
      setFeeName('');
      setItems([{ name: '', amount: '' }]);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create fee structure');
    } finally {
      setSaving(false);
    }
  }

  async function submitInvoice(event: React.FormEvent) {
    event.preventDefault();
    if (!studentId || !feeStructureId) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await createFinanceInvoice(studentId, feeStructureId);
      setNotice('Invoice created.');
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create invoice');
    } finally {
      setSaving(false);
    }
  }

  const title = view === 'fees' ? 'Fee structures' : view === 'invoices' ? 'Invoices' : 'Payment status';
  const confirmedAmount = payments.filter((payment) => payment.status === 'successful').reduce((sum, payment) => sum + payment.amount, 0);

  return <section className="bursar-workspace">
    <div className="bursar-heading"><div><small>FINANCE OFFICE</small><h2>{title}</h2></div><button type="button" onClick={() => void loadData()} disabled={loading}>Refresh</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="bursar-notice" role="status">{notice}</p>}
    {loading ? <p className="muted" aria-live="polite">Loading finance records...</p> : <>
      {view === 'fees' && <>
        <form className="bursar-form" onSubmit={submitFee}>
          <header><small>FEE SETUP</small><h3>Create a fee structure</h3></header>
          <div className="bursar-form-grid">
            <label>Fee schedule name<input value={feeName} onChange={(event) => setFeeName(event.target.value)} required /></label>
            <label>School year<select value={schoolYearId} onChange={(event) => { const nextYearId = event.target.value; setSchoolYearId(nextYearId); setClassId(classes.find((item) => item.schoolYearId._id === nextYearId)?._id ?? ''); }} required><option value="">Select year</option>{years.map((year) => <option key={year._id} value={year._id}>{year.name}</option>)}</select></label>
            <label>Class<select value={classId} onChange={(event) => setClassId(event.target.value)} required><option value="">Select class</option>{classesForYear.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.level}</option>)}</select></label>
            <label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label>
          </div>
          <div className="bursar-items-heading"><strong>Charge items</strong><button type="button" onClick={() => setItems((current) => [...current, { name: '', amount: '' }])}>Add item</button></div>
          <div className="bursar-items">{items.map((item, index) => <div className="bursar-item-row" key={index}><label>Item name<input value={item.name} onChange={(event) => setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, name: event.target.value } : entry))} required /></label><label>Amount<input type="number" min="0" step="0.01" value={item.amount} onChange={(event) => setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, amount: event.target.value } : entry))} required /></label><button type="button" aria-label={`Remove ${item.name || 'charge item'}`} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, entryIndex) => entryIndex !== index))}>Remove</button></div>)}</div>
          <div className="bursar-form-footer"><strong>Total: {money(total)}</strong><button className="primary" type="submit" disabled={saving || !classId}>{saving ? 'Saving...' : 'Create fee structure'}</button></div>
        </form>
        <div className="bursar-table-wrap"><table className="bursar-table"><thead><tr><th>Fee structure</th><th>School year</th><th>Class</th><th>Due date</th><th>Total</th></tr></thead><tbody>{fees.map((fee) => <tr key={fee._id}><td><strong>{fee.name}</strong><small>{fee.items.map((item) => `${item.name}: ${money(item.amount)}`).join(' · ')}</small></td><td>{fee.schoolYearId.name}</td><td>{fee.classId.name}</td><td>{new Date(fee.dueDate).toLocaleDateString()}</td><td>{money(fee.totalAmount)}</td></tr>)}</tbody></table>{fees.length === 0 && <p className="muted">No fee structures created yet.</p>}</div>
      </>}
      {view === 'invoices' && <>
        <form className="bursar-form bursar-invoice-form" onSubmit={submitInvoice}>
          <header><small>BILLING</small><h3>Create student invoice</h3></header>
          <label>Active student<select value={studentId} onChange={(event) => { setStudentId(event.target.value); setFeeStructureId(''); }} required><option value="">Select student</option>{students.map((student) => <option key={student._id} value={student._id}>{student.userId.firstName} {student.userId.lastName} · {student.admissionNumber}{student.classId ? ` · ${student.classId.name}` : ''}</option>)}</select></label>
          <label>Fee structure<select value={feeStructureId} onChange={(event) => setFeeStructureId(event.target.value)} required><option value="">Select fee structure</option>{feesForStudent.map((fee) => <option key={fee._id} value={fee._id}>{fee.name} · {money(fee.totalAmount)}</option>)}</select></label>
          <button className="primary" type="submit" disabled={saving || !feeStructureId}>{saving ? 'Creating...' : 'Create invoice'}</button>
        </form>
        <InvoiceTable invoices={invoices} />
      </>}
      {view === 'payments' && <>
        <div className="bursar-summary"><div><small>CONFIRMED RECEIPTS</small><strong>{money(confirmedAmount)}</strong></div><div><small>OUTSTANDING</small><strong>{money(invoices.reduce((sum, invoice) => sum + invoice.balance, 0))}</strong></div><div><small>TRANSACTIONS</small><strong>{payments.length}</strong></div></div>
        <PaymentTable payments={payments} />
      </>}
    </>}
  </section>;
}

function PaymentTable({ payments }: { payments: PaymentTransaction[] }) {
  return <div className="bursar-table-wrap"><table className="bursar-table payment-table"><thead><tr><th>Transaction</th><th>Student</th><th>Fee / invoice</th><th>Provider</th><th>Amount</th><th>Recorded</th><th>Status</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment._id}><td><strong>{payment.transactionReference}</strong><small>{payment.paidAt ? `Confirmed ${new Date(payment.paidAt).toLocaleString()}` : `Created ${new Date(payment.createdAt).toLocaleString()}`}</small></td><td>{payment.studentId ? <><strong>{payment.studentId.userId.firstName} {payment.studentId.userId.lastName}</strong><small>{payment.studentId.admissionNumber}</small></> : 'Student record unavailable'}</td><td>{payment.invoiceId?.feeStructureId?.name ?? 'Invoice unavailable'}{payment.invoiceId && <small>{payment.invoiceId.status} · balance {money(payment.invoiceId.balance)}</small>}</td><td>{payment.provider}</td><td>{money(payment.amount)}</td><td>{new Date(payment.createdAt).toLocaleDateString()}</td><td><span className={`invoice-status status-${payment.status}`}>{payment.status}</span></td></tr>)}</tbody></table>{payments.length === 0 && <p className="muted">No payment transactions have been recorded.</p>}</div>;
}

function InvoiceTable({ invoices, showPayments = false }: { invoices: FinanceInvoice[]; showPayments?: boolean }) {
  return <div className="bursar-table-wrap"><table className="bursar-table"><thead><tr><th>Student</th><th>Class</th><th>Fee structure</th><th>Due date</th><th>Amount</th>{showPayments && <><th>Paid</th><th>Balance</th></>}<th>Status</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice._id}><td><strong>{invoice.studentId.userId.firstName} {invoice.studentId.userId.lastName}</strong><small>{invoice.studentId.admissionNumber}</small></td><td>{invoice.studentId.classId?.name ?? 'Unassigned'}</td><td>{invoice.feeStructureId.name}</td><td>{new Date(invoice.dueDate).toLocaleDateString()}</td><td>{money(invoice.amount)}</td>{showPayments && <><td>{money(invoice.amountPaid)}</td><td>{money(invoice.balance)}</td></>}<td><span className={`invoice-status status-${invoice.status}`}>{invoice.status}</span></td></tr>)}</tbody></table>{invoices.length === 0 && <p className="muted">No invoices to show.</p>}</div>;
}