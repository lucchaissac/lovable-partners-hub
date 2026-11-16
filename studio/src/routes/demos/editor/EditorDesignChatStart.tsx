import { Button, Icon } from '@asset/ui';

/** Presentation editor's empty chat, shared with the single-asset workspace. */
export function EditorDesignChatStart({onChoose,disabled=false}:{onChoose:(prompt:string)=>void;disabled?:boolean}) {
  const actions=[
    {icon:'wand-sparkles',label:'Redesign this asset',prompt:'Refine the composition of this asset using our brand. Preserve its essential content and keep every element editable.'},
    {icon:'image',label:'Add background',prompt:'Create an on-brand background image for this asset. Keep its content and text editable.'},
    {icon:'paintbrush-vertical',label:'Change style',prompt:'Refine the colors and typography of this asset using our brand, preserving its content.'},
  ];
  return <div className="we-chat-start"><h2 style={{marginBottom:'var(--ui-space-2)'}}>What shall we do<br/>with this design?</h2>{actions.map(action=><Button key={action.label} variant="ghost" disabled={disabled} leadingIcon={<Icon name={action.icon} size={16}/>} onClick={()=>onChoose(action.prompt)}>{action.label}</Button>)}</div>;
}
