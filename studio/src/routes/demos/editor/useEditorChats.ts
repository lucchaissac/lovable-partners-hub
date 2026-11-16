import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DemoChatTurn } from './useDrawingDemo';
import type { Workspace } from './model';
import { capturedReply, stagingChatCapture } from './stagingChats';

export type EditorChatTurn = DemoChatTurn & { shapeName?: string; commentPage?: string; sourceTurnId?: string };
export type EditorChat = { id: string; title: string; turns: EditorChatTurn[]; draft: string; agent: string | null; updatedAt: number; pinned?: boolean; archived?: boolean; minimalThinking?: boolean };
export type ChatScope = { activeId: string; chats: EditorChat[]; seedVersion?: string };
type ChatStore = Record<string, ChatScope>;
const STORAGE_KEY = 'asset-ui:editor-chats:v1';
const blankChat = (id: string): EditorChat => ({ id, title: 'New chat', turns: [], draft: '', agent: null, updatedAt: Date.now() });
export const editorChatTitle = (chat: EditorChat) => chat.title !== 'New chat' ? chat.title : chat.draft.trim().split('\n')[0] || 'New chat';

function legacyExamples(workspace: Workspace) {
  return [
    ['Workspace overview', 'Give me a quick overview of this workspace.', `${workspace.title} brings together ${workspace.pages.map(page => page.title).join(' and ')}. Start with the summary, review the team, and confirm the next steps before sharing.`],
    ['Plan the next steps', 'Help me prepare the next steps for the team.', 'Confirm an owner for each task, schedule the intro call, and agree on the pilot success criteria. Keep the procurement and kickoff steps visible so everyone knows what comes next.'],
    ['Get ready to share', 'What should I review before sharing this workspace?', 'Review the introduction, check the team links, and make sure each next step has an owner. Preview the shared view to check which pages your audience will see.'],
  ];
}

/** Seed once, preserving personal chats and any edited, pinned or archived examples. */
export function seedEditorChats(scope: ChatScope, workspace: Workspace): ChatScope {
  if (scope.seedVersion === stagingChatCapture.version) return scope;
  const legacy = legacyExamples(workspace);
  const chats = scope.chats.filter(chat => !legacy.some(([title, text, reply], index) => chat.id === `example-${index}`
    && chat.title === title && !chat.draft && !chat.agent && !chat.pinned && !chat.archived && !chat.minimalThinking
    && chat.turns.length === 1 && chat.turns[0].id === `example-turn-${index}` && chat.turns[0].text === text && chat.turns[0].reply === reply));
  stagingChatCapture.chats.forEach((chat, index) => {
    if (!chats.some(existing => existing.id === chat.id)) chats.push({ ...blankChat(chat.id), title: chat.title,
      updatedAt: Date.parse(`${stagingChatCapture.capturedAt}T08:00:00Z`) + index * 60000,
      turns: chat.turns.map(turn => ({ id: turn.id, sourceTurnId: turn.id, text: turn.text, reply: capturedReply(turn) })) });
  });
  return { ...scope, chats, seedVersion: stagingChatCapture.version, activeId: chats.some(chat => chat.id === scope.activeId) ? scope.activeId : chats[0].id };
}

function initialChats(workspace: Workspace, demo: boolean): ChatScope {
  const scope = { activeId: 'current', chats: [blankChat('current')] };
  return demo ? seedEditorChats(scope, workspace) : scope;
}

export function readEditorChats(raw: string | null): ChatStore {
  try {
    const value: unknown = JSON.parse(raw ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).flatMap(([key, scope]) => {
      if (!scope || typeof scope.activeId !== 'string' || !Array.isArray(scope.chats)) return [];
      const chats = scope.chats.filter((chat: EditorChat) => chat && typeof chat.id === 'string' && typeof chat.title === 'string'
        && typeof chat.draft === 'string' && (chat.agent === null || typeof chat.agent === 'string')
        && Number.isFinite(chat.updatedAt) && Array.isArray(chat.turns)
        && chat.turns.every(turn => turn && typeof turn.id === 'string' && typeof turn.text === 'string'
          && (turn.reply === undefined || typeof turn.reply === 'string')
          && (turn.sourceTurnId === undefined || typeof turn.sourceTurnId === 'string')))
        .map((chat: EditorChat) => ({ ...chat, pinned: chat.pinned === true, archived: chat.archived === true, turns: chat.turns.map(turn => turn.phase === 'reading' || turn.phase === 'editing'
          ? { ...turn, phase: 'stopped' as const, reply: 'This request was interrupted. Send a new message to continue.' } : turn) }));
      if (!chats.length) return [];
      return [[key, { activeId: chats.some((chat: EditorChat) => chat.id === scope.activeId) ? scope.activeId : chats[0].id, chats,
        seedVersion: typeof scope.seedVersion === 'string' ? scope.seedVersion : undefined }]];
    }));
  } catch { return {}; }
}

export function serializeEditorChats(store: ChatStore): string {
  // Canvas snapshots and undo targets belong to the current editing session.
  return JSON.stringify(store, (key, value) => ['drawing', 'before', 'pageId', 'sectionId'].includes(key) ? undefined : value);
}

/** Browser-local conversations, isolated by editor route and workspace. */
export function useEditorChats(scopeId: string, workspace: Workspace, demo: boolean) {
  const [store, setStore] = useState<ChatStore>(() => {
    try { return readEditorChats(localStorage.getItem(STORAGE_KEY)); } catch { return {}; }
  });
  const initial = useMemo(() => initialChats(workspace, demo), [scopeId]);
  const scope = useMemo(() => demo ? seedEditorChats(store[scopeId] ?? initial, workspace) : store[scopeId] ?? initial, [store, scopeId, initial, demo, workspace]);
  const active = scope.chats.find(chat => chat.id === scope.activeId) ?? scope.chats[0];
  useEffect(() => { setStore(previous => {
    const current = previous[scopeId] ?? initial;
    const next = demo ? seedEditorChats(current, workspace) : current;
    return next === previous[scopeId] ? previous : { ...previous, [scopeId]: next };
  }); }, [scopeId, initial, demo, workspace]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, serializeEditorChats(store)); } catch { /* Keep working in memory when browser storage is full. */ }
  }, [store]);
  const update = useCallback((transform: (chat: EditorChat) => EditorChat) => {
    setStore(previous => {
      const current = previous[scopeId] ?? initial;
      return { ...previous, [scopeId]: { ...current, chats: current.chats.map(chat => chat.id === active.id ? transform(chat) : chat) } };
    });
  }, [scopeId, active.id, initial]);
  const setTurns = useCallback((transform: (turns: EditorChatTurn[]) => EditorChatTurn[]) => update(chat => {
    const now = new Date().toISOString();
    const turns = transform(chat.turns).map(turn => !turn.createdAt && !chat.turns.some(old => old.id === turn.id) ? { ...turn, createdAt: now } : turn);
    return { ...chat, turns, title: chat.title !== 'New chat' || chat.turns.length ? chat.title : turns[0]?.text.trim().split('\n')[0].slice(0, 72) || chat.title, updatedAt: Date.now() };
  }), [update]);
  const select = (id: string) => setStore(previous => {
    const current = previous[scopeId] ?? initial;
    return current.chats.some(chat => chat.id === id) ? { ...previous, [scopeId]: { ...current, activeId: id } } : previous;
  });
  const newChat = () => setStore(previous => {
    const current = previous[scopeId] ?? initial;
    const blank = current.chats.find(chat => !chat.archived && !chat.turns.length && !chat.draft.trim());
    const chat = blank ?? blankChat(crypto.randomUUID());
    return { ...previous, [scopeId]: { ...current, activeId: chat.id, chats: blank ? current.chats : [chat, ...current.chats] } };
  });
  const editChat = (id: string, patch: Pick<Partial<EditorChat>, 'title' | 'pinned' | 'archived' | 'minimalThinking'>) => setStore(previous => {
    const current = previous[scopeId] ?? initial;
    const chats = current.chats.map(chat => chat.id === id ? { ...chat, ...patch } : chat);
    let activeId = current.activeId;
    if (patch.archived && id === activeId) {
      const next = chats.find(chat => !chat.archived) ?? blankChat(crypto.randomUUID());
      if (!chats.includes(next)) chats.unshift(next);
      activeId = next.id;
    }
    return { ...previous, [scopeId]: { ...current, activeId, chats } };
  });
  const deleteChat = (id: string) => setStore(previous => {
    const current = previous[scopeId] ?? initial;
    const remaining = current.chats.filter(chat => chat.id !== id);
    let next = remaining.find(chat => chat.id === current.activeId && !chat.archived) ?? remaining.find(chat => !chat.archived);
    if (!next) { next = blankChat(crypto.randomUUID()); remaining.unshift(next); }
    return { ...previous, [scopeId]: { ...current, activeId: next.id, chats: remaining } };
  });
  const restoreChat = (chat: EditorChat) => setStore(previous => {
    const current = previous[scopeId] ?? initial;
    return { ...previous, [scopeId]: { ...current, activeId: chat.id, chats: current.chats.some(item => item.id === chat.id) ? current.chats : [chat, ...current.chats] } };
  });
  return { chats: scope.chats, active, activeId: active.id, turns: active.turns, setTurns, select, newChat, editChat, deleteChat, restoreChat,
    draft: active.draft, setDraft: (draft: string | ((previous: string) => string)) => update(chat => ({ ...chat, draft: typeof draft === 'function' ? draft(chat.draft) : draft })),
    activeAgent: active.agent, setActiveAgent: (agent: string | null) => update(chat => ({ ...chat, agent })) };
}
