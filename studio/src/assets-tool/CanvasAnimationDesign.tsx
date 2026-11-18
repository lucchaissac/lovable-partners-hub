import { Dropdown, Icon, Switch, TriggerField } from '@asset/ui';
import { StudioShapeNumber } from '../studio/PresentationElementDesign';
import { defaultCanvasAnimation, type AssetDocument } from './model';

type Props = { asset: AssetDocument; onChange: (asset: AssetDocument) => void };

/** Settings only: the shared maker keeps its current canvas and export behavior. */
export function CanvasAnimationDesign({ asset, onChange }: Props) {
  const animation = asset.animation ?? defaultCanvasAnimation;
  const update = (patch: Partial<typeof animation>) => onChange({
    ...asset, animation: { ...animation, ...patch },
  });

  return <details className="hcs-design-advanced">
    <summary><span>Advanced</span><Icon name="chevron-down" size={16}/></summary>
    <div className="hcs-design-advanced-body">
      <div className="hcs-design-design-row">
        <span>Animated</span>
        <Switch size="sm" aria-label="Animated canvas" checked={animation.enabled} onChange={enabled => update({ enabled })}/>
      </div>
      {animation.enabled && <>
        <div className="lovable-field">
          <span>Transition</span>
          <Dropdown
            value={animation.transition}
            align="end"
            listHeight="auto"
            items={[{ id: 'instant', label: 'Instant' }, { id: 'smart-animate', label: 'Smart animate' }]}
            onChange={transition => {
              if (transition === 'instant' || transition === 'smart-animate') update({ transition });
            }}
            trigger={<TriggerField aria-label="Canvas transition">{animation.transition === 'instant' ? 'Instant' : 'Smart animate'}</TriggerField>}
          />
        </div>
        {animation.transition === 'smart-animate' && <div className="hcs-design-design-row">
          <span>Duration</span>
          <StudioShapeNumber key={asset.id} label="Canvas animation duration" value={animation.durationMs} min={1} max={10_000} suffix="ms" onChange={(durationMs: number) => update({ durationMs })}/>
        </div>}
      </>}
    </div>
  </details>;
}
