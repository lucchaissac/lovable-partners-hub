import type { CSSProperties } from 'react';
import type { HtmlBlock } from './htmlEditorModel';

export type VideoBlock = Extract<HtmlBlock, { kind: 'media' }>;
/** Percentages keep the source crop and original vector mask proportional on resize. */
export function mediaWindowStyles(block: VideoBlock): { frame: CSSProperties; content: CSSProperties } {
  const crop = block.mediaWindow;
  return {
    frame: { position: 'relative', width: '100%', height: block.editor?.height ?? 180, overflow: 'hidden', borderRadius: 'inherit', ...(crop?.maskSrc && crop.maskEnabled !== false ? { maskImage: `url("${crop.maskSrc}")`, maskSize: '100% 100%', maskRepeat: 'no-repeat', maskMode: 'alpha' } : {}) },
    content: crop ? { position: 'absolute', left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%`, maxWidth: 'none', objectFit: 'fill', borderRadius: 0, border: 0, background: 'transparent' }
      : { width: '100%', height: '100%', objectFit: block.editor?.appearance?.imageFit ?? 'cover', borderRadius: 'inherit', border: 0 },
  };
}
