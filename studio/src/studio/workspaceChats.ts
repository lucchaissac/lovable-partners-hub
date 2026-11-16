import { z } from 'zod';
import type { StudioDocument, StudioMessage } from './schema';
import type { EditorChat } from '../routes/demos/editor/useEditorChats';

export const defaultWorkspaceChatId = 'workspace';
export type WorkspaceChat = NonNullable<StudioDocument['workspaceChats']>[number];
const chatId = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/);
export const workspaceChatCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('new') }).strict(),
  z.object({ type: z.enum(['select', 'delete', 'restore']), id: chatId }).strict(),
  z.object({ type: z.literal('edit'), id: chatId, patch: z.object({ title: z.string().trim().min(1).max(120).optional(), pinned: z.boolean().optional(), archived: z.boolean().optional(), minimalThinking: z.boolean().optional() }).strict() }).strict(),
]);
export type WorkspaceChatCommand = z.infer<typeof workspaceChatCommandSchema>;
export const messageWorkspaceChat = (message: StudioMessage) => message.workspaceChatId || defaultWorkspaceChatId;

type ChatDocument = Pick<StudioDocument, 'workspaceChats' | 'workspaceActiveChatId'>;
export function workspaceChats(document: ChatDocument, messages: StudioMessage[]) {
  const workspaceMessages = messages.filter(message => message.channel === 'workspace');
  const chats: WorkspaceChat[] = document.workspaceChats?.length ? document.workspaceChats : [{
    id: defaultWorkspaceChatId, title: workspaceMessages.find(message => message.user)?.text.split('\n')[0].slice(0, 72) || 'New chat',
    updatedAt: Date.parse(workspaceMessages.at(-1)?.createdAt || '') || 0,
  }];
  const active = chats.find(chat => chat.id === document.workspaceActiveChatId && !chat.archived && !chat.deleted) || chats.find(chat => !chat.archived && !chat.deleted) || chats[0];
  return { chats, active };
}

export function editWorkspaceChats<T extends ChatDocument>(document: T, messages: StudioMessage[], command: WorkspaceChatCommand, newId = crypto.randomUUID()): T {
  const state = workspaceChats(document, messages);
  let chats = [...state.chats], activeId = state.active.id;
  const create = () => {
    const empty = chats.find(chat => !chat.archived && !chat.deleted && !messages.some(message => message.channel === 'workspace' && messageWorkspaceChat(message) === chat.id));
    if (empty) return empty.id;
    if (chats.length >= 25) throw new Error('This prototype already has 25 chats. Continue an existing chat.');
    chats.unshift({ id: newId, title: 'New chat', updatedAt: Date.now() });
    return newId;
  };
  if (command.type === 'new') activeId = create();
  else {
    const chat = chats.find(item => item.id === command.id);
    if (!chat) return document;
    if (command.type === 'select' || command.type === 'restore') {
      chats = chats.map(item => item.id === chat.id ? { ...item, archived: false, deleted: false } : item);
      activeId = chat.id;
    } else {
      chats = chats.map(item => item.id === chat.id ? { ...item, ...(command.type === 'edit' ? command.patch : { deleted: true }) } : item);
      if (chats.find(item => item.id === activeId && (item.archived || item.deleted))) activeId = chats.find(item => !item.archived && !item.deleted)?.id || create();
    }
  }
  return { ...document, workspaceChats: chats, workspaceActiveChatId: activeId };
}

export function workspaceChatHistory(chats: WorkspaceChat[], messages: StudioMessage[]): EditorChat[] {
  return chats.filter(chat => !chat.deleted).map(chat => {
    const turns: EditorChat['turns'] = [];
    messages.filter(message => message.channel === 'workspace' && messageWorkspaceChat(message) === chat.id && !message.hiddenInChat).forEach((message, index) => {
      if (message.user) turns.push({ id: message.id || `${chat.id}-${index}`, text: message.text, createdAt: message.createdAt });
      else if (turns.length) turns[turns.length - 1].reply = [turns.at(-1)?.reply, message.text].filter(Boolean).join('\n');
    });
    return { ...chat, turns, draft: '', agent: null };
  });
}

/** Keep the usual 40-message window per chat, without evicting other chats. */
export function retainChatMessages(messages: StudioMessage[], reserve?: { channel?: 'studio' | 'workspace'; workspaceChatId?: string }) {
  const key = (message: { channel?: 'studio' | 'workspace'; workspaceChatId?: string }) => message.channel === 'workspace' ? `workspace:${message.workspaceChatId || defaultWorkspaceChatId}` : 'studio';
  const counts = new Map<string, number>();
  return [...messages].reverse().filter(message => {
    const scope = key(message), count = (counts.get(scope) || 0) + 1;
    counts.set(scope, count);
    return count <= (reserve && key(reserve) === scope ? 38 : 40);
  }).reverse();
}
