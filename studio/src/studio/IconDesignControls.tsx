import {Icon,Switch,TriggerField} from '@asset/ui';
import {HtmlIconMenu} from './HtmlIconMenu';
import {LucideGlyph} from './LucideGlyph';
import {lucideLabel} from './lucideSearch';
import type {HtmlIconName} from './htmlEditorModel';

export function IconDesignControls({icon,filled,locked,onIcon,onFilled}:{icon:HtmlIconName;filled:boolean;locked:boolean;onIcon:(name:HtmlIconName)=>void;onFilled:(filled:boolean)=>void}){
 return <>
  <div className="hcs-design-design-row"><span>Icon</span><HtmlIconMenu value={icon} onAdd={onIcon} trigger={<TriggerField disabled={locked} aria-label="Choose icon" leadingIcon={<LucideGlyph name={icon} size={16}/>} trailingIcon={<Icon name="chevron-down" size={14}/>}>{lucideLabel(icon)}</TriggerField>}/></div>
  <div className="hcs-design-design-row"><span>Filled</span><Switch size="sm" aria-label="Filled icon" disabled={locked} checked={filled} onChange={onFilled}/></div>
 </>;
}
