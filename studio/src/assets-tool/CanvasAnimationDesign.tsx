import { Dropdown, Icon, Switch, TriggerField } from '@asset/ui';
import { StudioShapeNumber } from '../studio/PresentationElementDesign';
import { defaultCanvasAnimation, type AssetDocument } from './model';
import { AnimationCurve } from './AnimationCurve';

const easings = [{ id: 'ease-in-out', label: 'Ease in and out' }, { id: 'linear', label: 'Linear' }, { id: 'ease-in', label: 'Ease in' }, { id: 'ease-out', label: 'Ease out' }, { id: 'spring', label: 'Spring' }, { id: 'custom', label: 'Custom curve' }];

type Props = { asset: AssetDocument; onChange: (asset: AssetDocument) => void };

/** The outgoing transition for this canvas in collection playback. */
export function CanvasAnimationDesign({ asset, onChange }: Props) {
  const animation = { ...defaultCanvasAnimation, ...asset.animation };
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
        <div className="hcs-design-design-row"><span>Delay</span><StudioShapeNumber label="Canvas animation delay" value={animation.delayMs} min={0} max={10_000} suffix="ms" onChange={(delayMs: number) => update({ delayMs })}/></div>
        {animation.transition === 'smart-animate' && <><div className="hcs-design-design-row">
          <span>Duration</span>
          <StudioShapeNumber key={asset.id} label="Canvas animation duration" value={animation.durationMs} min={1} max={10_000} suffix="ms" onChange={(durationMs: number) => update({ durationMs })}/>
        </div>
          <div className="lovable-field"><span>Easing</span><Dropdown value={animation.easing} align="end" listHeight="auto" items={easings} onChange={easing => update({ easing: easing as typeof animation.easing })} trigger={<TriggerField aria-label="Animation easing">{easings.find(item => item.id === animation.easing)?.label}</TriggerField>}/></div>
          {animation.easing === 'spring' && <>
            <div className="hcs-design-design-row"><span>Bounce</span><StudioShapeNumber label="Animation bounce" value={animation.bounce} min={0} max={80} suffix="%" onChange={(bounce: number) => update({ bounce })}/></div>
            <div className="hcs-design-design-row"><span>Velocity</span><StudioShapeNumber label="Animation velocity" value={animation.velocity} min={-10} max={10} suffix="" onChange={(velocity: number) => update({ velocity })}/></div>
          </>}
          {animation.easing === 'custom' && <AnimationCurve value={animation.curve} onChange={curve => update({ curve })}/>}
        </>}
      </>}
    </div>
  </details>;
}
