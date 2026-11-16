import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, ColorPickerPaletteProvider, Dropdown, Icon, Input, PageHeader, Tooltip } from '@asset/ui';
import { assetPalette } from './palette';
import { useStudioSession } from '../studio/StudioSessions';
import { assetTheme } from './websiteTokens';
import { readStudioConfig, studioApi } from '../studio/client';

import { AssetCanvas } from './AssetCanvas';
import { AssetLibrary } from './AssetLibrary';
import { starterAsset } from './starter';
import { AssetDesignPanel } from './AssetDesignPanel';
import {AssetLibraryCard} from './AssetLibraryCard';
import { AssetHome, AssetRecents } from './AssetHome';
import { WorkspaceWidgetHost, WorkspaceInspector } from '../studio/WorkspaceWidgetHost';
import { readHtmlVideo } from '../studio/readHtmlVideo';
import { HtmlEditorInsertProvider, useHtmlEditorInsert } from '../studio/HtmlEditorInsert';
import { HtmlPresentationTools } from '../studio/HtmlPresentationTools';
import { HtmlSelectionMode } from '../studio/HtmlSelectionMode';
import { nativeDocument } from './nativeDocument';
import { WorkspaceChat, WorkspaceRuntimeContext, type WorkspaceRuntime } from '../studio/WorkspaceEditor';
import { WorkspaceSelectionContext } from '../studio/WorkspaceReview';
import type { WorkspaceVisual } from '../studio/workspaceWidgets';
import { sourceReferences, conversationForGeneration, type StudioSource } from '../studio/sources';
import { workspaceChats, messageWorkspaceChat } from '../studio/workspaceChats';
import type { StudioMessage } from '../studio/schema';
import { htmlEditorSchema, type HtmlEditorState } from '../studio/htmlEditorModel';
import '../routes/demos/editor/workspace-editor.css';
import '../studio/workspace-widgets.css';
import { Artwork } from './Artwork';
import { assetSchema, assetDimensions, compositionSchema, formats, resizeAsset, referenceDocument, type AssetDocument, type AssetFormat, type Composition } from './model';
import { exportPng, renderPng, exportSource, readReference, visionReference } from './media';
import { listAssets, saveAsset } from './storage';
import './assets.css';
import {AssetScreenMenu} from './AssetScreenMenu';

const locationSearch = () => window.location.search;

type AssetRequest = {id:number;prompt:string;visual?:WorkspaceVisual;sources:StudioSource[];recorded?:boolean;chatId?:string};

export default function AssetPage() {
  return <ColorPickerPaletteProvider value={assetPalette}><WorkspaceWidgetHost><HtmlSelectionMode.Provider value={true}><HtmlEditorInsertProvider><AssetPageContent/></HtmlEditorInsertProvider></HtmlSelectionMode.Provider></WorkspaceWidgetHost></ColorPickerPaletteProvider>;
}
function AssetPageContent() {
  const { active } = useStudioSession();
  const insert = useHtmlEditorInsert();
  const { id } = useParams(), navigate = useNavigate(), location=useLocation();
  const owner = readStudioConfig()?.user?.id ?? 'local';
  const [asset, setAsset] = useState<AssetDocument | undefined>(() => id ? undefined : starterAsset()), current = useRef<AssetDocument | undefined>(asset);
  const [recent, setRecent] = useState<AssetDocument[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [instructions, setInstructions] = useState('');
  const [visual, setVisual] = useState<WorkspaceVisual>();
  const [queued, setQueued] = useState<AssetRequest[]>([]);
  const lastRequest = useRef<AssetRequest | undefined>(undefined);
  const startedOnOpen=useRef(false);

  const assetMessages=(document?:AssetDocument):StudioMessage[] => (document?.messages??[]).map(message=>({...message,channel:'workspace',workspaceChatId:'workspace'}));
  const chatState=workspaceChats({},assetMessages(asset));
  const [loadError,setLoadError]=useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [reading, setReading] = useState(false);

  const [zoom,setZoom]=useState(0);
  const [designOpen,setDesignOpen]=useState(false);
  const [libraryOpen,setLibraryOpen]=useState(() => new URLSearchParams(locationSearch()).get('panel') === 'library');
  const [reviewCandidate,setReviewCandidate]=useState<AssetDocument>();
  const [generationStage,setGenerationStage]=useState('Designing your asset…');
  const [saveState, setSaveState] = useState(''), [exporting, setExporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [historyVersion, setHistoryVersion] = useState(0);
  const past = useRef<AssetDocument[]>([]), future = useRef<AssetDocument[]>([]);
  const upload = useRef<HTMLInputElement>(null), exportBoard = useRef<HTMLDivElement>(null);
  const readingFile = useRef(false);
  const controller = useRef<AbortController | undefined>(undefined), mounted = useRef(true), operation = useRef(0), saves = useRef(Promise.resolve());


  const put = useCallback((next: AssetDocument) => {
    current.current = next; setAsset(next); setLoadError(''); try { localStorage.setItem('lovable-studio-last-asset', next.id); } catch {} setSaveState('Saving…');
    const ownerAtSave = readStudioConfig()?.user?.id ?? owner;
    // Serial writes avoid a slower earlier write overwriting a later edit.
    saves.current = saves.current.catch(() => {}).then(() => saveAsset(ownerAtSave, next)).then(() => {
      if (mounted.current && current.current === next) setSaveState('Saved on this device');
    }).catch(reason => { if (mounted.current) {setSaveState(reason.message);setError(reason.message);} });
  }, [owner]);
  useEffect(() => { if (!id && current.current) put(current.current); }, []);
  const change = useCallback((next: AssetDocument) => {
    if (current.current && JSON.stringify(current.current) === JSON.stringify(next)) return;
    const parsed = assetSchema.safeParse({ ...next, messages:current.current?.messages ?? next.messages, workspaceChats:current.current?.workspaceChats??next.workspaceChats,workspaceActiveChatId:current.current?.workspaceActiveChatId??next.workspaceActiveChatId, updatedAt: Date.now() });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Check the asset dimensions.'); return; }
    if (current.current) past.current = [...past.current.slice(-49), current.current];
    future.current = []; put(parsed.data); setHistoryVersion(value => value + 1);
  }, [put]);
  const undo = useCallback(() => { const previous = past.current.pop(); if (!previous || !current.current) return; future.current.push(current.current); put({ ...previous, messages:current.current.messages,workspaceChats:current.current.workspaceChats,workspaceActiveChatId:current.current.workspaceActiveChatId, updatedAt: Date.now() }); setHistoryVersion(value => value + 1);  }, [put]);
  const redo = useCallback(() => { const next = future.current.pop(); if (!next || !current.current) return; past.current.push(current.current); put({ ...next, messages:current.current.messages,workspaceChats:current.current.workspaceChats,workspaceActiveChatId:current.current.workspaceActiveChatId, updatedAt: Date.now() }); setHistoryVersion(value => value + 1);  }, [put]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); operation.current++; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    void listAssets(owner).then(items => {
      if (cancelled) return; setRecent(items);
      if (id && !current.current && !readingFile.current) {
        const found = items.find(item => item.id === id);
        if (!found) { const next=starterAsset();current.current=next;setAsset(next); }
        else { current.current = found; setAsset(found); setLoadError(''); setSaveState('Saved on this device'); }
      }
    }).catch(reason => { if (!cancelled) setError(reason.message); }).finally(() => { if (!cancelled) { setLoading(false); setRecentLoading(false); } });
    return () => { cancelled = true; };
  }, [id, owner]);
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (!active || busy || event.defaultPrevented || (event.target as Element)?.closest('input, textarea, [contenteditable="true"]')) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
    };
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
  }, [active, busy, undo, redo]);
  useEffect(() => {
    if (!busy && saveState !== 'Saving…' && !saveState.startsWith('Could not')) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', beforeUnload); return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [busy, saveState]);

  const generate = async (document = current.current) => {
    if (!document || controller.current) return;
    const active = new AbortController(); controller.current = active;
    const run = ++operation.current;
    setBusy(true); setGenerationStage('Designing your asset…'); setError('');
    try {
      const reference = await visionReference(document.reference); active.signal.throwIfAborted();
      const result = compositionSchema.parse(await studioApi<Composition>('asset-generate', { reference, format: document.format, instructions }, active.signal));
      if (!mounted.current || run !== operation.current) return;
      const next = { ...document, ...result, dimensions: {width:formats[document.format].width,height:formats[document.format].height}, editor:undefined, layouts:undefined };
      const candidate=assetSchema.parse({...next,editor:nativeDocument(next)});
      setReviewCandidate(candidate); setGenerationStage('Reviewing the image…');
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      active.signal.throwIfAborted();
      if(!exportBoard.current)throw new Error('Could not render the asset for review. Please retry.');
      const rendered=await renderPng(exportBoard.current,candidate);
      const reviewed=compositionSchema.parse(await studioApi<Composition>('asset-generate',{reference,format:document.format,instructions,review:{composition:result,rendered}},active.signal));
      if(!mounted.current||run!==operation.current)return;
      const final={...next,...reviewed,editor:undefined};
      change(assetSchema.parse({...final,editor:nativeDocument(final)}));
    } catch (reason) {
      if (mounted.current && run === operation.current && !active.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not generate the asset. Please retry.');
    } finally {
      if (run === operation.current) { controller.current = undefined; if (mounted.current) {setBusy(false);setReviewCandidate(undefined);} }
    }
  };
  useEffect(()=>{
    if(!asset||startedOnOpen.current||location.state?.generateAsset!==asset.id)return;
    startedOnOpen.current=true;
    navigate({pathname:location.pathname,search:location.search},{replace:true,state:null});
    void generate(asset);
  },[asset?.id]);
  const appendMessage = (message:StudioMessage) => {
    const document=current.current;if(!document)return;
    const messages=assetMessages(document),state=workspaceChats(document,messages),chatId=message.workspaceChatId??state.active.id;
    const chats=state.chats.map(chat=>chat.id===chatId?{...chat,updatedAt:Date.now(),title:chat.title==='New chat'&&message.user?message.text.slice(0,72):chat.title}:chat);
    put(assetSchema.parse({...document,workspaceChats:chats,messages:[...messages,{...message,channel:'workspace',workspaceChatId:chatId}].slice(-1000),updatedAt:Date.now()}));
  };
  const refine = async (request:AssetRequest) => {
    if(!current.current || controller.current)return;
    setError('');
    request={...request,chatId:request.chatId??workspaceChats(current.current,assetMessages(current.current)).active.id};
    if(!request.recorded) {
      const user=readStudioConfig()?.user;
      appendMessage({id:crypto.randomUUID(),createdAt:new Date().toISOString(),text:request.prompt,user:true,workspaceChatId:request.chatId,sources:sourceReferences(request.sources),...(user?{author:{id:user.id,name:user.name||'You'}}:{})});
      request={...request,recorded:true};
    }
    lastRequest.current=request;
    const active=new AbortController();controller.current=active;
    const run=++operation.current,document=current.current;
    setBusy(true);setGenerationStage('Refining your asset…');
    try {
      if(!exportBoard.current)throw new Error('The asset is still opening. Please retry.');
      const png=await renderPng(exportBoard.current,document);
      const [reference,rendered]=await Promise.all([visionReference(document.reference),visionReference({name:'Current asset',src:png,...assetDimensions(document)})]);
      active.signal.throwIfAborted();
      const result=await studioApi<{editor:HtmlEditorState;summary:string}>('asset-refine',{
        title:document.title,prompt:request.prompt,editor:nativeDocument(document),dimensions:assetDimensions(document),
        reference,rendered:rendered.src,conversation:conversationForGeneration(assetMessages(document).filter(message=>messageWorkspaceChat(message)===request.chatId)),sources:request.sources,context:request.visual?.context,
      },active.signal);
      if(!mounted.current||run!==operation.current)return;
      change({...document,editor:htmlEditorSchema.parse(result.editor)});
      appendMessage({id:crypto.randomUUID(),createdAt:new Date().toISOString(),text:result.summary,user:false,workspaceChatId:request.chatId});
      lastRequest.current=undefined;setVisual(undefined);
    } catch(reason) {
      if(mounted.current&&run===operation.current&&!active.signal.aborted)setError(reason instanceof Error?reason.message:'Could not refine this asset. Please retry.');
    } finally {
      if(run===operation.current){controller.current=undefined;if(mounted.current)setBusy(false);}
    }
  };
  useEffect(()=>{
    if(busy||error||!queued.length||!readStudioConfig()?.user)return;
    const [request,...rest]=queued;setQueued(rest);void refine(request);
  },[busy,error,queued]);
  const stop = () => { setQueued([]); operation.current++; controller.current?.abort(); controller.current = undefined; setBusy(false); setReviewCandidate(undefined); };
  const loadImage = async (file?: File) => {
    if (!file || busy || readingFile.current) return;
    if(file.name.toLowerCase().endsWith('.json')){await importSource(file);return;}
    readingFile.current = true;
    setReading(true); setError('');
    try {
      if (file.type.startsWith('video/') || /\.(mp4|webm|ogv|mov)$/i.test(file.name)) {
        const block = await readHtmlVideo(file);
        if (mounted.current) insert.current?.(block);
      } else {
        const reference = await readReference(file);
        const scale = Math.min(480 / reference.width, 360 / reference.height, 1);
        if (mounted.current) insert.current?.({ id: crypto.randomUUID(), kind: 'image', value: { src: reference.src, alt: reference.name, caption: '', alignment: 'center', width: 100 }, editor: { widthPx: reference.width * scale, height: reference.height * scale, appearance: { imageFit: 'contain' } } });
      }
    } catch (reason) { setError((reason as Error).message); }
    finally { readingFile.current = false; if (mounted.current) setReading(false); }
  };
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (!active || event.defaultPrevented || busy || reading) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable="true"], [role="dialog"]')) return;
      const file = Array.from(event.clipboardData?.items ?? []).find(item => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
        ?? Array.from(event.clipboardData?.files ?? []).find(item => item.type.startsWith('image/'));
      if (!file) return;
      event.preventDefault(); void loadImage(file);
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, [active, busy, reading, loadImage]);
  const importSource = async (file:File) => {
    setError('');
    try {
      if (file.size > 100_000_000) throw new Error('This source file is too large.');
      const parsed = assetSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw new Error('This is not a valid Asset asset source file.');
      const image = new Image(); image.src = parsed.data.reference.src; await image.decode();
      if (image.naturalWidth !== parsed.data.reference.width || image.naturalHeight !== parsed.data.reference.height) throw new Error('The source image dimensions do not match the file.');
      const next = { ...parsed.data, id: crypto.randomUUID(), updatedAt: Date.now() };
      await saveAsset(owner, next); navigate(`/assets/${next.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not open this source file.'); }
  };
  const exportImage = async () => {
    if (!asset || !exportBoard.current || exporting) return;
    setExporting(true); setError('');
    try { await exportPng(exportBoard.current, asset); }
    catch { setError('Could not export the image. Please retry; you can also download the editable source.'); }
    finally { setExporting(false); }
  };
  const newAsset = async () => {
    stop(); lastRequest.current=undefined; setVisual(undefined); await saves.current;
    setLibraryOpen(false);
    if (id) navigate('/assets/new');
    else { const next=starterAsset(); put(next);  setError(''); setInstructions(''); past.current = []; future.current = []; setRecent(await listAssets(owner)); }
  };
  const runtime:WorkspaceRuntime={
    title:asset?.title??'Asset',content:null,
    state:{enabled:false,messages:assetMessages(asset).filter(message=>messageWorkspaceChat(message)===chatState.active.id),userId:readStudioConfig()?.user?.id,chats:[],activeChatId:chatState.active.id,manageDisabled:busy||!!queued.length,working:busy?generationStage:undefined,error,retryable:!!lastRequest.current,queued},
    send:(prompt,visual,sources=[])=>{const request={id:Date.now(),prompt,visual,sources,chatId:chatState.active.id};if(controller.current)setQueued(items=>[...items,request]);else void refine(request);},
    chat:()=>{},
    action:(action,id)=>{if(action==='stop')stop();else if(action==='retry'&&lastRequest.current)void refine(lastRequest.current);else if(action==='dismiss')setError('');else if(action==='remove')setQueued(items=>items.filter(item=>item.id!==id));},

  };
  const canvasToolbar = asset && <div className="lovable-canvas-toolbar">
    <Input className="lovable-design-title" aria-label="Asset name" maxLength={100} disabled={busy} value={asset.title} onChange={event=>{if(event.target.value.trim())change({...asset,title:event.target.value});}}/>
    <div className="lovable-canvas-tools">
      <Button variant="ghost" aria-label="Open asset library" aria-pressed={libraryOpen} leadingIcon={<Icon name="library" size={16}/>} onClick={()=>setLibraryOpen(value=>!value)}/>
      <HtmlPresentationTools primitivesOnly/>
      <Dropdown align="end" value={asset.format} items={Object.entries(formats).map(([id,item])=>({id,label:item.label,leadingIcon:<Icon name={id==='square'?'square':'rectangle-horizontal'} size={16} style={id==='portrait'?{transform:'rotate(90deg)'}:undefined}/>}))} onChange={value=>{change(resizeAsset({...asset,editor:nativeDocument(asset)},value as AssetFormat));setZoom(0);}} trigger={<Button variant="ghost" disabled={busy} className="asset-format-trigger" aria-label={`Canvas format: ${formats[asset.format].label}`} leadingIcon={<Icon name={asset.format==='square'?'square':'rectangle-horizontal'} size={16} style={asset.format==='portrait'?{transform:'rotate(90deg)'}:undefined}/>} trailingIcon={<Icon name="chevron-down" size={14}/>}/>}/>
      <span className="asset-tools-divider" aria-hidden="true"/>
      <Button className="lovable-mobile-design-toggle" variant="ghost" aria-label="Open design panel" leadingIcon={<Icon name="sliders-horizontal" size={16}/>} onClick={()=>setDesignOpen(value=>!value)}/>
      <Dropdown align="end" items={[{id:'png',label:`.png · ${assetDimensions(asset).width} × ${assetDimensions(asset).height}`,leadingIcon:<Icon name="image" size={16}/>},{id:'source',label:'Editable source',leadingIcon:<Icon name="file-text" size={16}/>}]} onChange={value=>{if(value==='png')void exportImage();else exportSource(asset);}} trigger={<Button variant="primary" disabled={busy} loading={exporting}>Export</Button>}/>
    </div>
  </div>;
  return <WorkspaceRuntimeContext.Provider value={runtime}><WorkspaceSelectionContext.Provider value={{visual,setVisual}}><div className="workspace-editor asset-app" data-asset data-view="editor" style={assetTheme as CSSProperties} data-history={historyVersion} onDragOver={event => { if (!event.defaultPrevented && !(event.target as Element).closest('.we-chat') && event.dataTransfer.types.includes('Files') && !busy) { event.preventDefault(); setDragging(true); } }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={event => { if(event.defaultPrevented || (event.target as Element).closest('.we-chat'))return; event.preventDefault(); setDragging(false); void loadImage(event.dataTransfer.files[0]); }}>
    <input ref={upload} type="file" hidden accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/ogg,video/quicktime,.asset.json,.json" aria-label="Upload image, video or editable source" onChange={event => { void loadImage(event.target.files?.[0]); event.target.value = ''; }} />

    {(error||loadError) && <div className="asset-notice" role="alert"><Icon name="circle-alert" size={16} /><span>{error||loadError}</span><Button variant="ghost" size="sm" aria-label="Dismiss error" onClick={() => {setError('');setLoadError('');}} leadingIcon={<Icon name="x" size={16} />} /></div>}
    {loading ? <div className="asset-empty"><p role="status">Opening your asset…</p></div> : !asset ? <AssetHome reading={reading} onBrowse={() => upload.current?.click()}>
      {(recentLoading || recent.length > 0) && <AssetRecents loading={recentLoading}>{recent.map(item=><AssetLibraryCard key={item.id} asset={item} onOpen={()=>navigate(`/assets/${item.id}`)}/>)}</AssetRecents>}
    </AssetHome> : <>
      <div className="we-body asset-workspace">{libraryOpen ? <AssetLibrary onClose={()=>setLibraryOpen(false)} onNew={()=>void newAsset()}/> : <WorkspaceChat singleAsset placeholder="Ask Lovable…"/>}<AssetCanvas toolbar={canvasToolbar} asset={asset} onChange={change} preview={false} busy={busy} zoom={zoom} onZoom={setZoom} />
        <AssetDesignPanel mobileOpen={designOpen} onClose={()=>setDesignOpen(false)} asset={asset} onChange={change} onImport={() => upload.current?.click()}/>
      </div>
      <div className="asset-export-host" aria-hidden="true"><Artwork ref={exportBoard} asset={reviewCandidate??asset} /></div>
    </>}
    {dragging && <div className="asset-drop-overlay"><Icon name="upload" size={32} /><strong>Drop your image or video</strong></div>}
  </div></WorkspaceSelectionContext.Provider></WorkspaceRuntimeContext.Provider>;
}
