import { PresentationElementAppearanceFields } from '../studio/PresentationElementDesign';
import type { ElementAppearance } from '../studio/htmlElementAppearance';
import type { HtmlBlock } from '../studio/htmlEditorModel';

type ImageBlock = Extract<HtmlBlock, { kind: 'image' }>;

/** Branded images keep their content-specific controls and the ordinary image styles. */
export function ImageAppearanceControls({ block, onChange, locked = false, label = 'Image' }: {
  block: ImageBlock; onChange: (block: ImageBlock) => void; locked?: boolean; label?: string;
}) {
  const frame = block.editor ?? {};
  return <fieldset className="hcs-design-design-fields hcs-design-design-section" disabled={locked} aria-label={`${label} appearance`}>
    <PresentationElementAppearanceFields
      shape={{ id: block.id, kind: 'image', width: frame.widthPx ?? 320, height: frame.height ?? 160,
        appearance: { imageFit: 'contain', ...(frame.radius !== undefined ? { radius: frame.radius } : {}), ...(frame.opacity !== undefined ? { opacity: frame.opacity * 100 } : {}), ...frame.appearance } }}
      label={label}
      locked={locked}
      onChange={(appearance: ElementAppearance) => {
        if (!locked) onChange({ ...block, editor: { ...frame, appearance: { ...frame.appearance, ...appearance } } });
      }}
    />
  </fieldset>;
}
