import { Switch } from '@asset/ui';
import { StudioShapeNumber } from './PresentationElementDesign';
import type { VideoBlock } from './mediaWindow';

export function MediaWindowDesign({ block, onChange }: { block: VideoBlock; onChange: (block: VideoBlock) => void }) {
  const crop = block.mediaWindow;
  return <div className="hcs-design-design-section">
    <div className="hcs-design-design-row"><span>Autoplay</span><Switch size="sm" aria-label="Autoplay video" checked={block.autoplay !== false} onChange={autoplay => onChange({ ...block, autoplay })}/></div>
    {crop && <>
      {crop.maskSrc && <div className="hcs-design-design-row"><span>Vector mask</span><Switch size="sm" aria-label="Vector mask" checked={crop.maskEnabled !== false} onChange={maskEnabled => onChange({ ...block, mediaWindow: { ...crop, maskEnabled } })}/></div>}
      <div className="hcs-design-design-row"><span>Media X</span><StudioShapeNumber label="Media offset X" min={-1000} max={1000} suffix="%" value={crop.x} onChange={(x: number) => onChange({ ...block, mediaWindow: { ...crop, x } })}/></div>
      <div className="hcs-design-design-row"><span>Media Y</span><StudioShapeNumber label="Media offset Y" min={-1000} max={1000} suffix="%" value={crop.y} onChange={(y: number) => onChange({ ...block, mediaWindow: { ...crop, y } })}/></div>
      <div className="hcs-design-design-row"><span>Media scale</span><StudioShapeNumber label="Media scale" min={1} max={1000} suffix="%" value={crop.width} onChange={(width: number) => onChange({ ...block, mediaWindow: { ...crop, width, height: crop.height * width / crop.width } })}/></div>
    </>}
  </div>;
}
