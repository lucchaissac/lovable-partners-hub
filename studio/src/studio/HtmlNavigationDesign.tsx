import { Button, ColorPicker, Dropdown, FormField, Icon, TriggerField } from '@asset/ui';
import type { HtmlNavigationDesign as Design } from './htmlNavigationModel';

export function HtmlNavigationDesign({ value, onChange, onAskAI, sections=false }: { value: Design; onChange: (value: Design) => void; onAskAI?: () => void; sections?:boolean }) {
  const patch = (next: Partial<Design>) => onChange({ ...value, ...next });
  const choice = (key: 'variant' | 'alignment' | 'shadow', label: string, options: [string, string][], fallback: string) => <FormField label={label}><Dropdown value={value[key] || fallback} items={options.map(([id,label])=>({id,label}))} onChange={id=>patch({[key]:id})} trigger={<TriggerField aria-label={label}>{options.find(([id])=>id===(value[key]||fallback))?.[1]}</TriggerField>} /></FormField>;
  const color = (key: 'background' | 'text' | 'activeText' | 'activeBackground' | 'pillBackground' | 'indicator', label: string, fallback: string) => <FormField label={label}><ColorPicker value={value[key] || fallback} onChange={color=>patch({[key]:color})} /></FormField>;
  return <div className="hn-design-fields">
    {!sections&&choice('variant','Page navigation',[['card','Tabs'],['chip','Pills'],['underline','Underline']],'underline')}
    {!sections&&choice('alignment','Alignment',[['left','Left'],['center','Center'],['right','Right']],'left')}
    {color('background','Background','#ffffff')}
    {value.variant==='chip' && color('pillBackground','Pill background','#f5f5f5')}
    {color('text','Text color','#60646c')}{color('activeText','Active text color','#20242c')}
    {sections?<>{color('indicator','Active indicator','#20242c')}{color('activeBackground','Active background','transparent')}</>:(value.variant||'underline')==='underline'?color('indicator','Active underline','#006bff'):color('activeBackground','Active background','#f0f0f0')}
    {choice('shadow','Shadow',[['none','None'],['hairline','Subtle'],['sm','Small'],['md','Medium']],'hairline')}
    <div className="hn-design-actions"><Button variant="ghost" size="sm" onClick={()=>onChange({})}>Reset navigation</Button>{onAskAI&&<Button variant="neutral" size="sm" leadingIcon={<Icon name="sparkles" size={16}/>} onClick={onAskAI}>Edit tabs with AI</Button>}</div>
  </div>;
}
