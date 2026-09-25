import { randomInt } from 'node:crypto';

export async function createStudentLoginCode(codeExists: (code: string) => Promise<boolean>, nextNumber: () => number = () => randomInt(10000000, 100000000)) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `SAP${String(nextNumber()).padStart(8, '0')}`;
    if (!await codeExists(code)) return code;
  }
  return null;
}