import { Button, Icon, Tooltip } from '@asset/ui';

/** The exact composer action shared by the editor and its public reference. */
export function WorkspaceAIEditButton({active,onChange}:{active:boolean;onChange:(active:boolean)=>void}) {
  return <Tooltip label="AI Edit" side="top" maxWidth={320} enabled={!active}><Button className="hcs-ai-edit" variant="neutral" size="md" aria-label="AI Edit" aria-pressed={active} leadingIcon={<Icon name="mouse-pointer-click" size={18} fill="currentColor"/>} onClick={()=>onChange(!active)}/></Tooltip>;
}
