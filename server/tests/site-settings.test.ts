import { describe, expect, it } from 'vitest';
import { defaultSchoolSettings, themePresets } from '../src/models/SchoolSettings.js';

describe('school settings defaults', () => {
  it('uses the wine-and-beige brand palette as the default school theme', () => {
    expect(defaultSchoolSettings.themePreset).toBe('wine-and-beige');
    expect(defaultSchoolSettings.palette.primary).toBe('#4F1D2F');
    expect(defaultSchoolSettings.palette.secondary).toBe('#F4E9D8');
    expect(defaultSchoolSettings.palette.accent).toBe('#B77A59');
    expect(defaultSchoolSettings.palette.background).toBe('#F8F4EE');
    expect(themePresets['wine-and-beige'].name).toBe('Wine & Beige');
  });
});
