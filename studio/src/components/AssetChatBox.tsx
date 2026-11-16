/**
 * AssetChatBox — the rich Asset AI composer extracted for reuse.
 *
 * Bundles the Composer with: leading "Add source" + "Pick agent" buttons,
 * the @-mention popup (sectioned: agents / sources / Create agent), a
 * removable selected-agent pill in place of "Pick agent", and the
 * click-outside / keyboard-nav / submenu plumbing.
 *
 * State that's intrinsic to the chat box (mention popup, popup position,
 * source-picker open) is owned here. Anything the surrounding page cares
 * about — text value, pinned agent, attached source — is lifted via
 * controlled props.
 */
import {
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Composer, ComposerSelection, Dropdown, ChatBoxTray, Tooltip, Dialog, DialogHeader, DialogBody } from '@asset/ui';
import type { DropdownItem, ChatBoxTrayProps } from '@asset/ui';
import { Icon } from './Icon';
import { MiniAgentIcon, type AgentTone } from './MiniAgentIcon';
import { PickAgentIcon } from './PickAgentIcon';
import { SourceMenuContent, ConnectorMenuContent, DEFAULT_CONNECTED_CONNECTORS, type SourceMenuItem } from './SourceMenuContent';
import { useSubmenuHover } from './useSubmenuHover';

// ============================================================
// Vendor logo (PNG) used for the source list and source mentions.
// ============================================================

function VendorLogo({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <img
      src={`/icons/${name}.png`}
      width={size}
      height={size}
      alt=""
      style={{ display: 'block', borderRadius: 4 }}
    />
  );
}

// Shared source menu: a compact, adjacent connector flyout with a fixed footer.
export function AddSourceMenu({ trigger, onSelect, tooltip, accountPicker, items, connectors = true }: {
  trigger: ReactElement;
  onSelect?: (id: string) => void;
  tooltip?: string;
  items?: SourceMenuItem[];
  connectors?: boolean;
  /** Optional account selection view, anchored to the same + button. */
  accountPicker?: (onClose: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  // These are local demo preferences; no external connector is authorized here.
  const [connected, setConnected] = useState(() => new Set(DEFAULT_CONNECTED_CONNECTORS));
  const [enabled, setEnabled] = useState(() => new Set(DEFAULT_CONNECTED_CONNECTORS));
  const triggerWrapRef = useRef<HTMLDivElement | null>(null);
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const { triggerRef: connectorsRef, menuRef: subContentRef, onTriggerEnter, inTransit } = useSubmenuHover(open && subOpen, setSubOpen);
  const [mainPos, setMainPos] = useState({ side: 'bottom', top: 0, left: 0, maxHeight: 0 });
  const [subPos, setSubPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const trigger = triggerWrapRef.current?.getBoundingClientRect();
      const panel = mainContentRef.current;
      if (!trigger || !panel) return;
      const rect = panel.getBoundingClientRect();
      const list = panel.querySelector<HTMLElement>('.asset-source-menu-list');
      const footer = panel.querySelector<HTMLElement>('.ui-dropdown-footer');
      const naturalHeight = list ? list.scrollHeight + (footer?.offsetHeight ?? 0) : rect.height;
      const below = window.innerHeight - trigger.bottom - 12;
      const above = trigger.top - 12;
      const flip = naturalHeight > below && above > below;
      const maxHeight = Math.max(0, flip ? above : below);
      setMainPos({
        side: flip ? 'top' : 'bottom',
        top: Math.max(8, flip ? trigger.top - 4 - Math.min(naturalHeight, maxHeight) : trigger.bottom + 4),
        left: Math.max(8, Math.min(trigger.left, window.innerWidth - rect.width - 8)),
        maxHeight,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    if (mainContentRef.current) observer.observe(mainContentRef.current);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, accountOpen, enabled]);

  useLayoutEffect(() => {
    if (!subOpen) return;
    const update = () => {
      const main = mainContentRef.current?.getBoundingClientRect();
      const sub = subContentRef.current?.getBoundingClientRect();
      if (!main || !sub) return;
      const left = window.innerWidth - main.right < sub.width + 8 ? main.left - sub.width : main.right;
      setSubPos({
        top: Math.max(8, Math.min(main.bottom - sub.height, window.innerHeight - sub.height - 8)),
        left: Math.max(8, Math.min(left, window.innerWidth - sub.width - 8)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    if (subContentRef.current) observer.observe(subContentRef.current);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [subOpen, mainPos]);

  useEffect(() => {
    if (!open) { setSubOpen(false); setAccountOpen(false); return; }
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerWrapRef.current?.contains(target) || mainContentRef.current?.contains(target) || subContentRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const choose = (id: string) => { onSelect?.(id); setOpen(false); };
  const toggle = (id: string, value: boolean) => setEnabled(previous => {
    const next = new Set(previous);
    if (value) next.add(id); else next.delete(id);
    return next;
  });
  const connect = (id: string) => { setConnected(previous => new Set(previous).add(id)); toggle(id, true); };
  const triggerEl = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<{ onClick?: () => void; active?: boolean }>, { onClick: () => setOpen(value => !value), active: open })
    : trigger;

  return <div ref={triggerWrapRef} className="ui-dropdown-root" style={{ display: 'inline-flex' }}>
    {tooltip ? <Tooltip label={tooltip} side="top" maxWidth={320} enabled={!open}>{triggerEl}</Tooltip> : triggerEl}
    {open && createPortal(<div ref={mainContentRef} className="ui-dropdown-content asset-source-menu" data-side={mainPos.side} data-align="start" data-fit data-submenu-transit={inTransit || undefined}
      style={{ position: 'fixed', top: mainPos.top, bottom: 'auto', left: mainPos.left, right: 'auto', maxHeight: mainPos.maxHeight || undefined }}>
      {accountOpen && accountPicker ? accountPicker(() => setOpen(false)) : <SourceMenuContent enabled={enabled} onSelect={choose} items={items} connectors={connectors}
        onAccount={accountPicker ? () => { setSubOpen(false); setAccountOpen(true); } : undefined}
        connectorsOpen={subOpen} connectorsRef={connectorsRef} onConnectorsHover={onTriggerEnter} onConnectors={() => setSubOpen(true)} />}
    </div>, document.body)}
    {open && subOpen && createPortal(<div ref={subContentRef} className="ui-dropdown-content asset-source-menu" data-fit
      style={{ position: 'fixed', top: subPos.top, bottom: 'auto', left: subPos.left, right: 'auto', maxHeight: 'calc(100vh - 16px)' }}>
      <ConnectorMenuContent connected={connected} enabled={enabled} onToggle={toggle} onConnect={connect} onManage={() => { setOpen(false); setManageOpen(true); }} />
    </div>, document.body)}
    {manageOpen && createPortal(<Dialog open onClose={() => setManageOpen(false)} ariaLabel="Manage Connectors">
      <DialogHeader title="Manage Connectors" onClose={() => setManageOpen(false)} />
      <DialogBody><ConnectorMenuContent connected={connected} enabled={enabled} onToggle={toggle} onConnect={connect} /></DialogBody>
    </Dialog>, document.body)}
  </div>;
}

// ============================================================
// Mention data — the same 4 agents + 4 source quick-actions appear in
// every chat box. Exported so consumers can render the agent tag for
// a pinned agent without re-deriving the metadata.
// ============================================================

export type MentionAgent = { id: string; label: string; icon: string; tone: AgentTone };

export const MENTION_AGENTS: MentionAgent[] = [
  { id: 'customer-success', label: 'Customer Success', icon: 'circle-user', tone: 'mint' },
  { id: 'product', label: 'Product questions', icon: 'bot', tone: 'blue' },
  { id: 'objection', label: 'Objection handling', icon: 'message-square', tone: 'cream' },
  { id: 'deal', label: 'Deal Agent', icon: 'diamond', tone: 'pink' },
];

export const MENTION_AGENT_BY_ID: Record<string, MentionAgent> = Object.fromEntries(
  MENTION_AGENTS.map((a) => [a.id, a]),
);

type MentionSourceItem = {
  id: string;
  label: string;
  icon: string;
  iconKind: 'icon' | 'image';
};

const MENTION_SOURCES: MentionSourceItem[] = [
  { id: 'src-files', label: 'Add files', icon: 'attach', iconKind: 'icon' },
  { id: 'src-text', label: 'Add text', icon: 'text', iconKind: 'icon' },
  { id: 'src-library', label: 'Add from Library', icon: 'layout-grid', iconKind: 'icon' },
  { id: 'src-chorus', label: 'From Chorus', icon: 'chorus', iconKind: 'image' },
];

type MentionFlatItem =
  | { kind: 'agent'; section: 'agent'; id: string; label: string; icon: string; tone: AgentTone }
  | { kind: 'source'; section: 'source'; id: string; label: string; icon: string; iconKind: 'icon' | 'image' }
  | { kind: 'action'; section: 'action'; id: string; label: string; icon: string };

// ============================================================
// Caret-position mirror — pixel-locates the @ character in the textarea
// so the mention popup sits flush against it.
// ============================================================

const CARET_MIRROR_PROPS = [
  'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderStyle',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust',
  'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'textDecoration',
  'letterSpacing', 'wordSpacing', 'tabSize',
] as const;

function getCaretCoordinates(
  el: HTMLTextAreaElement,
  position: number,
): { top: number; left: number; height: number } {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const computed = window.getComputedStyle(el);
  const s = div.style;
  s.position = 'absolute';
  s.visibility = 'hidden';
  s.top = '0';
  s.left = '0';
  s.whiteSpace = 'pre-wrap';
  s.wordWrap = 'break-word';
  s.overflow = 'hidden';
  for (const p of CARET_MIRROR_PROPS) {
    (s as unknown as Record<string, string>)[p] = (computed as unknown as Record<string, string>)[p];
  }
  div.textContent = el.value.substring(0, position);
  const span = document.createElement('span');
  span.textContent = el.value.substring(position) || '.';
  div.appendChild(span);
  const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2;
  const coords = {
    top: span.offsetTop + parseFloat(computed.borderTopWidth),
    left: span.offsetLeft + parseFloat(computed.borderLeftWidth),
    height: lineHeight,
  };
  document.body.removeChild(div);
  return coords;
}

// ============================================================
// AssetChatBox — the public component.
// ============================================================

// Reused across every AI surface that exposes a chat box.
export const ASSET_AI_NOTICE =
  'Asset AI can make mistakes. Always review outputs before sending to customers.';

export type AssetChatBoxProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** When set, replaces Pick agent with a removable selected-agent pill. */
  activeAgent?: string | null;
  /** Called when the user picks an agent (dropdown, @-mention, or × on the pill). */
  onActiveAgentChange?: (id: string | null) => void;
  /** Opens the surrounding surface's agent creation flow. */
  onCreateAgent?: () => void;
  /** Called when the user attaches a source via the Add source menu or @-mention. */
  onSourceAdd?: (id: string) => void;
  /** Called when the user submits (Enter without modifier). */
  onSend?: () => void;
  onStop?: () => void;
  sendLabel?: string;
  context?: ReactNode;
  attachments?: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  /** Replace the default source and agent controls for a specialized chat. */
  leading?: ReactNode;
  /** Replace only Add source, retaining Pick agent. */
  sourceTrigger?: ReactNode;
  /** Additional controls between Add source and Pick agent. */
  afterSource?: ReactNode;
  mentions?: boolean;
  /** Override the list of agents shown in the @-mention popup. Defaults to
   *  the 4 Asset-shipped agents (MENTION_AGENTS). Pass the full agent list
   *  here when the consuming surface has more agents to expose. */
  agents?: MentionAgent[];
  /** When set, splits the @-mention popup into "Pinned agents" + "Agents",
   *  with anything in this set rendered first. */
  pinnedAgentIds?: ReadonlySet<string>;
  /** Renders the discreet "Asset AI can make mistakes…" line below the
   *  composer. Opt-in so comment / non-AI surfaces using AssetChatBox
   *  stay clean. */
  aiNotice?: boolean;
  /** Optional recessed footer with Browse agents and Quick actions. */
  tray?: ChatBoxTrayProps;
};

export function AssetChatBox({
  value,
  onChange,
  placeholder = 'Ask an @Agent, or message',
  activeAgent = null,
  onActiveAgentChange,
  onCreateAgent,
  onSourceAdd,
  onSend,
  onStop,
  sendLabel,
  context,
  attachments,
  pending,
  disabled,
  leading,
  sourceTrigger,
  afterSource,
  mentions = true,
  agents = MENTION_AGENTS,
  pinnedAgentIds,
  aiNotice = false,
  tray,
}: AssetChatBoxProps) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionMode, setMentionMode] = useState<'agent' | 'source' | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  type MentionAnchor = {
    /** Caret top, in the composer wrap's coordinate system. */
    topInWrap: number;
    /** Caret bottom, in the wrap's coordinate system. */
    bottomInWrap: number;
    /** Caret left, in the wrap's coordinate system. */
    left: number;
    /** Wrap's full height, used to convert to a CSS `bottom` offset when flipping up. */
    wrapHeight: number;
    /** Caret top in viewport coords — used to decide if there's room above. */
    screenTop: number;
    /** Caret bottom in viewport coords — used to decide if there's room below. */
    screenBottom: number;
  };
  const [mentionAnchor, setMentionAnchor] = useState<MentionAnchor | null>(null);
  const [mentionPos, setMentionPos] = useState<{
    top: number | 'auto';
    bottom: number | 'auto';
    left: number;
  }>({ top: 0, bottom: 'auto', left: 0 });
  const [mentionActive, setMentionActive] = useState(0);
  const composerWrapRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionPopRef = useRef<HTMLDivElement | null>(null);

  const agentById = useMemo<Record<string, MentionAgent>>(
    () => ({
      ...MENTION_AGENT_BY_ID,
      ...Object.fromEntries(agents.map((a) => [a.id, a])),
    }),
    [agents],
  );
  const activeAgentMeta = activeAgent ? agentById[activeAgent] ?? null : null;

  // Items for the "Pick agent" dropdown: Create agent → favorites → all agents.
  // The Dropdown component prunes orphan headers/separators when the search filter
  // empties a section, so an empty pinned section disappears cleanly.
  const agentDropdownItems = useMemo<DropdownItem[]>(() => {
    const list: DropdownItem[] = [];
    list.push({
      id: 'create',
      label: 'Create agent', sticky: true,
      leadingIcon: <Icon name="plus" size={14} />,
      alwaysShow: true,
    });
    list.push({ kind: 'separator', alwaysShow: true });
    const pinnedSet = pinnedAgentIds ?? new Set<string>();
    const pinned = agents.filter((a) => pinnedSet.has(a.id));
    const others = agents.filter((a) => !pinnedSet.has(a.id));
    const toItem = (a: MentionAgent): DropdownItem => ({
      id: a.id,
      label: a.label,
      leadingIcon: <MiniAgentIcon icon={a.icon} tone={a.tone} size={16} />,
    });
    if (pinned.length > 0) {
      list.push({ kind: 'header', label: 'Favorite agents' });
      pinned.forEach((a) => list.push(toItem(a)));
    }
    if (others.length > 0) {
      if (pinned.length > 0) list.push({ kind: 'separator' });
      list.push({ kind: 'header', label: 'Agents' });
      others.forEach((a) => list.push(toItem(a)));
    }
    return list;
  }, [agents, pinnedAgentIds]);

  const filteredMentionSections = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    const matches = (label: string) => !q || label.toLowerCase().includes(q);
    const allAgents = mentionMode === 'agent' ? agents.filter((a) => matches(a.label)) : [];
    const pinned = pinnedAgentIds
      ? allAgents.filter((a) => pinnedAgentIds.has(a.id))
      : [];
    const otherAgents = pinnedAgentIds
      ? allAgents.filter((a) => !pinnedAgentIds.has(a.id))
      : allAgents;
    const sources = mentionMode === 'source' ? MENTION_SOURCES.filter((s) => matches(s.label)) : [];
    const actions =
      mentionMode === 'agent' && matches('Create agent')
        ? [{ id: 'create', label: 'Create agent', sticky: true, icon: 'plus' }]
        : [];
    return { pinnedAgents: pinned, agents: otherAgents, sources, actions };
  }, [mentionQuery, mentionMode, agents, pinnedAgentIds]);

  const flatMentionItems = useMemo<MentionFlatItem[]>(() => {
    const out: MentionFlatItem[] = [];
    filteredMentionSections.pinnedAgents.forEach((a) =>
      out.push({
        kind: 'agent',
        section: 'agent',
        id: a.id,
        label: a.label,
        icon: a.icon,
        tone: a.tone,
      }),
    );
    filteredMentionSections.agents.forEach((a) =>
      out.push({
        kind: 'agent',
        section: 'agent',
        id: a.id,
        label: a.label,
        icon: a.icon,
        tone: a.tone,
      }),
    );
    filteredMentionSections.sources.forEach((s) =>
      out.push({
        kind: 'source',
        section: 'source',
        id: s.id,
        label: s.label,
        icon: s.icon,
        iconKind: s.iconKind,
      }),
    );
    filteredMentionSections.actions.forEach((a) =>
      out.push({ kind: 'action', section: 'action', id: a.id, label: a.label, icon: a.icon }),
    );
    return out;
  }, [filteredMentionSections]);

  useEffect(() => {
    setMentionActive(0);
  }, [mentionQuery, mentionOpen]);

  /** Pick top vs bottom anchor: keep below the caret unless the popup
   *  would clip and there's more room above. Uses a generous height
   *  floor so the side decision stays consistent across filter states
   *  (empty-state popup is ~50px, full list ~260px — without a floor
   *  the popup would jump direction mid-typing). */
  const positionForAnchor = (
    anchor: MentionAnchor,
    popupHeight: number,
  ): { top: number | 'auto'; bottom: number | 'auto'; left: number } => {
    const need = Math.max(popupHeight, 280) + 8;
    const spaceBelow = window.innerHeight - anchor.screenBottom;
    const spaceAbove = anchor.screenTop;
    const flipUp = spaceBelow < need && spaceAbove > spaceBelow;
    if (flipUp) {
      return {
        top: 'auto',
        bottom: anchor.wrapHeight - anchor.topInWrap + 4,
        left: anchor.left,
      };
    }
    return {
      top: anchor.bottomInWrap + 4,
      bottom: 'auto',
      left: anchor.left,
    };
  };

  const handleDraftChange = (v: string) => {
    onChange(v);
    if (!mentions) return;
    const el = composerRef.current;
    const caret = el?.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const atMatch = before.match(/(?:^|\s)@([\w-]*)$/);
    const plusMatch = atMatch ? null : before.match(/(?:^|\s)\+([\w-]*)$/);
    const m = atMatch ?? plusMatch;
    const mode: 'agent' | 'source' | null = atMatch ? 'agent' : plusMatch ? 'source' : null;
    if (m && mode && el) {
      const atIndex = before.length - m[1].length - 1;
      const c = getCaretCoordinates(el, atIndex);
      const wrap = composerWrapRef.current;
      if (wrap) {
        const wrapRect = wrap.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const topInWrap = elRect.top - wrapRect.top + c.top - el.scrollTop;
        const screenTop = elRect.top + c.top - el.scrollTop;
        const anchor: MentionAnchor = {
          topInWrap,
          bottomInWrap: topInWrap + c.height,
          left: elRect.left - wrapRect.left + c.left - el.scrollLeft,
          wrapHeight: wrapRect.height,
          screenTop,
          screenBottom: screenTop + c.height,
        };
        // Use the measured popup height if it's already mounted, otherwise
        // fall back to a 220px estimate so the FIRST paint already lands
        // on the correct side. The useLayoutEffect below refines after mount.
        const measured = mentionPopRef.current?.getBoundingClientRect().height ?? 0;
        setMentionAnchor(anchor);
        setMentionPos(positionForAnchor(anchor, measured > 0 ? measured : 220));
      }
      setMentionMode(mode);
      setMentionOpen(true);
      setMentionQuery(m[1] ?? '');
    } else {
      setMentionMode(null);
      setMentionOpen(false);
      setMentionQuery('');
    }
  };

  /** Re-measure once the popup is in the DOM so the flip decision uses
   *  the real height, not the 220px estimate. Also re-runs when the item
   *  list changes size (filtering by query), since that changes height. */
  useLayoutEffect(() => {
    if (!mentionOpen || !mentionAnchor) return;
    const pop = mentionPopRef.current;
    if (!pop) return;
    const measured = pop.getBoundingClientRect().height;
    if (measured === 0) return;
    const next = positionForAnchor(mentionAnchor, measured);
    setMentionPos((prev) =>
      prev.top === next.top && prev.bottom === next.bottom && prev.left === next.left
        ? prev
        : next,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentionOpen, mentionAnchor, flatMentionItems.length]);

  const stripMentionFromDraft = () => {
    const el = composerRef.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const m = before.match(/(?:^|\s)[@+]([\w-]*)$/);
    if (m) {
      const cut = before.slice(0, before.length - m[0].length);
      const next = `${cut}${after}`.replace(/^\s+/, '');
      onChange(next);
    }
  };

  const pickMention = (item: MentionFlatItem) => {
    stripMentionFromDraft();
    if (item.kind === 'agent') {
      onActiveAgentChange?.(item.id);
    } else if (item.kind === 'source') {
      onSourceAdd?.(item.id);
    } else if (item.kind === 'action' && item.id === 'create') {
      onCreateAgent?.();
    }
    setMentionOpen(false);
    setMentionMode(null);
    setMentionQuery('');
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  useEffect(() => {
    if (!mentionOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (composerWrapRef.current?.contains(t)) return;
      setMentionOpen(false);
      setMentionMode(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [mentionOpen]);

  /* Capture-phase listener so arrow / Enter / Tab / Escape on the
     mention popup runs BEFORE the Composer's submit-on-Enter handler. */
  useEffect(() => {
    if (!mentionOpen) return;
    const el = composerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        if (flatMentionItems.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        setMentionActive((i) => (i + 1) % flatMentionItems.length);
      } else if (e.key === 'ArrowUp') {
        if (flatMentionItems.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        setMentionActive((i) => (i - 1 + flatMentionItems.length) % flatMentionItems.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        const item = flatMentionItems[mentionActive];
        if (!item) return;
        e.preventDefault();
        e.stopPropagation();
        pickMention(item);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setMentionOpen(false);
        setMentionMode(null);
      }
    };
    el.addEventListener('keydown', onKey, true);
    return () => el.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentionOpen, flatMentionItems, mentionActive]);

  return (
    <div
      ref={composerWrapRef}
      className="asset-ai-composer-wrap"
      style={{ position: 'relative' }}
    >
      <Composer
        ref={composerRef}
        value={value}
        onChange={handleDraftChange}
        onSend={onSend}
        onStop={onStop}
        sendLabel={sendLabel}
        context={context}
        attachments={attachments}
        pending={pending}
        disabled={disabled}
        placeholder={placeholder}
        leading={leading ??
          <>
            {sourceTrigger ?? <AddSourceMenu
              onSelect={(id) => onSourceAdd?.(id)}
              tooltip="Add files, connectors, and more"
              trigger={
                <Button
                  variant="neutral"
                  size="md"
                  aria-label="Add source"
                  leadingIcon={<Icon name="plus" size={18} />}
                />
              }
            />}
            {afterSource}
            <ComposerSelection selected={!!activeAgentMeta} removeLabel={`Remove agent: ${activeAgentMeta?.label ?? ''}`} onRemove={() => {
              onActiveAgentChange?.(null);
              requestAnimationFrame(() => composerRef.current?.focus({ preventScroll: true }));
            }}>
              <Dropdown
                items={agentDropdownItems}
                value={activeAgent}
                onChange={(id) => {
                  if (id === 'create') {
                    onCreateAgent?.();
                    return;
                  }
                  onActiveAgentChange?.(id);
                  requestAnimationFrame(() => composerRef.current?.focus());
                }}
                searchable
                placeholder="Search agents…"
                fitViewport
                width="var(--ui-dropdown-picker-width)"
                fit={false}
                placement="bottom"
                trigger={
                  <Button
                    variant="neutral"
                    size="md"
                    className="asset-ai-pick-agent"
                    aria-label={activeAgentMeta ? `Change agent: ${activeAgentMeta.label}` : 'Pick agent'}
                    leadingIcon={activeAgentMeta ? <MiniAgentIcon icon={activeAgentMeta.icon} tone={activeAgentMeta.tone} size={14} /> : <PickAgentIcon />}
                  >
                    {activeAgentMeta?.label ?? 'Pick agent'}
                  </Button>
                }
              />
            </ComposerSelection>
          </>
        }
      />
      {mentions && mentionOpen && (
        <div
          ref={mentionPopRef}
          className="asset-ai-mention-pop"
          style={{
            top: mentionPos.top,
            bottom: mentionPos.bottom,
            left: mentionPos.left,
          }}
        >
          <div className="ui-dropdown-list">
            {flatMentionItems.length === 0 ? (
              <div className="asset-ai-mention-empty">
                No match for “{mentionQuery}”
              </div>
            ) : (
              (() => {
                const nodes: React.ReactNode[] = [];
                let cursor = 0;
                const renderAgentSection = (
                  list: MentionAgent[],
                  headerKey: string,
                  headerLabel: string,
                ) => {
                  if (list.length === 0) return;
                  if (nodes.length > 0)
                    nodes.push(
                      <div key={`sep-${headerKey}`} className="ui-dropdown-separator" />,
                    );
                  nodes.push(
                    <div key={headerKey} className="ui-dropdown-label">
                      {headerLabel}
                    </div>,
                  );
                  list.forEach((a) => {
                    const idx = cursor++;
                    nodes.push(
                      <button
                        key={a.id}
                        type="button"
                        className="ui-reset ui-dropdown-item"
                        data-highlighted={idx === mentionActive ? '' : undefined}
                        onMouseEnter={() => setMentionActive(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickMention({
                            kind: 'agent',
                            section: 'agent',
                            id: a.id,
                            label: a.label,
                            icon: a.icon,
                            tone: a.tone,
                          });
                        }}
                      >
                        <span className="ui-dropdown-item-icon">
                          <MiniAgentIcon
                            icon={a.icon}
                            tone={a.tone}
                            size={16}
                          />
                        </span>
                        <span className="ui-dropdown-item-label">{a.label}</span>
                      </button>,
                    );
                  });
                };
                renderAgentSection(
                  filteredMentionSections.pinnedAgents,
                  'h-pinned',
                  'Favorite agents',
                );
                renderAgentSection(
                  filteredMentionSections.agents,
                  'h-agent',
                  'Agents',
                );
                if (filteredMentionSections.sources.length > 0) {
                  if (nodes.length > 0)
                    nodes.push(<div key="sep-source" className="ui-dropdown-separator" />);
                  nodes.push(
                    <div key="h-source" className="ui-dropdown-label">
                      Source
                    </div>,
                  );
                  filteredMentionSections.sources.forEach((s) => {
                    const idx = cursor++;
                    nodes.push(
                      <button
                        key={s.id}
                        type="button"
                        className="ui-reset ui-dropdown-item"
                        data-highlighted={idx === mentionActive ? '' : undefined}
                        onMouseEnter={() => setMentionActive(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickMention({
                            kind: 'source',
                            section: 'source',
                            id: s.id,
                            label: s.label,
                            icon: s.icon,
                            iconKind: s.iconKind,
                          });
                        }}
                      >
                        <span className="ui-dropdown-item-icon">
                          {s.iconKind === 'image' ? (
                            <VendorLogo name={s.icon} size={14} />
                          ) : (
                            <Icon name={s.icon} size={14} />
                          )}
                        </span>
                        <span className="ui-dropdown-item-label">{s.label}</span>
                      </button>,
                    );
                  });
                }
                if (filteredMentionSections.actions.length > 0) {
                  if (nodes.length > 0)
                    nodes.push(<div key="sep-action" className="ui-dropdown-separator" />);
                  filteredMentionSections.actions.forEach((a) => {
                    const idx = cursor++;
                    nodes.push(
                      <button
                        key={a.id}
                        type="button"
                        className="ui-reset ui-dropdown-item"
                        data-highlighted={idx === mentionActive ? '' : undefined}
                        onMouseEnter={() => setMentionActive(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickMention({
                            kind: 'action',
                            section: 'action',
                            id: a.id,
                            label: a.label,
                            icon: a.icon,
                          });
                        }}
                      >
                        <span className="ui-dropdown-item-icon">
                          <Icon name={a.icon} size={14} />
                        </span>
                        <span className="ui-dropdown-item-label">{a.label}</span>
                      </button>,
                    );
                  });
                }
                return nodes;
              })()
            )}
          </div>
        </div>
      )}
      {tray && <ChatBoxTray {...tray} />}
      {aiNotice && (
        <div
          style={{
            marginTop: 8,
            textAlign: 'center',
            fontFamily: 'var(--ui-font)',
            fontSize: 12,
            lineHeight: 1.4,
            color: 'var(--ui-text-muted)',
          }}
        >
          {ASSET_AI_NOTICE}
        </div>
      )}
    </div>
  );
}
