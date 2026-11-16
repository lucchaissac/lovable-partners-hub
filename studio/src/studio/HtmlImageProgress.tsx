import type { CanvasImageProgress } from './canvasAgentSchema';

export function HtmlImageProgress({ image, existing = false }: { image: CanvasImageProgress[number]; existing?: boolean }) {
  const label = image.state === 'removing-background' ? 'Removing image background' : image.state === 'editing' ? 'Editing image' : 'Generating image';
  return <div className="hcs-image-progress" data-editing={existing || undefined} role="status" aria-label={label} />;
}
