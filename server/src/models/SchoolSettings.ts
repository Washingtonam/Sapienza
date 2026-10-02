import { Schema, model } from 'mongoose';

export const themePresets = {
  'wine-and-beige': {
    name: 'Wine & Beige',
    palette: {
      primary: '#4F1D2F',
      secondary: '#F4E9D8',
      accent: '#B77A59',
      background: '#F8F4EE',
      text: '#1F2937',
      muted: '#5F6C6D'
    }
  },
  'midnight-ivory': {
    name: 'Midnight Ivory',
    palette: {
      primary: '#0F172A',
      secondary: '#F8F5F0',
      accent: '#C084FC',
      background: '#F4F1EE',
      text: '#0F172A',
      muted: '#475569'
    }
  },
  'forest-gold': {
    name: 'Forest Gold',
    palette: {
      primary: '#173C35',
      secondary: '#F3EAD5',
      accent: '#C79D4A',
      background: '#F5F3EE',
      text: '#1C2A22',
      muted: '#4B5C52'
    }
  },
  'sage-cream': {
    name: 'Sage Cream',
    palette: {
      primary: '#355C4F',
      secondary: '#F5F1E7',
      accent: '#B67852',
      background: '#F7F5F0',
      text: '#23362F',
      muted: '#58716B'
    }
  }
} as const;

export type ThemePresetId = keyof typeof themePresets;

export type SchoolSettingsRecord = {
  themePreset: ThemePresetId;
  schoolName: string;
  tagline: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
  };
};

export const defaultSchoolSettings: SchoolSettingsRecord = {
  themePreset: 'wine-and-beige',
  schoolName: 'SAPIENZA',
  tagline: 'Catholic School',
  palette: { ...themePresets['wine-and-beige'].palette }
};

const paletteSchema = new Schema({
  primary: { type: String, required: true, trim: true },
  secondary: { type: String, required: true, trim: true },
  accent: { type: String, required: true, trim: true },
  background: { type: String, required: true, trim: true },
  text: { type: String, required: true, trim: true },
  muted: { type: String, required: true, trim: true }
}, { _id: false });

const schoolSettingsSchema = new Schema({
  themePreset: { type: String, enum: Object.keys(themePresets), default: defaultSchoolSettings.themePreset },
  schoolName: { type: String, default: defaultSchoolSettings.schoolName, trim: true },
  tagline: { type: String, default: defaultSchoolSettings.tagline, trim: true },
  palette: { type: paletteSchema, default: defaultSchoolSettings.palette },
  status: { type: String, enum: ['draft', 'published'], default: 'published' }
}, { timestamps: true });

export const SchoolSettings = model('SchoolSettings', schoolSettingsSchema);

export function resolveSchoolSettings(input?: {
  themePreset?: string;
  schoolName?: string;
  tagline?: string;
  palette?: Partial<SchoolSettingsRecord['palette']>;
} | null): SchoolSettingsRecord {
  const candidate = input?.themePreset;
  const validThemeKey = candidate && candidate in themePresets ? candidate as ThemePresetId : defaultSchoolSettings.themePreset;
  const basePalette = themePresets[validThemeKey].palette;
  return {
    themePreset: validThemeKey,
    schoolName: input?.schoolName?.trim() || defaultSchoolSettings.schoolName,
    tagline: input?.tagline?.trim() || defaultSchoolSettings.tagline,
    palette: {
      ...basePalette,
      ...(input?.palette ?? {})
    }
  };
}
