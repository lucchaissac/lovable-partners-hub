import capture from './fixtures/stagingChats.json';

export type CapturedQuestion = { prompt: string; description?: string; options: string[]; answer: string };
export type CapturedHumanRequest = { type: 'human-request'; title: string; questions: CapturedQuestion[] };
export type CapturedWidget = { type: 'widget'; title: string; request: string; description: string; heading: string; input: string; inputCount: string; decision: string };
export type CapturedBlock = { type: 'paragraph'; text: string } | { type: 'list'; ordered?: boolean; items: string[] } | CapturedHumanRequest | CapturedWidget;
export type CapturedTurn = { id: string; text: string; displayText?: string; body: CapturedBlock[]; activities: { label: string; detail: string }[] };
export type CapturedChat = { id: string; title: string; turns: CapturedTurn[] };

/** Visible staging conversations captured on October 8, 2026; no live AI connection. */
export const stagingChatCapture = capture as {
  source: string; workspace: string; capturedAt: string; version: string; chats: CapturedChat[];
};
export const capturedTurn = (id?: string) => stagingChatCapture.chats.flatMap(chat => chat.turns).find(turn => turn.id === id);
export const isCapturedChat = (id: string) => stagingChatCapture.chats.some(chat => chat.id === id);

/** The same captured text powers rendering, history search and copying. */
export function capturedReply(turn: CapturedTurn): string {
  return turn.body.map(block => {
    if (block.type === 'paragraph') return block.text;
    if (block.type === 'list') return block.items.map((text, index) => `${block.ordered ? `${index + 1}.` : '•'} ${text}`).join('\n');
    if (block.type === 'human-request') return [block.title, ...block.questions.map((question, index) => `${index + 1}. ${question.prompt}\n${question.answer}`)].join('\n\n');
    return [block.request, block.title, block.inputCount, block.description, block.heading, block.input, block.decision].join('\n\n');
  }).join('\n\n');
}
