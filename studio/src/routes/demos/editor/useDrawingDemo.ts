import { useEffect, useRef, useState } from 'react';
import { PEOPLE, type Page } from './model';

export type DemoChatTurn = {
  id: string; text: string; createdAt?: string; drawing?: string; reply?: string; offerPageActions?: boolean;
  phase?: 'reading' | 'editing' | 'done' | 'stopped' | 'undone';
  pageId?: string; sectionId?: string; before?: string[];
};

/** A deliberately scripted, local presentation flow; no AI service is called. */
export function useDrawingDemo(workspaceId: string, page: Page, active: boolean,
  applyOrder: (pageId: string, sectionId: string, order: string[]) => void,
  conversation: { activeId: string; turns: DemoChatTurn[]; setTurns: (update: (turns: DemoChatTurn[]) => DemoChatTurn[]) => void }) {
  const { turns, setTurns } = conversation;
  const [drawing, setDrawing] = useState<string | null>(null);
  const [job, setJob] = useState<DemoChatTurn | null>(null);
  const latest = useRef({ page, applyOrder });
  latest.current = { page, applyOrder };
  const scope = `${workspaceId}:${page.id}:${active}:${conversation.activeId}`;
  const jobScope = useRef(scope);
  const jobWriter = useRef(setTurns);
  useEffect(() => { setDrawing(null); }, [scope]);

  useEffect(() => {
    if (!job) return;
    const update = (patch: Partial<DemoChatTurn>) => jobWriter.current(previous => previous.map(turn => turn.id === job.id ? { ...turn, ...patch } : turn));
    if (jobScope.current !== scope) {
      update({ phase: 'stopped', reply: 'Stopped. Your team is unchanged.' });
      setJob(null); return;
    }
    const editing = window.setTimeout(() => update({ phase: 'editing', reply: 'I’ll move Madison before Alex and keep the team cards together.' }), 650);
    const finish = window.setTimeout(() => {
      const section = latest.current.page.sections.find(item => item.id === job.sectionId);
      if (!section || section.kind !== 'team') {
        update({ phase: 'stopped', reply: 'I need a team section on this page for this demo. Open Summary and try again.' });
      } else {
        const order = section.teamOrder ?? PEOPLE;
        const next = order.filter(name => name !== PEOPLE[2]);
        next.splice(Math.max(0, next.indexOf(PEOPLE[0])), 0, PEOPLE[2]);
        latest.current.applyOrder(page.id, section.id, next);
        update({ phase: 'done', reply: 'Done — Madison is now before Alex in the Ramp team. The cards and links stayed together.' });
      }
      setJob(null);
    }, 1900);
    return () => { clearTimeout(editing); clearTimeout(finish); };
  }, [job, scope, workspaceId, page.id]);

  function send(text: string, reply?: string, offerPageActions = false) {
    if (job || (!text.trim() && !drawing)) return;
    const section = page.sections.find(item => item.kind === 'team');
    const turn: DemoChatTurn = { id: crypto.randomUUID(), text: text.trim() || 'Move Madison before Alex Kracov.', reply, offerPageActions,
      ...(drawing ? { drawing, pageId: page.id, sectionId: section?.id, before: [...(section?.teamOrder ?? PEOPLE)], phase: 'reading', reply: 'Looking at your drawing…' } : {}) };
    setTurns(previous => [...previous, turn]);
    if (drawing) { jobScope.current = scope; jobWriter.current = setTurns; setJob(turn); setDrawing(null); }
  }
  function undo(turn: DemoChatTurn) {
    if (job || !turn.pageId || !turn.sectionId || !turn.before) return;
    latest.current.applyOrder(turn.pageId, turn.sectionId, turn.before);
    setTurns(previous => previous.map(item => item.id === turn.id ? { ...item, phase: 'undone', reply: 'Restored the original team order. Ready for another take.' } : item));
  }
  return { turns, drawing, setDrawing, busy: !!job, send, undo };
}
