import { useEffect, useState } from 'react';
import { initializeInvoicePayment, myInvoices, verifyInvoicePayment, type StudentInvoice } from './api';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref: string;
        callback: (response: { reference: string }) => void | Promise<void>;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

const money = (amount: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount);

function loadPaystackScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load the Paystack checkout script'));
    document.body.appendChild(script);
  });
}

export function StudentFeesPage() {
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadInvoices() {
    setLoading(true);
    setError('');
    try {
      const result = await myInvoices();
      setInvoices(result.invoices);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your invoice history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadInvoices(); }, []);

  const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.balance, 0);

  async function handlePayment(invoice: StudentInvoice) {
    setProcessingId(invoice._id);
    setError('');
    setNotice('');
    try {
      const result = await initializeInvoicePayment(invoice._id, invoice.balance);
      if (!result.authorizationUrl) {
        setNotice(result.message ?? 'The payment gateway is not configured yet.');
        return;
      }
      await loadPaystackScript();
      const paystack = window.PaystackPop;
      if (!paystack) {
        throw new Error('The Paystack checkout library is not available right now.');
      }

      const popup = paystack.setup({
        key: result.publicKey ?? '',
        email: result.email ?? 'student@sapienza.edu',
        amount: Math.round(invoice.balance * 100),
        currency: 'NGN',
        ref: result.reference,
        callback: async (response) => {
          setNotice('Payment accepted. Verifying your transaction...');
          const verification = await verifyInvoicePayment(response.reference);
          if (verification.verified && verification.status === 'successful') {
            setNotice('Payment confirmed. Your invoice has been updated.');
          } else {
            setNotice('Your payment was received, but the final status is still being verified.');
          }
          await loadInvoices();
        },
        onClose: () => {
          setNotice('The payment window closed. Your invoice remains available for payment when you are ready.');
        }
      });
      popup.openIframe();
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : 'Unable to start the payment flow');
    } finally {
      setProcessingId(null);
    }
  }

  return <section className="bursar-workspace">
    <div className="bursar-heading">
      <div><small>STUDENT FINANCE</small><h2>School fees</h2></div>
      <button type="button" onClick={() => void loadInvoices()} disabled={loading}>Refresh</button>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="bursar-notice" role="status">{notice}</p>}
    <div className="bursar-summary">
      <div><small>OUTSTANDING</small><strong>{money(totalOutstanding)}</strong></div>
      <div><small>INVOICES</small><strong>{invoices.length}</strong></div>
      <div><small>STATUS</small><strong>{invoices.some((invoice) => invoice.balance > 0) ? 'Pending' : 'Up to date'}</strong></div>
    </div>
    {loading ? <p className="muted" aria-live="polite">Loading your fees...</p> : <div className="bursar-table-wrap"><table className="bursar-table"><thead><tr><th>Fee structure</th><th>Due date</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice._id}><td><strong>{invoice.feeStructureId?.name ?? 'School fee'}</strong></td><td>{new Date(invoice.dueDate).toLocaleDateString()}</td><td>{money(invoice.amount)}</td><td>{money(invoice.amountPaid)}</td><td>{money(invoice.balance)}</td><td><span className={`invoice-status status-${invoice.status}`}>{invoice.status}</span></td><td>{invoice.balance > 0 ? <button type="button" className="primary" disabled={processingId === invoice._id} onClick={() => void handlePayment(invoice)}>{processingId === invoice._id ? 'Processing...' : 'Pay now'}</button> : <span className="muted">Paid</span>}</td></tr>)}</tbody></table>{invoices.length === 0 && <p className="muted">No tuition invoices have been assigned to you yet.</p>}</div>}
  </section>;
}
