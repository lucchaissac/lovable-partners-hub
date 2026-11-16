// Demo structure from DOC-7752 and its linked Asset Editor v2 prototype.
export type SectionKind = 'intro' | 'team' | 'tasks' | 'text' | 'image';
export type WorkspaceTask = { id: string; title: string; status: string; owner?: string; date?: string };
export type Section = { id: string; title: string; kind: SectionKind; teamOrder?: string[]; text?: string; textOverrides?: Record<string, string>; tasks?: WorkspaceTask[]; hidden?: boolean };
export type Page = { id: string; title: string; sections: Section[]; externalUrl?: string; icon?: string | null; hidden?: boolean; access?: string; automation?: string };
export type Workspace = { id: string; title: string; status: 'Cold' | 'Hot'; pages: Page[]; account?: { name: string; logo?: string } };

export const INTRO = 'Viva is excited to partner with Acme to drive significant business results across your portfolio of products.';
export const INTRO_DETAIL = 'This workspace includes everything you need to know about Viva as you evaluate our enterprise system and onboard to the platform.';
export const CONTENTS = ['Product overview', 'Business case', 'Sales pilot plan', 'Case studies', 'Pricing proposal', 'Competitor comparison', 'Customer success'];
export const TASKS = ['Platform demo', 'Intro call', 'Proof of Concept (2 weeks)', 'Procurement (Terms, Legal, & Security)', 'Kickoff implementation'];
export const PEOPLE = ['Alex Kracov', 'Gabe Barcelos', 'Madison Kochenderfer'];

export function createWorkspace(id: string, title: string, template = true, status: Workspace['status'] = 'Cold'): Workspace {
  return { id, title, status, account: id === 'ramp' || id === 'renewal' ? { name: 'Ramp', logo: '/avatars/ramp.jpg' } : id === 'onboarding' ? { name: 'Asset' } : undefined, pages: [
    { id: `${id}-summary`, title: 'Summary', sections: template ? [
      { id: `${id}-intro`, title: 'Intro', kind: 'intro' },
      { id: `${id}-team`, title: 'Ramp team', kind: 'team' },
      { id: `${id}-product`, title: 'Ramp overview', kind: 'image' },
      { id: `${id}-tasks`, title: 'Next steps', kind: 'tasks' },
    ] : [] },
    ...(template ? [{ id: `${id}-business`, title: 'Business case', sections: [
      { id: `${id}-opportunity`, title: 'The opportunity', kind: 'text' as const, text: 'Give every team a clearer view of spend. Bring purchasing, approvals, and reporting together so your people can focus on the work that matters.' },
      { id: `${id}-outcomes`, title: 'Expected outcomes', kind: 'text' as const, text: 'Less time on manual reconciliation. Clear ownership for every purchase. Faster approvals with the right controls in place. We’ll establish a baseline together and measure progress during the pilot.' },
      { id: `${id}-pilot`, title: 'Pilot plan', kind: 'text' as const, text: 'Start with a focused team and a two-week pilot. Connect your existing tools, agree on success criteria, and review the results with your stakeholders before expanding.' },
      { id: `${id}-decision`, title: 'Next steps', kind: 'tasks' as const },
    ] }] : []),
  ] };
}

export const initialWorkspaces = () => [
  createWorkspace('ramp', 'Ramp <> LinkedIn'),
  createWorkspace('onboarding', 'Asset Onboarding', true, 'Hot'),
  createWorkspace('renewal', '2026 Renewal'),
];

/** Extra connected workspaces exercise overflow in the editor demo only. */
export const editorDemoWorkspaces = (): Workspace[] => [
  ...initialWorkspaces(),
  createWorkspace('planning', 'Growth planning'),
  createWorkspace('security', 'Security review'),
  createWorkspace('implementation', 'Implementation'),
  createWorkspace('expansion', 'Expansion strategy'),
  createWorkspace('alignment', 'Executive alignment'),
].map(workspace => workspace.id === 'ramp' ? {
  ...workspace,
  pages: [
    ...workspace.pages,
    { id: 'ramp-notes', title: 'Notes', icon: null, sections: [] },
    { id: 'ramp-resources', title: 'Resources', icon: 'book-open', sections: [] },
    { id: 'ramp-timeline', title: 'Timeline', icon: null, sections: [] },
    { id: 'ramp-pricing', title: 'Pricing', icon: 'receipt-text', sections: [] },
    { id: 'ramp-faq', title: 'FAQ', icon: null, sections: [] },
  ],
} : workspace);

/** Move by stable id, without mutating the original list. */
export function reorder<T extends { id: string }>(items: T[], from: string, to: string, edge?: 'before' | 'after'): T[] {
  const source = items.findIndex(item => item.id === from);
  const destination = items.findIndex(item => item.id === to);
  if (source < 0 || destination < 0 || source === destination) return items;
  const next = [...items];
  const [moved] = next.splice(source, 1);
  const insertion = edge ? next.findIndex(item => item.id === to) + (edge === 'after' ? 1 : 0) : destination;
  next.splice(insertion, 0, moved);
  return next;
}

export type Design = {
  header: 'light' | 'dark'; connected: 'dropdown' | 'tabs' | 'none';
  navigation: 'underline' | 'chip' | 'card'; alignment: 'left' | 'center' | 'right';
  shadow: 'none' | 'sm' | 'md'; background: string; section: string;
  accent: string; button: string; buttonText: string; navBackground: string; navText: string;
  sideText: string; sideActiveText?: string; navActiveBackground?: string; navActiveText?: string; navIndicator?: string;
};
export const BRAND_DESIGN: Design = {
  header: 'light', connected: 'dropdown', navigation: 'underline', alignment: 'left', shadow: 'none',
  background: 'var(--ui-bg-subtle)', section: 'var(--ui-bg)', accent: 'var(--ui-accent)',
  button: 'var(--ui-accent)', buttonText: 'var(--ui-bg)', navBackground: 'var(--ui-bg)',
  navText: 'var(--ui-text)', sideText: 'var(--ui-text-muted)',
};
