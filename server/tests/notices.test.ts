import { describe, expect, it } from 'vitest';
import { buildPublicNoticeQuery } from '../src/models/Notice.js';

describe('public notice filters', () => {
  it('includes only published public notices that are active for the current date', () => {
    const now = new Date('2026-10-02T12:00:00.000Z');
    const query = buildPublicNoticeQuery(now);

    expect(query).toMatchObject({
      audience: 'public',
      status: 'published',
      publishAt: { $lte: now }
    });
    expect(query.$or).toEqual([
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } }
    ]);
  });
});
