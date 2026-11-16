import { validImportedFont, type ImportedFont } from '../brand-settings/model';
import googleFonts from '../brand-settings/fonts/google-fonts.json';

export const textStyles = [
  { id: 'h1', label: 'Heading 1', short: 'H1', size: 32, weight: 600 },
  { id: 'h2', label: 'Heading 2', short: 'H2', size: 24, weight: 600 },
  { id: 'h3', label: 'Heading 3', short: 'H3', size: 20, weight: 600 },
  { id: 'text', label: 'Text', short: 'T', size: 16, weight: 400 },
  { id: 'small', label: 'Small text', short: 'S', size: 12, weight: 400 },
] as const;
export type TextStyleId = typeof textStyles[number]['id'];
export type TextStyle = { size: number; weight: number; color: string };
export const fonts = {
  Arial: { family: 'var(--ui-font)', weights: [400, 500, 600] },
  Georgia: { family: 'Georgia, serif', weights: [400, 700] },
  Helvetica: { family: 'Helvetica, Arial, sans-serif', weights: [400, 700] },
  'System default': { family: 'system-ui, sans-serif', weights: [400, 700] },
} as const;
export type FontName = keyof typeof fonts | 'Custom' | 'Google Fonts';
export type Typography = { font: FontName; customFont?: ImportedFont; googleFont?: string; styles: Record<TextStyleId, TextStyle> };
export const weightNames: Record<number, string> = { 100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };
export const storageKey = 'asset-workspace-typography-v1';
export const brandStorageKey = 'asset-brand-typography-v1';
export function fontDefinition(value: Typography): { name: string; family: string; weights: readonly number[] } {
  if (value.font === 'Google Fonts') {
    const font = googleFonts.find(font => font.name === value.googleFont);
    const available = font?.weights.split(';').map(Number) ?? [400];
    const loaded = available.filter(weight => [400, 500, 600, 700].includes(weight));
    return { name: font?.name ?? 'Arial', family: font ? `"${font.name}", sans-serif` : fonts.Arial.family, weights: loaded.length ? loaded : [available[0]] };
  }
  if (value.font !== 'Custom' || !value.customFont) return { name: value.font === 'Custom' ? 'Arial' : value.font, ...fonts[value.font === 'Custom' ? 'Arial' : value.font] };
  const weights = value.customFont.faces.flatMap(face => {
    const [min, max = min] = face.weight.split(/\s+/).map(Number);
    return min === max ? [min] : Array.from({ length: 9 }, (_, i) => (i + 1) * 100).filter(weight => weight >= min && weight <= max);
  }).filter(weight => weight >= 1 && weight <= 1000);
  return { name: value.customFont.name, family: `"${value.customFont.id}", sans-serif`, weights: [...new Set(weights)].sort((a, b) => a - b) };
}
export function defaultTypography(): Typography {
  return { font: 'Arial', styles: Object.fromEntries(textStyles.map(style => [style.id, { size: style.size, weight: style.weight, color: style.id === 'small' ? 'var(--ui-text-muted)' : 'var(--ui-text)' }])) as Typography['styles'] };
}
export function changeFont(value: Typography, font: FontName, customFont = value.customFont): Typography {
  const next = { ...value, font, ...(customFont ? { customFont } : {}) };
  const weights = fontDefinition(next).weights;
  return { ...next, styles: Object.fromEntries(textStyles.map(({ id }) => [id, { ...value.styles[id], weight: weights.reduce((nearest, weight) => Math.abs(weight - value.styles[id].weight) < Math.abs(nearest - value.styles[id].weight) ? weight : nearest) }])) as Typography['styles'] };
}
export function readTypography(raw: string | null): Typography {
  try {
    const value = JSON.parse(raw ?? 'null') as Typography;
    if (!value || (!['Custom', 'Google Fonts'].includes(value.font) && !Object.hasOwn(fonts, value.font)) || (value.font === 'Google Fonts' && !googleFonts.some(font => font.name === value.googleFont)) || (value.customFont && !validImportedFont(value.customFont)) || (value.font === 'Custom' && !validImportedFont(value.customFont)) || !textStyles.every(({ id }) => {
      const style = value.styles[id];
      return style && Number.isFinite(style.size) && style.size >= 8 && style.size <= 96 && fontDefinition(value).weights.includes(style.weight) && /^(#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})|rgba?\([\d.,%\s]+\)|transparent|var\(--ui-text(?:-muted)?\))$/i.test(style.color);
    })) return defaultTypography();
    return value;
  } catch { return defaultTypography(); }
}
