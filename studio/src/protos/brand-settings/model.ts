import type { Typography } from '../workspace-typography/model';

export type BrandPage = 'experiences' | 'welcome' | 'thumbnail' | 'logo' | 'advanced';
export type ExperiencePanel = 'header' | 'cover' | 'top' | 'side' | 'background' | 'sections' | 'buttons' | 'typography';
export type WelcomeScope = 'workspaces' | 'library';
export type WelcomeSettings = { message: string; button: string; background: string; companyLogo: boolean; accountLogo: boolean; poweredBy: boolean };
export type ImportedFont = { id: string; name: string; source: string; faces: { dataUrl: string; weight: string; style: string; unicodeRange?: string }[] };
export type BrandTheme = {
  header: 'light' | 'dark'; connected: 'dropdown' | 'tabs'; cover: 'blue' | 'sand' | 'green' | 'none'; coverImage: string;
  navBackground: string; navText: string; alignment: 'left' | 'center' | 'right'; navShadow: 'none' | 'soft' | 'strong'; navigation: 'tabs' | 'pills' | 'underline';
  sideText: string; sideActive: string; background: string; sectionBackground: string; sectionRadius: number; sectionBorder: number; sectionBorderColor: string; sectionShadow: 'none' | 'soft' | 'strong' | 'retro';
  accent: string; buttonBackground: string; buttonText: string; font: 'Arial' | 'System default' | 'Georgia' | 'Helvetica' | 'Custom' | 'Google Fonts';
  customFont?: ImportedFont; googleFont?: string;
  textStyles?: Typography['styles'];
  welcome: Record<WelcomeScope, WelcomeSettings>;
  thumbnailLayout: 'left' | 'center' | 'compact'; thumbnailType: 'color' | 'image'; thumbnailColor: string; thumbnailImage: string; thumbnailText: string; thumbnailCompany: boolean; thumbnailAccount: boolean; thumbnailPoweredBy: boolean;
  logo: string; wordmark: string; showLogo: boolean; showWordmark: boolean; assetBranding: boolean; allowCustomization: boolean;
};

export const DEFAULT_THEME: BrandTheme = {
  header: 'light', connected: 'dropdown', cover: 'none', coverImage: '',
  navBackground: '#FFFFFF', navText: '#121722', alignment: 'left', navShadow: 'none', navigation: 'underline',
  sideText: '#5F5F5F', sideActive: '#121722', background: '#FAF9F6', sectionBackground: '#FFFFFF', sectionRadius: 16, sectionBorder: 0, sectionBorderColor: '#DCDCDC', sectionShadow: 'soft',
  accent: '#0068F9', buttonBackground: '#0068F9', buttonText: '#FFFFFF', font: 'Arial',
  welcome: {
    workspaces: { message: '', button: 'View workspace', background: '#FFFFFF', companyLogo: true, accountLogo: false, poweredBy: false },
    library: { message: '', button: 'Explore library', background: '#FFFFFF', companyLogo: true, accountLogo: false, poweredBy: false },
  },
  thumbnailLayout: 'left', thumbnailType: 'image', thumbnailColor: '#0068F9', thumbnailImage: '', thumbnailText: '#FFFFFF', thumbnailCompany: true, thumbnailAccount: true, thumbnailPoweredBy: false,
  logo: '', wordmark: '', showLogo: true, showWordmark: true, assetBranding: true, allowCustomization: true,
};

export const STORAGE_KEY = 'asset-proto-brand-settings-v1';
export const BRAND_PAGES: { id: BrandPage; label: string; icon: string; title: string }[] = [
  { id: 'experiences', label: 'Experiences', icon: 'panels-top-left', title: 'Workspaces, playbooks, and courses' },
  { id: 'welcome', label: 'Welcome page', icon: 'file-text', title: 'Welcome page' },
  { id: 'thumbnail', label: 'Thumbnail', icon: 'image', title: 'Workspace and playbook thumbnail' },
  { id: 'logo', label: 'Logo', icon: 'shapes', title: 'Logo' },
  { id: 'advanced', label: 'Advanced', icon: 'settings', title: 'Advanced' },
];
export const PANELS: { id: ExperiencePanel; label: string; icon: string }[] = [
  { id: 'header', label: 'Header', icon: 'panels-top-left' }, { id: 'cover', label: 'Cover', icon: 'image' },
  { id: 'top', label: 'Top navigation', icon: 'layout-template' }, { id: 'side', label: 'Side navigation', icon: 'panel-left' },
  { id: 'background', label: 'Background', icon: 'paintbrush-vertical' }, { id: 'sections', label: 'Sections', icon: 'layout-grid' },
  { id: 'buttons', label: 'Buttons', icon: 'square-pen' }, { id: 'typography', label: 'Typography', icon: 'type' },
];
export const FONT_FAMILIES = {
  Arial: 'var(--ui-font)', 'System default': 'system-ui, sans-serif', Georgia: 'Georgia, serif', Helvetica: 'Helvetica, Arial, sans-serif',
};
export function fontFamily(theme: BrandTheme): string {
  if (theme.font === 'Custom' && theme.customFont) return `"${theme.customFont.id}", sans-serif`;
  if (theme.font === 'Google Fonts' && theme.googleFont) return `"${theme.googleFont.replace(/["\\]/g, '')}", sans-serif`;
  return FONT_FAMILIES[theme.font as keyof typeof FONT_FAMILIES] ?? FONT_FAMILIES.Arial;
}
export function validImportedFont(value: unknown): value is ImportedFont {
  if (!value || typeof value !== 'object') return false;
  const font = value as ImportedFont;
  return typeof font.id === 'string' && /^AssetBrandFont_[a-z\d-]+$/i.test(font.id) && typeof font.name === 'string' && font.name.length < 160 && typeof font.source === 'string' && Array.isArray(font.faces) && font.faces.length > 0 && font.faces.length <= 48 && font.faces.every(face =>
    typeof face.dataUrl === 'string' && /^data:font\/woff2?;base64,[a-z\d+/=]+$/i.test(face.dataUrl) && typeof face.weight === 'string' && /^\d{1,4}(?:\s+\d{1,4})?$/.test(face.weight) && typeof face.style === 'string' && /^(normal|italic|oblique(?:\s+-?[\d.]+deg){0,2})$/.test(face.style) && (face.unicodeRange === undefined || typeof face.unicodeRange === 'string' && /^[uU+\d\da-fA-F?,\s-]+$/.test(face.unicodeRange))) && JSON.stringify(font).length < 3_000_000;
}
export const SHADOWS = { none: 'none', soft: '0 2px 5px rgba(18,23,34,.07)', strong: '0 8px 20px rgba(18,23,34,.14)', retro: '5px 5px 0 #121722' };

/** Only accept the shape this prototype writes; stale/corrupt local data falls back safely. */
function hasDefaultShape(value: unknown, sample: unknown): boolean {
  if (typeof sample === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (sample && typeof sample === 'object') return !!value && typeof value === 'object' && Object.entries(sample).every(([key, entry]) => hasDefaultShape((value as Record<string, unknown>)[key], entry));
  return typeof value === typeof sample;
}
export function loadTheme(): BrandTheme {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!hasDefaultShape(stored, DEFAULT_THEME)) return structuredClone(DEFAULT_THEME);
    const theme = stored as BrandTheme;
    if (!['light', 'dark'].includes(theme.header) || !['tabs', 'dropdown'].includes(theme.connected) || ![...Object.keys(FONT_FAMILIES), 'Custom', 'Google Fonts'].includes(theme.font) || !Object.hasOwn(SHADOWS, theme.sectionShadow) || !Object.hasOwn(SHADOWS, theme.navShadow)) return structuredClone(DEFAULT_THEME);
    if (theme.customFont && !validImportedFont(theme.customFont)) delete theme.customFont;
    if (theme.font === 'Custom' && !theme.customFont || theme.font === 'Google Fonts' && (typeof theme.googleFont !== 'string' || !/^[\w\s-]{1,100}$/.test(theme.googleFont))) theme.font = 'Arial';
    if (theme.textStyles && !['h1', 'h2', 'h3', 'text', 'small'].every(id => {
      const style = theme.textStyles?.[id as keyof Typography['styles']];
      return style && Number.isFinite(style.size) && style.size >= 8 && style.size <= 96 && Number.isFinite(style.weight) && style.weight >= 1 && style.weight <= 1000 && /^(#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})|rgba?\([\d.,%\s]+\)|transparent|var\(--ui-text(?:-muted)?\))$/i.test(style.color);
    })) delete theme.textStyles;
    return theme;
  } catch { return structuredClone(DEFAULT_THEME); }
}
