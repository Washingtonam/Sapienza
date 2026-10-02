import { describe, expect, it } from 'vitest';
import { buildPaystackInitializationPayload } from '../src/routes/finance.js';

describe('paystack payment initialization', () => {
  it('includes the invoice amount, email, reference, and callback URL', () => {
    const payload = buildPaystackInitializationPayload({
      reference: 'SAPZ-INV-100',
      email: 'student@sapienza.edu',
      amount: 125000,
      callbackUrl: 'https://school.example/student/fees'
    });

    expect(payload).toMatchObject({
      email: 'student@sapienza.edu',
      amount: 125000,
      reference: 'SAPZ-INV-100',
      callback_url: 'https://school.example/student/fees'
    });
  });
});
