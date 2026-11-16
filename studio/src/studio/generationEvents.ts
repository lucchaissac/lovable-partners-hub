import type { StudioDocument } from './schema.js';
import type { HtmlGenerationProgress } from './htmlGenerationProgress.js';

export type GenerationPhase = 'browsing' | 'reading' | 'generating' | 'repairing' | 'reviewing';
export type GenerationResult = { document: StudioDocument; summary: string; outcome?: 'clarification' };
export type StudioAgent = { id: string; name: string; task: string; status: 'running' | 'completed' | 'failed' };
export type GenerationAgent = StudioAgent;
export type GenerationEvent =
  | { type: 'phase'; phase: GenerationPhase }
  | { type: 'html-progress'; progress: HtmlGenerationProgress }
  | { type: 'agent'; agent: GenerationAgent }
  | { type: 'preview'; document: StudioDocument }
  | { type: 'result'; result: GenerationResult }
  | { type: 'error'; message: string }
  | { type: 'heartbeat' };
export const generationPhaseLabels: Record<GenerationPhase, string> = {
  browsing: 'Opening your page references…',
  reading: 'Reading your references…',
  generating: 'Designing your changes…',
  repairing: 'Refining the changes…',
  reviewing: 'Checking the preview…',
};
