import { describe, expect, it } from 'vitest';
import { createStudentLoginCode } from '../src/services/student-login-codes.js';

describe('student login codes', () => {
  it('creates an SAP-prefixed eight-digit code', async () => {
    const code = await createStudentLoginCode(async () => false, () => 12345678);
    expect(code).toBe('SAP12345678');
  });

  it('retries collisions and stops after ten attempts', async () => {
    let checks = 0;
    const code = await createStudentLoginCode(async () => { checks += 1; return checks < 3; }, () => 12345678);
    expect(code).toBe('SAP12345678');
    expect(checks).toBe(3);

    checks = 0;
    const unavailable = await createStudentLoginCode(async () => { checks += 1; return true; }, () => 12345678);
    expect(unavailable).toBeNull();
    expect(checks).toBe(10);
  });
});