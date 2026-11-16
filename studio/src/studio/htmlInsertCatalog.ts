import { integrations } from '../protos/widget-dropdown/integrations';

export type HtmlInsertCatalogItem = { label: string; icon: string; image?: string };
export type HtmlInsertCatalogGroup = { label: string; items: HtmlInsertCatalogItem[] };
const items = (values: [string, string][]): HtmlInsertCatalogItem[] => values.map(([label, icon]) => ({ label, icon }));
const integrationIcons: Record<string, string> = {
  Video: 'video', Presentations: 'presentation', Documents: 'file-text',
  Spreadsheets: 'table', Files: 'folder', Scheduling: 'calendar',
  Sales: 'receipt-text', Forms: 'clipboard-list', Reports: 'chart-column',
};

/** Exact categories and labels from the reference insertion catalogue. */
export const htmlInsertCatalog: HtmlInsertCatalogGroup[] = [
  { label: 'Quick start', items: items([
    ['Section', 'rectangle-horizontal'], ['Library', 'library'],
    ['Slides', 'presentation'], ['AI Agents', 'bot'],
  ]) },
  { label: 'Basic Blocks', items: items([
    ['Text', 'type'], ['Image', 'image'], ['PDF', 'file-text'], ['File', 'file'],
    ['Link', 'link'], ['Video', 'video'], ['Embed', 'external-link'],
    ['Toggle list', 'list-collapse'], ['Code block', 'code'],
  ]) },
  { label: 'Widgets', items: items([
    ['Table of contents', 'list-tree'], ['Slides', 'presentation'],
    ['Contact cards', 'contact'], ['Table', 'table'], ['CTA', 'mouse-pointer-click'],
    ['Forms', 'clipboard-list'], ['Courses', 'graduation-cap'], ['Security profile', 'shield'],
    ['iFrame', 'panels-top-left'], ['AI widget', 'sparkles'], ['Price cards', 'badge-dollar-sign'],
    ['Sales quote', 'receipt-text'], ['Checklist', 'list-checks'], ['Timeline', 'gantt-chart'],
    ['Project plan', 'list-todo'], ['Kanban', 'columns-3'], ['Plan template', 'layout-template'],
    ['File manager', 'folder'], ['Library list', 'library'],
  ]) },
  ...integrations.map(group => ({ label: group.title, items: group.items.map(item => ({ ...item, icon: integrationIcons[group.title] })) })),
];

export const htmlInsertCategories = [
  { id: 'all', label: 'All categories', groups: [] },
  { id: 'basics', label: 'Basics', groups: ['Quick start', 'Basic Blocks'] },
  { id: 'widgets', label: 'Widgets', groups: ['Widgets'] },
  { id: 'media', label: 'Media', groups: ['Video', 'Presentations'] },
  { id: 'integrations', label: 'Integrations', groups: ['Documents', 'Spreadsheets', 'Files', 'Scheduling', 'Sales', 'Forms', 'Reports'] },
];

export function filterHtmlInsertCatalog(query: string, category = 'all') {
  const normalized = query.trim().toLowerCase();
  const selected = htmlInsertCategories.find(item => item.id === category);
  return htmlInsertCatalog.filter(group => !selected?.groups.length || selected.groups.includes(group.label)).map(group => ({ ...group, items: group.items.filter(item =>
    group.label.toLowerCase().includes(normalized) || item.label.toLowerCase().includes(normalized),
  ) })).filter(group => group.items.length);
}
