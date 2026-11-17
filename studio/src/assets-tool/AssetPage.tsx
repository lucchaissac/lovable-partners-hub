import {graphicEventFormat,applyCommunityContrast} from './communityGraphic';
import {techStarterAsset} from './techAsset';
import {brandStarterAsset,isAppStudioAsset} from './brandAsset';
import {requestsAppStudioTemplate} from '../../../shared/brandTemplates.mjs';
import {studioWorkspace,studioLastAssetKey,studioOwner} from './workspace';
import {CommunityTypographyContext} from '../studio/PresentationElementDesign';
import {localCommunityChatAvailable,localChatStatus,localChatRequest,requestLocalDesign,materializeLocalPlan,communityPlanReplies,communityCanvasImages} from './localCommunityChat';
import {ambassadorAsset,migrateCommunityAsset} from './ambassadorAsset';
import {ambassadorDefaultFormat,ambassadorFormats} from '../../../src/ambassadors/catalog.js';
import {communityTemplate,communitySettings,syncCommunityDocument} from './communityDocument';
import {CommunityRenderErrors,useCommunityRendering} from './CommunityRendering';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, ColorPickerPaletteProvider, Dropdown, Icon, Input, PageHeader, Tooltip } from '@asset/ui';
import { assetPalette, communityPalette } from './palette';
import { useStudioSession } from '../studio/StudioSessions';
import { assetTheme } from './websiteTokens';
import { readStudioConfig, studioApi } from '../studio/client';

import { AssetCanvas } from './AssetCanvas';
import {CommunityCanvas} from './CommunityCanvas';
import {assetPages,insertAssetPages,replaceAssetPage,linkAssetPages,moveAssetPage,MAX_ASSET_PAGES} from './assetSeries';
import { AssetLibrary } from './AssetLibrary';
import { badgeAsset, starterAsset } from './starter';
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
import { listAssets, loadAssetCollection, saveAsset, saveAssets } from './storage';
import './assets.css';
import {AssetScreenMenu} from './AssetScreenMenu';

const locationSearch = () => window.location.search;

type AssetRequest = {id:number;prompt:string;visual?:WorkspaceVisual;sources:StudioSource[];recorded?:boolean;chatId?:string};

export default function AssetPage() {
  return <CommunityTypographyContext.Provider value={studioWorkspace==='ambassadors'}><ColorPickerPaletteProvider value={studioWorkspace==='ambassadors'?communityPalette:assetPalette}><WorkspaceWidgetHost><HtmlSelectionMode.Provider value={true}><HtmlEditorInsertProvider><AssetPageContent/></HtmlEditorInsertProvider></HtmlSelectionMode.Provider></WorkspaceWidgetHost></ColorPickerPaletteProvider></CommunityTypographyContext.Provider>;
}
function AssetPageContent() {
  const { active } = useStudioSession();
  const insert = useHtmlEditorInsert();
  const { id } = useParams(), navigate = useNavigate(), location=useLocation();
  const owner = studioOwner(readStudioConfig()?.user?.id);
  const requestedBadge = !id ? (new URLSearchParams(location.search).get('badge') || (studioWorkspace==='tech-blog'?'cover':studioWorkspace==='ambassadors'?ambassadorDefaultFormat:studioWorkspace==='lovable'?'collaboration':null)) : null;
  const [asset, setAsset] = useState<AssetDocument | undefined>(() => id || requestedBadge ? undefined : starterAsset()), current = useRef<AssetDocument | undefined>(asset);
  const [recent, setRecent] = useState<AssetDocument[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [instructions, setInstructions] = useState('');
  const [localChat,setLocalChat]=useState({enabled:false,reason:''});
  useEffect(()=>{if(studioWorkspace!=='ambassadors'||!localCommunityChatAvailable)return;const abort=new AbortController();const check=()=>void localChatStatus(abort.signal).then(status=>{if(!abort.signal.aborted)setLocalChat({enabled:status.enabled,reason:status.reason??''});});check();window.addEventListener('focus',check);return()=>{abort.abort();window.removeEventListener('focus',check);};},[]);
  const [visual, setVisual] = useState<WorkspaceVisual>();
  const [queued, setQueued] = useState<AssetRequest[]>([]);
  const lastRequest = useRef<AssetRequest | undefined>(undefined);
  const startedOnOpen=useRef(false);

  const assetMessages=(document?:AssetDocument):StudioMessage[] => (document?.messages??[]).map(message=>({...message,channel:'workspace',workspaceChatId:'workspace'}));
  const chatState=workspaceChats({},assetMessages(asset));
  const [loadError,setLoadError]=useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [reading, setReading] = useState(false);

  const [zoom,setZoom]=useState(0);
  const [changingTemplate,setChangingTemplate]=useState(false);
  const [addingPage,setAddingPage]=useState(false);
  const [pageArrangement,setPageArrangement]=useState<string[]|undefined>();
  const pageHistory=useRef(new Map<string,{past:AssetDocument[];future:AssetDocument[]}>());
  const [designOpen,setDesignOpen]=useState(false);
  const [libraryOpen,setLibraryOpen]=useState(() => new URLSearchParams(locationSearch()).get('panel') === 'library');
  const [reviewCandidate,setReviewCandidate]=useState<AssetDocument>();
  const [generationStage,setGenerationStage]=useState('Designing your asset…');
  const [generationPreview,setGenerationPreview]=useState<AssetDocument>();
  const [saveState, setSaveState] = useState(''), [exporting, setExporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(!!id || !!requestedBadge);
  useEffect(()=>{
    if(studioWorkspace!=='partners'&&asset?.id&&!loading)window.parent.postMessage({type:studioWorkspace==='tech-blog'?'lovable-tech-asset':studioWorkspace==='lovable'?'lovable-brand-asset':'lovable-community-asset',id:asset.id},window.location.origin);
  },[asset?.id,loading]);
  // Reveal only after the document, font and artwork have reached their final first layout.
  useEffect(() => {
    if (loading) return;
    let cancelled=false,first=0,second=0;
    const images=[...document.querySelectorAll<HTMLImageElement>('.asset-artwork[data-editable] img')];
    const posters=[...document.querySelectorAll<HTMLVideoElement>('.asset-artwork[data-editable] video[poster]')].map(video=>{const image=new Image();image.src=video.poster;return image;});
    void Promise.all([document.fonts.ready,...[...images,...posters].map(image=>image.decode().catch(()=>{}))]).then(()=>{
      if(cancelled)return;
      first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{if(!cancelled)window.parent.postMessage({type:'lovable-studio-ready'},window.location.origin);});});
    });
    return()=>{cancelled=true;cancelAnimationFrame(first);cancelAnimationFrame(second);};
  },[loading,asset?.id]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const numberScrub=useRef<string|undefined>(undefined);
  const past = useRef<AssetDocument[]>([]), future = useRef<AssetDocument[]>([]);
  const upload = useRef<HTMLInputElement>(null), exportBoard = useRef<HTMLDivElement>(null);
  const readingFile = useRef(false);
  const controller = useRef<AbortController | undefined>(undefined), mounted = useRef(true), operation = useRef(0), saves = useRef(Promise.resolve());


  const put = useCallback((next: AssetDocument) => {
    current.current = next; setAsset(next); if(studioWorkspace==='ambassadors')setRecent(items=>[next,...items.filter(item=>item.id!==next.id)]); setLoadError(''); try { localStorage.setItem(studioLastAssetKey, next.id); } catch {} setSaveState('Saving…');
    const ownerAtSave = owner;
    // Serial writes avoid a slower earlier write overwriting a later edit.
    saves.current = saves.current.catch(() => {}).then(() => saveAsset(ownerAtSave, next)).then(() => {
      if (mounted.current && current.current === next) setSaveState('Saved on this device');
    }).catch(reason => { if (mounted.current) {setSaveState(reason.message);setError(reason.message);} });
  }, [owner]);
  const communityErrors=useCommunityRendering(asset,current,put,studioWorkspace==='ambassadors');
  useEffect(() => { if (!id && current.current) put(current.current); }, []);
  const change = useCallback((next: AssetDocument) => {
    if (current.current && JSON.stringify(current.current) === JSON.stringify(next)) return;
    if(studioWorkspace==='ambassadors'){next=syncCommunityDocument(next,current.current);if(next.community?.autoContrast&&next.background!==current.current?.background)next=applyCommunityContrast(next);}
    const oldTemplate=communitySettings(current.current),newTemplate=communitySettings(next);
    if(studioWorkspace==='ambassadors'&&oldTemplate&&newTemplate&&next.title===current.current?.title){
      const oldName=current.current?.community?.layout==='graphic'?graphicEventFormat.name:ambassadorFormats.find(format=>format.id===oldTemplate.format)!.name;
      if(next.title===`${oldName} · ${oldTemplate.city||'Community'}`)next={...next,title:`${next.community?.layout==='graphic'?graphicEventFormat.name:ambassadorFormats.find(format=>format.id===newTemplate.format)!.name} · ${newTemplate.city||'Community'}`};
    }
    const parsed = assetSchema.safeParse({ ...next, messages:current.current?.messages ?? next.messages, workspaceChats:current.current?.workspaceChats??next.workspaceChats,workspaceActiveChatId:current.current?.workspaceActiveChatId??next.workspaceActiveChatId, updatedAt: Date.now() });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Check the asset dimensions.'); return; }
    const scrub=document.documentElement.dataset.numberScrubbing;
    if (current.current&&(!scrub||scrub!==numberScrub.current)) past.current = [...past.current.slice(-49), current.current];
    numberScrub.current=scrub;
    future.current = []; put(parsed.data); setHistoryVersion(value => value + 1);
  }, [put]);
  const undo = useCallback(() => { const previous = past.current.pop(); if (!previous || !current.current) return; future.current.push(current.current); put({ ...previous, series:current.current.series, messages:current.current.messages,workspaceChats:current.current.workspaceChats,workspaceActiveChatId:current.current.workspaceActiveChatId, updatedAt: Date.now() }); setHistoryVersion(value => value + 1);  }, [put]);
  const redo = useCallback(() => { const next = future.current.pop(); if (!next || !current.current) return; past.current.push(current.current); put({ ...next, series:current.current.series, messages:current.current.messages,workspaceChats:current.current.workspaceChats,workspaceActiveChatId:current.current.workspaceActiveChatId, updatedAt: Date.now() }); setHistoryVersion(value => value + 1);  }, [put]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); operation.current++; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const opening=studioWorkspace==='ambassadors'?(id?loadAssetCollection(owner,id):Promise.resolve([])):listAssets(owner);
    void opening.then(async items => {
      if (cancelled) return; setRecent(items);
      if (id && !current.current && !readingFile.current) {
        const found = items.find(item => item.id === id);
        if (!found) { if(studioWorkspace!=='partners'){navigate('/assets/new');return;}const next=starterAsset();current.current=next;setAsset(next); }
        else { const opened=studioWorkspace==='ambassadors'?await migrateCommunityAsset(found):found;if(cancelled)return;current.current=opened;setAsset(opened);setLoadError('');setSaveState('Saved on this device');if(opened!==found)put(opened); }
      }
    }).catch(reason => { if (!cancelled) setError(reason.message); }).finally(() => { if (!cancelled) { if (!requestedBadge) setLoading(false); setRecentLoading(false); } });
    return () => { cancelled = true; };
  }, [id, owner, requestedBadge]);
  useEffect(() => {
    if (!requestedBadge) return;
    let cancelled = false;
    setLoading(true);
    void (studioWorkspace==='tech-blog'?techStarterAsset():studioWorkspace==='ambassadors'?ambassadorAsset(requestedBadge):studioWorkspace==='lovable'?brandStarterAsset(requestedBadge):badgeAsset(requestedBadge)).then(next => { if (!cancelled) put(next); })
      .catch(reason => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [requestedBadge, put]);
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
    if(studioWorkspace==='ambassadors'&&!localChat.enabled){setError(localChat.reason||'Chat is available in the local demo only.');return;}
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
      if(studioWorkspace==='lovable'){
        let reply='Ask me to make a banner for App Studio to open its original template. You can edit the event details directly on the canvas.';
        if(request.sources.length){
          reply='Attachments are not applied by this template shortcut. Use the canvas image tool to insert your artwork.';
        }else if(requestsAppStudioTemplate(request.prompt)){
          if(isAppStudioAsset(document))reply='This canvas already uses App Studio. Your current layout and edits are kept.';
          else{
            const next=await brandStarterAsset('app-studio');
            if(!mounted.current||run!==operation.current||active.signal.aborted||current.current?.id!==document.id)return;
            if(JSON.stringify(current.current.editor)!==JSON.stringify(document.editor))throw Error('The canvas changed. Retry to open the template.');
            change({...next,id:document.id});setZoom(0);
            reply='The original App Studio banner is ready. The sample event is Atlanta — December 2nd, 2026; edit that line directly on the canvas for your event.';
          }
        }
        appendMessage({id:crypto.randomUUID(),createdAt:new Date().toISOString(),text:reply,user:false,workspaceChatId:request.chatId});
        lastRequest.current=undefined;setVisual(undefined);return;
      }
      if(!exportBoard.current)throw new Error('The asset is still opening. Please retry.');
      if(studioWorkspace==='ambassadors'&&localChat.enabled){
        // Existing editable layers describe the composition; a full export before every
        // message delays even a simple text change. Only a visual audit needs it.
        const needsPreview=/\b(review|analyse|analyze|inspect|audit|critique)\b/i.test(request.prompt);
        const rendered=needsPreview?await visionReference({name:'Current asset',src:await renderPng(exportBoard.current,document),...assetDimensions(document)}):undefined;
        const payload=localChatRequest(document,request.prompt,request.sources,request.visual?.context,rendered?.src,Math.max(0,MAX_ASSET_PAGES-assetPages(document,recent).length));
        payload.canvasImages=await communityCanvasImages(document,request.visual?.context);
        setGenerationStage(request.sources.some(source=>source.kind==='image')?'Reviewing your asset…':'Designing your asset…');
        const {plan,media,preserveGeometry}=await requestLocalDesign(payload,active.signal,async preview=>{
          setGenerationStage('Preparing the image…');
          const drafts=await materializeLocalPlan(preview.plan,document,request.sources,active.signal,[],{preview:true,preserveGeometry:preview.preserveGeometry});
          if(mounted.current&&run===operation.current&&!active.signal.aborted&&drafts[0])setGenerationPreview({...drafts[0],id:document.id});
        });
        setGenerationStage('Building your canvas…');
        const designs=await materializeLocalPlan(plan,document,request.sources,active.signal,media,{preserveGeometry});
        if(JSON.stringify([current.current?.editor,current.current?.dimensions,current.current?.background])!==JSON.stringify([document.editor,document.dimensions,document.background]))throw Error('The canvas changed during generation. Retry to keep your latest edits.');
        if(!mounted.current||run!==operation.current||current.current?.id!==document.id)return;
        if(plan.designs.length||plan.badgeBatch){
          const replies:StudioMessage[]=communityPlanReplies(plan,payload).map(text=>({id:crypto.randomUUID(),createdAt:new Date().toISOString(),text,user:false,channel:'workspace',workspaceChatId:request.chatId}));
          for(const design of designs)design.messages=[...assetMessages(current.current),...replies];
          await saves.current;
          const collection=(plan.replaceCurrent?replaceAssetPage:insertAssetPages)(assetPages(current.current,await listAssets(owner)),current.current.id,designs);
          await saveAssets(owner,collection);
          if(!mounted.current||run!==operation.current||active.signal.aborted)return;
          if(plan.replaceCurrent){past.current=[...past.current.slice(-49),current.current];future.current=[];}
          else{pageHistory.current.set(current.current.id,{past:past.current,future:future.current});past.current=[];future.current=[];}
          setHistoryVersion(value=>value+1);
          setPageArrangement(undefined);put(collection.find(page=>page.id===(plan.replaceCurrent?document.id:designs[0].id))!);setRecent(await listAssets(owner));setZoom(0);
          // Keep this editor session mounted so undo and queued messages survive creation.
          // put() records the new draft as the last-open asset for reopening the studio.
        }else{
          if(plan.edits.length||plan.removeIds.length)change(designs[0]);
          for(const text of communityPlanReplies(plan,payload))appendMessage({id:crypto.randomUUID(),createdAt:new Date().toISOString(),text,user:false,workspaceChatId:request.chatId});
        }
        lastRequest.current=undefined;setVisual(undefined);return;
      }
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
      if(run===operation.current){controller.current=undefined;if(mounted.current){setBusy(false);setGenerationPreview(undefined);}}
    }
  };
  useEffect(()=>{
    if(busy||error||!queued.length||(studioWorkspace!=='lovable'&&!readStudioConfig()?.user)||studioWorkspace==='ambassadors'&&!localChat.enabled)return;
    const [request,...rest]=queued;setQueued(rest);void refine(request);
  },[busy,error,queued,localChat.enabled]);
  const stop = () => { setQueued([]); operation.current++; controller.current?.abort(); controller.current = undefined; setBusy(false); setGenerationPreview(undefined); setReviewCandidate(undefined); };
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
      if (image.naturalWidth !== parsed.data.reference.width || image.naturalHeight !== parsed.data.reference.height) {
        if(studioWorkspace==='ambassadors'&&communityTemplate(parsed.data))parsed.data.reference={...parsed.data.reference,width:image.naturalWidth,height:image.naturalHeight};
        else throw new Error('The source image dimensions do not match the file.');
      }
      const opened=studioWorkspace==='ambassadors'?await migrateCommunityAsset(parsed.data):parsed.data;
      const next = { ...opened, series:undefined, id: crypto.randomUUID(), updatedAt: Date.now() };
      await saveAsset(owner, next);
      if(studioWorkspace==='ambassadors'){try{localStorage.setItem(studioLastAssetKey,next.id);}catch{}}
      navigate(`/assets/${next.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not open this source file.'); }
  };
  const exportImage = async () => {
    if (!asset || !exportBoard.current || exporting) return;
    setExporting(true); setError('');
    try { await exportPng(exportBoard.current, asset); }
    catch (reason) { setError(studioWorkspace==='ambassadors'&&reason instanceof Error?reason.message:'Could not export the image. Please retry; you can also download the editable source.'); }
    finally { setExporting(false); }
  };
  const newAsset = async () => {
    stop(); lastRequest.current=undefined; setVisual(undefined); await saves.current;
    setLibraryOpen(false);
    if (id) navigate('/assets/new');
    else { const next=studioWorkspace==='tech-blog'?await techStarterAsset():studioWorkspace==='ambassadors'?await ambassadorAsset():studioWorkspace==='lovable'?await brandStarterAsset():starterAsset(); put(next);  setError(''); setInstructions(''); past.current = []; future.current = []; setRecent(await listAssets(owner)); }
  };
  const runtime:WorkspaceRuntime={
    title:asset?.title??'Asset',content:null,
    state:{enabled:studioWorkspace==='lovable'||studioWorkspace==='ambassadors'&&localChat.enabled,messages:assetMessages(asset).filter(message=>messageWorkspaceChat(message)===chatState.active.id),userId:readStudioConfig()?.user?.id,chats:[],activeChatId:chatState.active.id,manageDisabled:busy||!!queued.length,working:busy?generationStage:undefined,error,retryable:!!lastRequest.current,queued},
    send:(prompt,visual,sources=[])=>{const request={id:Date.now(),prompt,visual,sources,chatId:chatState.active.id};if(controller.current)setQueued(items=>[...items,request]);else void refine(request);},
    chat:()=>{},
    action:(action,id)=>{if(action==='stop')stop();else if(action==='retry'&&lastRequest.current)void refine(lastRequest.current);else if(action==='dismiss')setError('');else if(action==='remove')setQueued(items=>items.filter(item=>item.id!==id));},

  };
  const template=communitySettings(asset),templateFormat=asset?.community?.layout==='graphic'?graphicEventFormat:ambassadorFormats.find(format=>format.id===template?.format);
  const switchBrandTemplate=async(templateId:string)=>{
    const previous=current.current;if(!previous||changingTemplate)return;
    setChangingTemplate(true);setError('');
    try{const next=await brandStarterAsset(templateId);if(mounted.current&&current.current?.id===previous.id){change({...next,id:previous.id,messages:previous.messages});setVisual(undefined);setZoom(0);}}
    catch(reason){setError(reason instanceof Error?reason.message:'Could not open this template.');}
    finally{if(mounted.current)setChangingTemplate(false);}
  };
  const switchCommunityTemplate=async(formatId:string)=>{
    const previous=current.current;if(!previous||changingTemplate)return;
    setChangingTemplate(true);setError('');
    try{
      const oldTemplate=communitySettings(previous),next=await ambassadorAsset(formatId,oldTemplate);
      if(!mounted.current||current.current?.id!==previous.id)return;
      const automaticTitle=oldTemplate?`${previous.community?.layout==='graphic'?graphicEventFormat.name:ambassadorFormats.find(format=>format.id===oldTemplate.format)!.name} · ${oldTemplate.city||'Community'}`:previous.title;
      change({...previous,...next,id:previous.id,series:previous.series,title:previous.title===automaticTitle?next.title:previous.title,community:next.community,layouts:undefined});setZoom(0);
    }catch(reason){setError(reason instanceof Error?reason.message:'Could not open this template.');}
    finally{if(mounted.current)setChangingTemplate(false);}
  };
  const pages=asset?assetPages(asset,recent):[];
  const openCommunityPage=(pageId:string)=>{
    if(busy||addingPage||changingTemplate||pageId===current.current?.id)return;
    const next=pages.find(page=>page.id===pageId);if(!next)return;
    if(current.current)pageHistory.current.set(current.current.id,{past:past.current,future:future.current});
    const history=pageHistory.current.get(pageId);past.current=history?.past??[];future.current=history?.future??[];
    put(next);setVisual(undefined);setReviewCandidate(undefined);setHistoryVersion(value=>value+1);
  };
  const addCommunityPage=async(afterId:string,kind:string)=>{
    if(busy||addingPage||changingTemplate||!current.current)return;
    setAddingPage(true);setError('');
    try{
      await saves.current;
      const all=await listAssets(owner),collection=assetPages(current.current,all),source=collection.find(page=>page.id===afterId);
      if(!source)throw Error('The selected asset is no longer available.');
      let next:AssetDocument;
      if(kind==='blank'||kind==='duplicate'){
        next=structuredClone(source);next.id=crypto.randomUUID();next.updatedAt=Date.now();next.title=kind==='blank'?'Untitled asset':`${source.title.slice(0,93)} · Copy`;
        if(kind==='blank'){
          const editor=structuredClone(nativeDocument(source));
          for(const page of editor.pages)for(const section of page.sections)section.columns=section.columns.map(()=>[]);
          next={...next,editor,community:undefined,layouts:undefined};
        }
      }else next=await ambassadorAsset(kind,communitySettings(source));
      await saves.current;
      const latest=assetPages(current.current,await listAssets(owner));
      const updated=insertAssetPages(latest,afterId,[next]);await saveAssets(owner,updated);
      if(!mounted.current)return;
      pageHistory.current.set(current.current.id,{past:past.current,future:future.current});past.current=[];future.current=[];
      setPageArrangement(undefined);setRecent([...updated,...all.filter(page=>!updated.some(item=>item.id===page.id))]);put(updated.find(page=>page.id===next.id)!);
      setVisual(undefined);setReviewCandidate(undefined);setZoom(0);setHistoryVersion(value=>value+1);
    }catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'Could not add this asset.');}
    finally{if(mounted.current)setAddingPage(false);}
  };
  const renameCommunityPage=(pageId:string,title:string)=>{
    if(!title.trim()||busy||addingPage)return;
    const page=pages.find(item=>item.id===pageId);if(!page)return;
    if(page.id===current.current?.id){change({...page,title});return;}
    const next={...page,title:title.trim().slice(0,100),updatedAt:Date.now()};
    const history=pageHistory.current.get(page.id)??{past:[],future:[]};
    pageHistory.current.set(page.id,{past:[...history.past.slice(-49),page],future:[]});
    setRecent(items=>items.map(item=>item.id===pageId?next:item));
    saves.current=saves.current.then(()=>saveAsset(owner,next)).catch(reason=>setError(reason.message));
  };
  const arrangeCommunityPages=async(action:'move'|'remove'|'undo',pageId?:string,targetId?:string,side:'before'|'after'='before')=>{
    if(busy||addingPage||changingTemplate||!current.current)return;
    setAddingPage(true);setError('');
    try{
      await saves.current;
      const all=await listAssets(owner),collection=assetPages(current.current,all);
      let next:AssetDocument[],detached:AssetDocument[]=[];
      if(action==='undo'){
        if(!pageArrangement)return;
        const documents=new Map([...all,current.current].map(page=>[page.id,page]));
        next=linkAssetPages(pageArrangement.flatMap(id=>documents.has(id)?[documents.get(id)!]:[]));
      }else if(action==='move')next=moveAssetPage(collection,pageId!,targetId!,side);
      else{
        if(collection.length<=1)return;
        detached=collection.filter(page=>page.id===pageId).map(page=>({...page,series:undefined}));
        next=linkAssetPages(collection.filter(page=>page.id!==pageId));
      }
      if(!next.length)return;
      await saveAssets(owner,[...next,...detached]);
      if(!mounted.current)return;
      setPageArrangement(action==='undo'?undefined:collection.map(page=>page.id));
      setRecent([...next,...detached,...all.filter(page=>![...next,...detached].some(item=>item.id===page.id))]);
      const selected=next.find(page=>page.id===current.current!.id)??next[Math.min(collection.findIndex(page=>page.id===pageId),next.length-1)]??next[0];
      if(selected.id!==current.current.id){
        pageHistory.current.set(current.current.id,{past:past.current,future:future.current});
        const history=pageHistory.current.get(selected.id);past.current=history?.past??[];future.current=history?.future??[];
      }
      put(selected);setVisual(undefined);setHistoryVersion(value=>value+1);
    }catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'Could not update the asset order.');}
    finally{if(mounted.current)setAddingPage(false);}
  };
  const canvasToolbar = asset && <div className="lovable-canvas-toolbar">
    <Input className="lovable-design-title" aria-label="Asset name" maxLength={100} disabled={busy} value={asset.title} onChange={event=>{if(event.target.value.trim())change({...asset,title:event.target.value});}}/>
    <div className="lovable-canvas-tools">


      <AssetLibrary open={libraryOpen} onOpenChange={setLibraryOpen}/>
      <HtmlPresentationTools primitivesOnly/>
      {studioWorkspace==='lovable'&&<Dropdown align="end" value={isAppStudioAsset(asset)?'app-studio':'collaboration'} items={[{id:'collaboration',label:'Lovable × Cerebras'},{id:'app-studio',label:'App Studio'}]} onChange={value=>void switchBrandTemplate(value)} trigger={<Button variant="ghost" disabled={busy||changingTemplate} aria-label="Lovable template" trailingIcon={<Icon name="chevron-down" size={14}/>}>Template</Button>}/>}
      {studioWorkspace==='ambassadors'?<Dropdown align="end" value={templateFormat?.id} items={[...ambassadorFormats,graphicEventFormat].map(format=>({id:format.id,label:format.name,leadingIcon:<Icon name={format.width===format.height?'square':'rectangle-horizontal'} size={16} style={format.width<format.height?{transform:'rotate(90deg)'}:undefined}/>}))} onChange={value=>void switchCommunityTemplate(value)} trigger={<Button variant="ghost" disabled={busy||changingTemplate||exporting} className="asset-format-trigger" aria-label={`Community template: ${templateFormat?.name??'Custom'}`} trailingIcon={<Icon name="chevron-down" size={14}/>}>{templateFormat?.name??'Template'}</Button>}/>:<Dropdown align="end" value={asset.format} items={Object.entries(formats).map(([id,item])=>({id,label:item.label,leadingIcon:<Icon name={id==='square'?'square':'rectangle-horizontal'} size={16} style={id==='portrait'?{transform:'rotate(90deg)'}:undefined}/>}))} onChange={value=>{change(resizeAsset({...asset,editor:nativeDocument(asset)},value as AssetFormat));setZoom(0);}} trigger={<Button variant="ghost" disabled={busy} className="asset-format-trigger" aria-label={`Canvas format: ${formats[asset.format].label}`} leadingIcon={<Icon name={asset.format==='square'?'square':'rectangle-horizontal'} size={16} style={asset.format==='portrait'?{transform:'rotate(90deg)'}:undefined}/>} trailingIcon={<Icon name="chevron-down" size={14}/>}/>}/>}
      <span className="asset-tools-divider" aria-hidden="true"/>
      <Button className="lovable-mobile-design-toggle" variant="ghost" aria-label="Open design panel" leadingIcon={<Icon name="sliders-horizontal" size={16}/>} onClick={()=>setDesignOpen(value=>!value)}/>
      {studioWorkspace==='ambassadors'&&<Button variant="ghost" className="community-add-template" disabled title="Coming soon">Add to templates</Button>}
      <Dropdown align="end" items={[{id:'png',label:`.png · ${assetDimensions(asset).width} × ${assetDimensions(asset).height}`,leadingIcon:<Icon name="image" size={16}/>},{id:'source',label:'Editable source',leadingIcon:<Icon name="file-text" size={16}/>}]} onChange={value=>{if(value==='png')void exportImage();else exportSource(asset);}} trigger={<Button variant="primary" disabled={busy||changingTemplate} loading={exporting}>Export</Button>}/>
    </div>
  </div>;
  return <CommunityRenderErrors.Provider value={communityErrors}><WorkspaceRuntimeContext.Provider value={runtime}><WorkspaceSelectionContext.Provider value={{visual,setVisual}}><div className="workspace-editor asset-app" data-asset data-workspace={studioWorkspace} data-view="editor" style={assetTheme as CSSProperties} data-history={historyVersion} onDragOver={event => { if (!event.defaultPrevented && !(event.target as Element).closest('.we-chat') && event.dataTransfer.types.includes('Files') && !busy) { event.preventDefault(); setDragging(true); } }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={event => { if(event.defaultPrevented || (event.target as Element).closest('.we-chat'))return; event.preventDefault(); setDragging(false); void loadImage(event.dataTransfer.files[0]); }}>
    <input ref={upload} type="file" hidden accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/ogg,video/quicktime,.asset.json,.json" aria-label="Upload image, video or editable source" onChange={event => { void loadImage(event.target.files?.[0]); event.target.value = ''; }} />

    {(error||loadError) && <div className="asset-notice" role="alert"><Icon name="circle-alert" size={16} /><span>{error||loadError}</span><Button variant="ghost" size="sm" aria-label="Dismiss error" onClick={() => {setError('');setLoadError('');}} leadingIcon={<Icon name="x" size={16} />} /></div>}
    {loading ? <div className="asset-empty"><p role="status">Opening your asset…</p></div> : !asset ? <AssetHome reading={reading} onBrowse={() => upload.current?.click()}>
      {(recentLoading || recent.length > 0) && <AssetRecents loading={recentLoading}>{recent.map(item=><AssetLibraryCard key={item.id} asset={item} onOpen={()=>navigate(`/assets/${item.id}`)}/>)}</AssetRecents>}
    </AssetHome> : <>
      <div className="we-body asset-workspace"><WorkspaceChat singleAsset preserveSourceTransparency={studioWorkspace!=='partners'} placeholder="Ask Lovable…"/>{studioWorkspace==='ambassadors'?<CommunityCanvas toolbar={canvasToolbar} asset={generationPreview??asset} pages={generationPreview?pages.map(page=>page.id===asset.id?generationPreview:page):pages} generating={busy} busy={busy||addingPage||changingTemplate} zoom={zoom} onZoom={setZoom} onChange={change} onOpen={openCommunityPage} onAdd={(afterId,kind)=>void addCommunityPage(afterId,kind)} onOverview={()=>setVisual(undefined)} onRename={renameCommunityPage} onMove={(pageId,targetId,side)=>void arrangeCommunityPages('move',pageId,targetId,side)} onRemove={pageId=>void arrangeCommunityPages('remove',pageId)} onUndoArrangement={pageArrangement?()=>void arrangeCommunityPages('undo'):undefined}/>:<AssetCanvas toolbar={canvasToolbar} asset={asset} onChange={change} preview={false} busy={busy} zoom={zoom} onZoom={setZoom} />}
        <AssetDesignPanel mobileOpen={designOpen} onClose={()=>setDesignOpen(false)} asset={asset} onChange={change} onImport={() => upload.current?.click()}/>
      </div>
      <div className="asset-export-host" aria-hidden="true"><Artwork ref={exportBoard} asset={reviewCandidate??asset} /></div>
    </>}
    {dragging && <div className="asset-drop-overlay"><Icon name="upload" size={32} /><strong>Drop your image or video</strong></div>}
  </div></WorkspaceSelectionContext.Provider></WorkspaceRuntimeContext.Provider></CommunityRenderErrors.Provider>;
}
