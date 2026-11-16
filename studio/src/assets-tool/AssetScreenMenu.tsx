import {useRef,useState} from 'react';
import {Button,DropdownMenu,DropdownMenuContent,DropdownMenuTrigger,Icon,Input,Tooltip} from '@asset/ui';
import {useHtmlEditorInsert} from '../studio/HtmlEditorInsert';
import {readHtmlImage} from '../studio/htmlImageUpload';
import screens from './screens.json';

/** Captures from the website's actual renderers; each insertion embeds its pixels in the source. */
export function AssetScreenMenu() {
 const insert=useHtmlEditorInsert(),[open,setOpen]=useState(false),[query,setQuery]=useState(''),[loading,setLoading]=useState(''),[error,setError]=useState('');
 const search=useRef<HTMLInputElement>(null),trigger=useRef<HTMLDivElement>(null),operation=useRef(0);
 const close=()=>{operation.current++;setOpen(false);setLoading('');requestAnimationFrame(()=>trigger.current?.querySelector('button')?.focus({preventScroll:true}));};
 const toggle=(next:boolean)=>{if(!next){close();return;}setOpen(true);setQuery('');setError('');requestAnimationFrame(()=>search.current?.focus());};
 const add=async(screen:typeof screens[number])=>{
  const run=++operation.current;setLoading(screen.id);setError('');
  try{
   const response=await fetch(screen.src);if(!response.ok)throw new Error('This screen could not be loaded. Please try again.');
   const src=await readHtmlImage(new File([await response.blob()],`${screen.id}.jpg`,{type:'image/jpeg'}));
   if(operation.current!==run)return;
   insert.current?.({id:crypto.randomUUID(),kind:'image',value:{src,alt:screen.title,caption:'',alignment:'center',width:100},editor:{widthPx:480,height:480*screen.height/screen.width,appearance:{imageFit:'contain'}}});
   close();
  }catch(reason){if(operation.current===run){setError(reason instanceof Error?reason.message:'Could not add this screen.');setLoading('');}}
 };
 const results=screens.filter(screen=>`${screen.title} ${screen.id}`.toLowerCase().includes(query.trim().toLowerCase()));
 return <div ref={trigger}><DropdownMenu open={open} onOpenChange={toggle}>
  <Tooltip label="Screens" side="bottom"><span className="studio-insert-tool"><DropdownMenuTrigger><Button variant="ghost" aria-label="Add screen" aria-haspopup="dialog" aria-expanded={open} leadingIcon={<Icon name="app-window" size={16}/>}/></DropdownMenuTrigger></span></Tooltip>
  <DropdownMenuContent width={480} style={{width:480,minWidth:0}} fitViewport align="center" className="asset-screen-menu" role="dialog" aria-label="Asset screens" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}}>
   <Input ref={search} inputSize="sm" aria-label="Search screens" placeholder="Search screens" leadingIcon={<Icon name="search" size={14}/>} value={query} onChange={event=>setQuery(event.target.value)}/>
   <div className="asset-screen-grid" aria-busy={!!loading}>
    {results.map(screen=><button type="button" key={screen.id} className="ui-reset asset-screen-option" aria-label={`Add ${screen.title} screen`} disabled={!!loading} onClick={()=>void add(screen)}><span className="asset-screen-preview"><img src={screen.src} alt="" loading="lazy" width={screen.width} height={screen.height}/>{loading===screen.id&&<span role="status" className="asset-screen-loading">Adding…</span>}</span><span>{screen.title}</span></button>)}
   </div>
   {!results.length&&<p className="asset-screen-message" role="status">No screens found.</p>}
   {error&&<p className="asset-screen-message" role="alert">{error}</p>}
  </DropdownMenuContent>
 </DropdownMenu></div>;
}
