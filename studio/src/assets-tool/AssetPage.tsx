import {MakerDesignProvider} from './MakerDesignContext';
import {graphicEventFormat,applyCommunityContrast} from './communityGraphic';
import {techStarterAsset} from './techAsset';
import {brandStarterAsset,isAppStudioAsset} from './brandAsset';
import {isScreenDemo} from './screenDemoModel';
import {ScreenImageMenu} from './ScreenImageMenu';
import {partnerLogoRequest} from '../../../shared/partnerLogo.mjs';
import {isBrandReviewRequest} from '../../../shared/brandReview.mjs';
import {brandChatStatus,prepareBrandReview,rebuildBrandAsset} from './brandReview';
import {partnerLogoTarget,layoutPartnershipLogo,partnershipIdentityInk} from './brandLogo';
import {prepareChatPartnerLogo} from './partnerLogoChat';
import {animationChatStatus,animationRequest,planCanvasAnimation} from './studioAnimation';
import {animationCanvasKey,routesToAnimation,isAnimationFollowUp,requestedAnimationSteps} from '../../../shared/studioAnimation.mjs';
import {requestsAppStudioTemplate} from '../../../shared/brandTemplates.mjs';
import {studioWorkspace,studioLastAssetKey,studioOwner} from './workspace';
import {CommunityTypographyContext} from '../studio/PresentationElementDesign';
import {localChatStatus,localChatRequest,requestLocalDesign,materializeLocalPlan,communityPlanReplies,communityCanvasImages} from './localCommunityChat';
import {ambassadorAsset,migrateCommunityAsset} from './ambassadorAsset';
import {ambassadorDefaultFormat,ambassadorFormats} from '../../../src/ambassadors/catalog.js';
import {communityBlocks,communityTemplate,communitySettings,syncCommunityDocument} from './communityDocument';
import {CommunityRenderErrors,useCommunityRendering} from './CommunityRendering';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, ColorPickerPaletteProvider, Dropdown, Icon, Input, PageHeader, Tooltip } from '@asset/ui';
import { assetPalette, communityPalette } from './palette';
import { useStudioSession } from '../studio/StudioSessions';
import { assetTheme } from './websiteTokens';
import { readStudioConfig, studioApi } from '../studio/client';

import { AssetCanvas } from './AssetCanvas';
import {workspaceTemplateAsset} from './assetTemplates';
import {assetPages,currentAnimationSequence,linkAssetPages,restoreAssetArrangement,animateAssetPages,insertAssetPages,replaceAssetPage,moveAssetPages,removeAssetPages,duplicateAssetPages,MAX_ASSET_PAGES} from './assetSeries';
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
import { defaultCanvasAnimation, assetSchema, assetDimensions, compositionSchema, formats, resizeAsset, referenceDocument, type AssetDocument, type AssetFormat, type Composition } from './model';
import { download, exportPng, renderPng, exportSource, exportCollectionSource, readReference, visionReference } from './media';
import { listAssets, loadAssetCollection, saveAsset, saveAssets } from './storage';
import './assets.css';
import {AssetScreenMenu} from './AssetScreenMenu';
import {canExportAnimation,canExportVideoAsset} from './assetPlayback';
import {assetCollectionSchema,editableAssetCollection} from './assetCollection';
import {listenForFileDragEnd} from '../studio/fileDragLifecycle';

const locationSearch = () => window.location.search;

type AssetRequest = {id:number;prompt:string;visual?:WorkspaceVisual;sources:StudioSource[];recorded?:boolean;chatId?:string};

export default function AssetPage() {
  return <CommunityTypographyContext.Provider value={studioWorkspace==='ambassadors'}><ColorPickerPaletteProvider value={studioWorkspace==='ambassadors'?communityPalette:assetPalette}><WorkspaceWidgetHost><HtmlSelectionMode.Provider value={true}><MakerDesignProvider><HtmlEditorInsertProvider><AssetPageContent/></HtmlEditorInsertProvider></MakerDesignProvider></HtmlSelectionMode.Provider></WorkspaceWidgetHost></ColorPickerPaletteProvider></CommunityTypographyContext.Provider>;
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
  useEffect(()=>{const abort=new AbortController();const check=()=>void (studioWorkspace==='ambassadors'?localChatStatus:animationChatStatus)(abort.signal).then(status=>{if(!abort.signal.aborted)setLocalChat({enabled:status.enabled,reason:status.reason??''});});check();window.addEventListener('focus',check);return()=>{abort.abort();window.removeEventListener('focus',check);};},[]);
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
  const [pageArrangement,setPageArrangement]=useState<{ids:string[];restore?:AssetDocument[];activeId:string;anchor:string}|undefined>();
  const undoArrangement=useRef<()=>void>(()=>{});
  const pageHistory=useRef(new Map<string,{past:AssetDocument[];future:AssetDocument[]}>());
  const [designOpen,setDesignOpen]=useState(false);
  const [libraryOpen,setLibraryOpen]=useState(() => new URLSearchParams(locationSearch()).get('panel') === 'library');
  const [reviewCandidate,setReviewCandidate]=useState<AssetDocument>();
  const [generationStage,setGenerationStage]=useState('Designing your asset…');
  const [generationPreview,setGenerationPreview]=useState<AssetDocument>();
  const [saveState, setSaveState] = useState(''), [exporting, setExporting] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number>();
  const videoExportAbort = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => videoExportAbort.current?.abort(), []);
  const [dragging, setDragging] = useState(false);
  useEffect(() => listenForFileDragEnd(() => setDragging(false)), []);
  const [loading, setLoading] = useState(!!id || !!requestedBadge);
  useEffect(()=>{
    if(asset?.id&&!loading)window.parent.postMessage({type:studioWorkspace==='tech-blog'?'lovable-tech-asset':studioWorkspace==='lovable'?'lovable-brand-asset':studioWorkspace==='partners'?'lovable-partner-asset':'lovable-community-asset',id:asset.id},window.location.origin);
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
  const sourceUpload = useRef<HTMLInputElement>(null), sourceAfter = useRef<string | undefined>(undefined);
  const readingFile = useRef(false);
  const controller = useRef<AbortController | undefined>(undefined), mounted = useRef(true), operation = useRef(0), saves = useRef(Promise.resolve());


  const put = useCallback((next: AssetDocument) => {
    current.current = next; setAsset(next); setRecent(items=>[next,...items.filter(item=>item.id!==next.id)]); setLoadError(''); try { localStorage.setItem(studioLastAssetKey, next.id); } catch {} setSaveState('Saving…');
    const ownerAtSave = owner;
    // Serial writes avoid a slower earlier write overwriting a later edit.
    saves.current = saves.current.catch(() => {}).then(() => saveAsset(ownerAtSave, next)).then(() => {
      if (mounted.current && current.current === next) setSaveState('Saved on this device');
    }).catch(reason => { if (mounted.current) {setSaveState(reason.message);setError(reason.message);} });
  }, [owner]);
  // Imported Community layers retain their renderer in a mixed collection.
  const communityErrors=useCommunityRendering(asset,current,put,communityBlocks(asset).length>0);
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
  const undo = useCallback(() => { if(pageArrangement&&current.current&&(current.current.id===pageArrangement.activeId?animationCanvasKey(current.current)===pageArrangement.anchor:!past.current.length)){undoArrangement.current();return;}const previous = past.current.pop(); if (!previous || !current.current) return; future.current.push(current.current); put({ ...previous, series:current.current.series, messages:current.current.messages,workspaceChats:current.current.workspaceChats,workspaceActiveChatId:current.current.workspaceActiveChatId, updatedAt: Date.now() }); setHistoryVersion(value => value + 1);  }, [put,pageArrangement]);
  const redo = useCallback(() => { const next = future.current.pop(); if (!next || !current.current) return; past.current.push(current.current); put({ ...next, series:current.current.series, messages:current.current.messages,workspaceChats:current.current.workspaceChats,workspaceActiveChatId:current.current.workspaceActiveChatId, updatedAt: Date.now() }); setHistoryVersion(value => value + 1);  }, [put]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); operation.current++; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const abort=new AbortController();
    const opening=async()=>{
      if(!id)return [];
      const saved=await loadAssetCollection(owner,id);
      if(saved.length||cancelled)return saved;
      const {loadPublishedCollection}=await import('./publishedCollections');
      const shared=await loadPublishedCollection(id,studioWorkspace);
      if(!shared.length||cancelled)return [];
      await saveAssets(owner,shared,{signal:abort.signal,shouldCommit:()=>!cancelled});
      return shared;
    };
    void opening().then(async items => {
      if (cancelled) return; setRecent(()=>current.current?[current.current,...items.filter(item=>item.id!==current.current!.id)]:items);
      if (id && !current.current && !readingFile.current) {
        const found = items.find(item => item.id === id);
        if (!found) { if(studioWorkspace!=='partners'){navigate('/assets/new');return;}const next=starterAsset();current.current=next;setAsset(next); }
        else { const opened=studioWorkspace==='ambassadors'?await migrateCommunityAsset(found):found;if(cancelled)return;current.current=opened;setAsset(opened);setLoadError('');setSaveState('Saved on this device');if(opened!==found)put(opened); }
      }
    }).catch(reason => { if (!cancelled) setError(reason.message); }).finally(() => { if (!cancelled) { if (!requestedBadge) setLoading(false); setRecentLoading(false); } });
    return () => { cancelled = true; abort.abort(); };
  }, [id, owner, requestedBadge]);
  useEffect(() => {
    if (!requestedBadge) return;
    let cancelled = false;
    setLoading(true);
    const opening=async()=>{
      if(import.meta.env.DEV&&studioWorkspace==='lovable'&&requestedBadge==='screen-demo'){
        const {screenDemoAsset}=await import('./screenDemo');
        const next=await screenDemoAsset();
        if(!cancelled)put(next);return;
      }
      if(import.meta.env.DEV&&studioWorkspace==='lovable'&&requestedBadge==='display-ads'){
        const {displayAdsAssets}=await import('./displayAdsAsset');
        const pages=await displayAdsAssets();
        if(cancelled)return;
        await saveAssets(owner,pages,{shouldCommit:()=>!cancelled});
        if(cancelled)return;
        setRecent(pages);put(pages[0]);return;
      }
      if(import.meta.env.DEV&&studioWorkspace==='lovable'&&requestedBadge==='holiday'){
        const {holidayAssets}=await import('./holidayAsset');
        const pages=await holidayAssets();
        if(cancelled)return;
        await saveAssets(owner,pages,{shouldCommit:()=>!cancelled});
        if(cancelled)return;
        setRecent(pages);put(pages[0]);return;
      }
      const next=await (studioWorkspace==='tech-blog'?techStarterAsset():studioWorkspace==='ambassadors'?ambassadorAsset(requestedBadge):studioWorkspace==='lovable'?brandStarterAsset(requestedBadge):badgeAsset(requestedBadge));
      if(!cancelled)put(next);
    };
    void opening()
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
    request={...request,chatId:request.chatId??workspaceChats(current.current,assetMessages(current.current)).active.id};
    const conversation=assetMessages(current.current).filter(message=>messageWorkspaceChat(message)===request.chatId);
    if(request.recorded&&conversation.at(-1)?.user&&conversation.at(-1)?.text===request.prompt)conversation.pop();
    const logoCandidate=studioWorkspace==='lovable'?partnerLogoRequest(request.prompt,request.sources,conversation,request.chatId):null;
    const brandReviewIntent=studioWorkspace==='lovable'&&isBrandReviewRequest(request.prompt,request.sources,!!logoCandidate);
    const logoRequest=brandReviewIntent?null:logoCandidate;
    const screenRequest=import.meta.env.DEV&&studioWorkspace==='lovable'&&isScreenDemo(current.current)&&!brandReviewIntent&&!logoRequest&&!requestsAppStudioTemplate(request.prompt);
    const animationIntent=!brandReviewIntent&&!logoRequest&&routesToAnimation(request.prompt,current.current.messages??[]),animationFollowUp=isAnimationFollowUp(request.prompt,current.current.messages??[]);
    if(!screenRequest&&(studioWorkspace==='ambassadors'||animationIntent)&&!localChat.enabled){setError(localChat.reason||'The chat service is unavailable. Please retry later.');return;}
    setError('');
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
      if(screenRequest){
        const {editImportedScreen,importEditableScreen}=await import('./screenImport');
        const attached=request.sources.find(source=>source.kind==='image');
        const key=animationCanvasKey(document);
        setGenerationStage(attached?'Rebuilding editable layers…':'Updating the component…');
        let result;
        if(attached?.kind==='image'){const image=new Image();image.src=attached.image;await image.decode();active.signal.throwIfAborted();result=await importEditableScreen(document,{name:attached.name,src:attached.image,width:image.naturalWidth,height:image.naturalHeight},active.signal);}
        else result=await editImportedScreen(document,request.prompt,request.visual?.context,active.signal);
        if(!mounted.current||run!==operation.current||active.signal.aborted||current.current?.id!==document.id)return;
        if(animationCanvasKey(current.current)!==key)throw Error('The component changed. Retry to keep your latest edits.');
        change(result.asset);appendMessage({id:crypto.randomUUID(),createdAt:new Date().toISOString(),text:result.summary,user:false,workspaceChatId:request.chatId});
        lastRequest.current=undefined;setVisual(undefined);return;
      }
      if(brandReviewIntent){
        const status=await brandChatStatus(active.signal);if(!status.enabled)throw Error(status.reason||'Brand review is unavailable.');
        const key=animationCanvasKey(document);
        setGenerationStage('Reviewing your artwork…');
        const payload=await prepareBrandReview({...document,messages:conversation},request.prompt,request.sources,active.signal,()=>{
          if(!exportBoard.current)throw Error('Wait for the canvas to load, then retry.');
          return renderPng(exportBoard.current,document);
        },request.visual?.context);
        const result=await rebuildBrandAsset(document,payload,active.signal);
        if(!mounted.current||run!==operation.current||active.signal.aborted||current.current?.id!==document.id)return;
        if(animationCanvasKey(current.current)!==key)throw Error('The canvas changed during the review. Retry to keep your latest edits.');
        change(result.asset);
        appendMessage({id:crypto.randomUUID(),createdAt:new Date().toISOString(),text:result.summary,user:false,workspaceChatId:request.chatId});
        lastRequest.current=undefined;setVisual(undefined);return;
      }
      if(import.meta.env.DEV&&studioWorkspace==='lovable'&&request.prompt.includes('Q5hVpPc6dKxLT5xoi7eYPN')&&/community logo/i.test(request.prompt)&&!request.sources.length){
        const {isHolidayAsset,communityHolidayIdentity,holidayDemoReply}=await import('./holidayAsset');
        if(isHolidayAsset(document)){
          const key=animationCanvasKey(document),stillCurrent=()=>mounted.current&&run===operation.current&&!active.signal.aborted&&animationCanvasKey(current.current)===key;
          await saves.current;
          const collection=assetPages(document,await loadAssetCollection(owner,document.id));
          const reply={id:crypto.randomUUID(),createdAt:new Date().toISOString(),text:holidayDemoReply,user:false,channel:'workspace' as const,workspaceChatId:request.chatId};
          const updated=communityHolidayIdentity(collection).map(page=>isHolidayAsset(page)?{...page,messages:[...assetMessages(document),reply],workspaceChats:document.workspaceChats,workspaceActiveChatId:document.workspaceActiveChatId}:page);
          await saveAssets(owner,updated,{signal:active.signal,shouldCommit:stillCurrent});
          setPageArrangement({ids:collection.map(page=>page.id),restore:collection,activeId:document.id,anchor:animationCanvasKey(updated.find(page=>page.id===document.id))});
          future.current=[];setRecent(updated);put(updated.find(page=>page.id===document.id)!);setHistoryVersion(value=>value+1);
          lastRequest.current=undefined;setVisual(undefined);return;
        }
      }
      if(animationIntent){
        if(request.sources.length)throw Error('Insert the attached artwork on the canvas before asking to animate it.');
        const key=animationCanvasKey(document);
        const sequence=animationFollowUp&&requestedAnimationSteps(request.prompt)===undefined?currentAnimationSequence(assetPages(document,recent),document.id):[];
        const prepared=animationRequest(document,request.prompt,studioWorkspace,request.visual?.context,Math.max(0,MAX_ASSET_PAGES-assetPages(document,recent).length),sequence);
        setGenerationStage('Planning the animation…');
        const {summary,poses,revision}=await planCanvasAnimation(prepared,active.signal);
        const stillCurrent=()=>mounted.current&&run===operation.current&&!active.signal.aborted&&animationCanvasKey(current.current)===key;
        if(!stillCurrent()){active.signal.throwIfAborted();throw Error('The canvas changed while planning. Retry to animate your latest edits.');}
        if(poses.length){
          setGenerationStage('Building the animation…');
          await saves.current;
          const all=await loadAssetCollection(owner,document.id);
          if(!stillCurrent()){active.signal.throwIfAborted();throw Error('The canvas changed while planning. Retry to animate your latest edits.');}
          const collection=assetPages(current.current!,all);
          if(revision&&sequence.some(original=>animationCanvasKey(collection.find(page=>page.id===original.id))!==animationCanvasKey(original)))throw Error('The animation changed while planning. Retry to keep the latest poses.');
          const reply={id:crypto.randomUUID(),createdAt:new Date().toISOString(),text:summary,user:false,channel:'workspace' as const,workspaceChatId:request.chatId};
          const messages=[...assetMessages(current.current),reply].slice(-1000);
          const revised=new Map(poses.map(pose=>[pose.id,{...pose,messages}]));
          const updated=revision?linkAssetPages(collection.map(page=>revised.get(page.id)??page)):replaceAssetPage(collection,document.id,[...revised.values()]);
          // Save every pose and collection membership together; cancellation or a stale
          // canvas aborts before any document is written.
          await saveAssets(owner,updated,{signal:active.signal,shouldCommit:stillCurrent});
          if(!mounted.current||current.current?.id!==document.id)return;
          setPageArrangement({ids:collection.map(page=>page.id),restore:revision?sequence:[document],activeId:document.id,anchor:animationCanvasKey(updated.find(page=>page.id===document.id))});
          future.current=[];setHistoryVersion(value=>value+1);
          setRecent(items=>[...updated,...items.filter(page=>!updated.some(item=>item.id===page.id))]);
          put(updated.find(page=>page.id===document.id)!);
        }else appendMessage({id:crypto.randomUUID(),createdAt:new Date().toISOString(),text:summary,user:false,workspaceChatId:request.chatId});
        lastRequest.current=undefined;setVisual(undefined);return;
      }
      if(studioWorkspace==='lovable'){
        let partnerLogoEdit:StudioMessage['partnerLogoEdit'];
        let reply='Attach an artwork and ask “Make it on-brand” to rebuild it with Lovable’s rules. I can also replace a partner logo, open App Studio, or animate this canvas. This request was not applied.';
        if(logoRequest){
          if(logoRequest.kind==='ambiguous')throw Error('Send one partner website or one logo image at a time.');
          if(logoRequest.kind==='missing')throw Error('Attach the partner logo or include its website address, for example “Replace the partner logo with ramp.com”.');
          const target=partnerLogoTarget(document,request.visual?.context,logoRequest.targetId);
          setGenerationStage('Preparing the partner logo…');
          const [logo,ink]=await Promise.all([prepareChatPartnerLogo(logoRequest,active.signal),partnershipIdentityInk(document.editor!)]);
          if(!mounted.current||run!==operation.current||active.signal.aborted||current.current?.id!==document.id)return;
          const latest=partnerLogoTarget(current.current,`HTML_SELECTION ${JSON.stringify({blockIds:[target.id]})}`);
          if(JSON.stringify(latest)!==JSON.stringify(target))throw Error('The partner logo changed while loading. Retry to keep your latest edits.');
          if(JSON.stringify(current.current.editor)!==JSON.stringify(document.editor))throw Error('The canvas changed while loading. Retry to keep your latest layout.');
          change({...current.current,editor:layoutPartnershipLogo(current.current.editor!,latest.id,logo,ink,assetDimensions(current.current).width)});
          partnerLogoEdit={targetId:target.id};
          reply=`Replaced the partner logo with ${logo.name.replace(/ logo$/i,'')} in white, balanced the lettering and aligned the signature with equal divider gaps.`;
        }else if(request.sources.length){
          reply='Attachments are not applied by this template shortcut. Use the canvas image tool to insert your artwork.';
        }else if(requestsAppStudioTemplate(request.prompt)){
          if(isAppStudioAsset(document))reply='This canvas already uses App Studio. Your current layout and edits are kept.';
          else{
            const next=await brandStarterAsset('app-studio');
            if(!mounted.current||run!==operation.current||active.signal.aborted||current.current?.id!==document.id)return;
            if(JSON.stringify(current.current.editor)!==JSON.stringify(document.editor))throw Error('The canvas changed. Retry to open the template.');
            change({...next,id:document.id,series:document.series,animation:document.animation});setZoom(0);
            reply='The original App Studio banner is ready. The sample event is Atlanta — December 2nd, 2026; edit that line directly on the canvas for your event.';
          }
        }
        appendMessage({id:crypto.randomUUID(),createdAt:new Date().toISOString(),text:reply,user:false,workspaceChatId:request.chatId,...(partnerLogoEdit?{partnerLogoEdit}:{})});
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
      if(!readStudioConfig()?.user){
        appendMessage({id:crypto.randomUUID(),createdAt:new Date().toISOString(),text:'Describe how you want to animate this canvas. I can create editable poses linked by Smart animate.',user:false,workspaceChatId:request.chatId});
        lastRequest.current=undefined;return;
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
    if(busy||error||!queued.length||(studioWorkspace!=='lovable'&&!localChat.enabled&&!readStudioConfig()?.user)||studioWorkspace==='ambassadors'&&!localChat.enabled)return;
    const [request,...rest]=queued;setQueued(rest);void refine(request);
  },[busy,error,queued,localChat.enabled]);
  const stop = () => { setQueued([]); operation.current++; controller.current?.abort(); controller.current = undefined; setBusy(false); setGenerationPreview(undefined); setReviewCandidate(undefined); };
  const loadImage = async (file?: File,editable=false):Promise<boolean> => {
    if (!file || busy || readingFile.current) return false;
    if(file.name.toLowerCase().endsWith('.json')){await importSource(file);return true;}
    readingFile.current = true;
    setReading(true); setError('');
    const importingInto=current.current;
    try {
      if(import.meta.env.DEV&&studioWorkspace==='lovable'&&editable&&importingInto){
        const reference=await readReference(file),active=new AbortController();
        controller.current=active;lastRequest.current=undefined;setBusy(true);setGenerationStage('Rebuilding editable layers…');
        const key=animationCanvasKey(importingInto);
        try{
          const {importEditableScreen}=await import('./screenImport');
          const result=await importEditableScreen(importingInto!,reference,active.signal);
          if(mounted.current&&!active.signal.aborted&&current.current?.id===importingInto?.id){
            if(animationCanvasKey(current.current)!==key)throw Error('The canvas changed during import. Retry to keep your edits.');
            change(result.asset);setVisual(undefined);
          }
        }finally{if(controller.current===active){controller.current=undefined;if(mounted.current)setBusy(false);}}
      } else if (file.type.startsWith('video/') || /\.(mp4|webm|ogv|mov)$/i.test(file.name)) {
        const block = await readHtmlVideo(file);
        if (mounted.current) insert.current?.(block);
      } else {
        const reference = await readReference(file);
        const scale = Math.min(480 / reference.width, 360 / reference.height, 1);
        if (mounted.current) insert.current?.({ id: crypto.randomUUID(), kind: 'image', value: { src: reference.src, alt: reference.name, caption: '', alignment: 'center', width: 100 }, editor: { widthPx: reference.width * scale, height: reference.height * scale, appearance: { imageFit: 'contain' } } });
      }
      return true;
    } catch (reason) { if(mounted.current)setError((reason as Error).message);return false; }
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
  const importSource = async (file:File, afterId?:string) => {
    setError('');
    try {
      if (file.size > 100_000_000) throw new Error('This source file is too large.');
      const input=JSON.parse(await file.text());
      const single=input?.type==='lovable-asset-collection'?undefined:assetSchema.parse(input);
      const collection=single?editableAssetCollection([single],single.id):assetCollectionSchema.parse(input);
      const incoming:AssetDocument[]=[];
      const imageSizes=new Map<string,{width:number;height:number}>();
      for(const document of collection.assets){
        let size=imageSizes.get(document.reference.src);
        if(!size){const image=new Image();image.src=document.reference.src;await image.decode();size={width:image.naturalWidth,height:image.naturalHeight};imageSizes.set(document.reference.src,size);}
        if(size.width!==document.reference.width||size.height!==document.reference.height){
          if(studioWorkspace==='ambassadors'&&communityTemplate(document))document.reference={...document.reference,...size};
          else throw new Error('The source image dimensions do not match the file.');
        }
        const opened=studioWorkspace==='ambassadors'?await migrateCommunityAsset(document):document;
        incoming.push({...opened,series:undefined,id:crypto.randomUUID(),updatedAt:Date.now()});
      }
      const next=incoming[collection.assets.findIndex(page=>page.id===collection.activeId)];
      if(afterId&&current.current){
        await saves.current;
        const previous=current.current,collection=assetPages(previous,await loadAssetCollection(owner,previous.id));
        const updated=insertAssetPages(collection,afterId,incoming);await saveAssets(owner,updated);
        if(!mounted.current)return;
        pageHistory.current.set(previous.id,{past:past.current,future:future.current});past.current=[];future.current=[];
        setPageArrangement({ids:collection.map(page=>page.id),activeId:previous.id,anchor:next.id});
        setRecent(items=>[...updated,...items.filter(page=>!updated.some(item=>item.id===page.id))]);
        put(updated.find(page=>page.id===next.id)!);setVisual(undefined);setReviewCandidate(undefined);setHistoryVersion(value=>value+1);
        return;
      }
      await saveAssets(owner,linkAssetPages(incoming));
      if(studioWorkspace==='ambassadors'){try{localStorage.setItem(studioLastAssetKey,next.id);}catch{}}
      navigate(`/assets/${next.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not open this source file.'); }
  };
  const exportImage = async (scale:1|2=1) => {
    if (!asset || !exportBoard.current || exporting) return;
    setExporting(true); setError('');
    try { await exportPng(exportBoard.current, asset,scale); }
    catch (reason) { setError(studioWorkspace==='ambassadors'&&reason instanceof Error?reason.message:'Could not export the image. Please retry; you can also download the editable source.'); }
    finally { setExporting(false); }
  };
  const exportAnimation = async (mode: 'sequence' | 'asset' = 'sequence') => {
    if (!asset || !exportBoard.current || exporting || (mode === 'asset' ? !canExportVideoAsset(asset) : !canExportAnimation(pages))) return;
    const abort = new AbortController(); videoExportAbort.current = abort;
    setExporting(true); setVideoProgress(0); setError('');
    try {
      const { exportVideo } = await import('./videoExport');
      const result = await exportVideo(structuredClone(mode === 'asset' ? [asset] : pages), exportBoard.current.parentElement!, abort.signal, percent => { if (mounted.current) setVideoProgress(percent); }, mode);
      if (!abort.signal.aborted) download(result.blob, result.name);
    } catch (reason) { if (mounted.current && !abort.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not export the animation. Please retry.'); }
    finally { videoExportAbort.current = undefined; if (mounted.current) { setExporting(false); setVideoProgress(undefined); } }
  };
  const exportAll = async () => {
    if (!asset || !exportBoard.current || exporting) return;
    const abort = new AbortController(); videoExportAbort.current = abort;
    setExporting(true); setVideoProgress(0); setError('');
    try {
      const { exportAssetArchive } = await import('./bulkExport');
      const result = await exportAssetArchive(structuredClone(pages), exportBoard.current.parentElement!, abort.signal, percent => { if (mounted.current) setVideoProgress(percent); });
      if (!abort.signal.aborted) download(result.blob, result.name);
    } catch (reason) { if (mounted.current && !abort.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not export the collection. Please retry.'); }
    finally { videoExportAbort.current = undefined; if (mounted.current) { setExporting(false); setVideoProgress(undefined); } }
  };
  const newAsset = async () => {
    stop(); lastRequest.current=undefined; setVisual(undefined); await saves.current;
    setLibraryOpen(false);
    if (id) navigate('/assets/new');
    else { const next=studioWorkspace==='tech-blog'?await techStarterAsset():studioWorkspace==='ambassadors'?await ambassadorAsset():studioWorkspace==='lovable'?await brandStarterAsset():starterAsset(); put(next);  setError(''); setInstructions(''); past.current = []; future.current = []; setRecent(await listAssets(owner)); }
  };
  const runtime:WorkspaceRuntime={
    title:asset?.title??'Asset',content:null,
    state:{enabled:studioWorkspace==='lovable'||localChat.enabled,messages:assetMessages(asset).filter(message=>messageWorkspaceChat(message)===chatState.active.id),userId:readStudioConfig()?.user?.id,chats:[],activeChatId:chatState.active.id,manageDisabled:busy||!!queued.length,working:busy?generationStage:undefined,error:error||loadError,retryable:!!lastRequest.current,queued},
    send:(prompt,visual,sources=[])=>{const request={id:Date.now(),prompt,visual,sources,chatId:chatState.active.id};if(controller.current)setQueued(items=>[...items,request]);else void refine(request);},
    chat:()=>{},
    action:(action,id)=>{if(action==='stop')stop();else if(action==='retry'&&lastRequest.current)void refine(lastRequest.current);else if(action==='dismiss'){setError('');setLoadError('');}else if(action==='remove')setQueued(items=>items.filter(item=>item.id!==id));},

  };
  const template=communitySettings(asset),templateFormat=asset?.community?.layout==='graphic'?graphicEventFormat:ambassadorFormats.find(format=>format.id===template?.format);
  const switchBrandTemplate=async(templateId:string)=>{
    const previous=current.current;if(!previous||changingTemplate)return;
    setChangingTemplate(true);setError('');
    try{const next=await brandStarterAsset(templateId);if(mounted.current&&current.current?.id===previous.id){change({...next,id:previous.id,series:previous.series,animation:previous.animation,messages:previous.messages});setVisual(undefined);setZoom(0);}}
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
  const openAssetPage=(pageId:string)=>{
    if(busy||addingPage||changingTemplate||pageId===current.current?.id)return;
    const next=pages.find(page=>page.id===pageId);if(!next)return;
    if(current.current)pageHistory.current.set(current.current.id,{past:past.current,future:future.current});
    const history=pageHistory.current.get(pageId);past.current=history?.past??[];future.current=history?.future??[];
    put(next);setVisual(undefined);setReviewCandidate(undefined);setHistoryVersion(value=>value+1);
  };
  const addAssetPage=async(afterId:string,kind:string)=>{
    if(busy||addingPage||changingTemplate||!current.current)return;
    if(kind==='source'){sourceAfter.current=afterId;sourceUpload.current?.click();return;}
    setAddingPage(true);setError('');
    try{
      await saves.current;
      const all=await listAssets(owner),collection=assetPages(current.current,all),source=collection.find(page=>page.id===afterId);
      if(!source)throw Error('The selected asset is no longer available.');
      if(kind==='animate'){
        const result=animateAssetPages(collection,afterId,defaultCanvasAnimation);
        await saveAssets(owner,result.pages);
        if(!mounted.current)return;
        pageHistory.current.set(current.current.id,{past:past.current,future:future.current});
        const history=pageHistory.current.get(source.id)??{past:[],future:[]};
        pageHistory.current.set(source.id,{past:[...history.past.slice(-49),source],future:[]});
        const activeHistory=pageHistory.current.get(result.activeId);
        past.current=activeHistory?.past??[];future.current=activeHistory?.future??[];
        setPageArrangement(undefined);setRecent([...result.pages,...all.filter(page=>!result.pages.some(item=>item.id===page.id))]);
        put(result.pages.find(page=>page.id===result.activeId)!);
        setVisual(undefined);setReviewCandidate(undefined);setHistoryVersion(value=>value+1);
        return;
      }
      let next:AssetDocument;
      if(kind==='blank'||kind==='duplicate'){
        next=structuredClone(source);next.id=crypto.randomUUID();next.updatedAt=Date.now();next.title=kind==='blank'?'Untitled asset':`${source.title.slice(0,93)} · Copy`;
        if(kind==='blank'){
          const editor=structuredClone(nativeDocument(source));
          for(const page of editor.pages)for(const section of page.sections)section.columns=section.columns.map(()=>[]);
          next={...next,editor,community:undefined,layouts:undefined};
        }
      }else next=await workspaceTemplateAsset(studioWorkspace,kind,source);
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
  const renameAssetPage=(pageId:string,title:string)=>{
    if(!title.trim()||busy||addingPage)return;
    const page=pages.find(item=>item.id===pageId);if(!page)return;
    if(page.id===current.current?.id){change({...page,title});return;}
    const next={...page,title:title.trim().slice(0,100),updatedAt:Date.now()};
    const history=pageHistory.current.get(page.id)??{past:[],future:[]};
    pageHistory.current.set(page.id,{past:[...history.past.slice(-49),page],future:[]});
    setRecent(items=>items.map(item=>item.id===pageId?next:item));
    saves.current=saves.current.then(()=>saveAsset(owner,next)).catch(reason=>setError(reason.message));
  };
  const arrangeAssetPages=async(action:'move'|'remove'|'undo',pageIds:string[]=[],targetId?:string,side:'before'|'after'='before')=>{
    if(busy||addingPage||changingTemplate||!current.current)return;
    setAddingPage(true);setError('');
    try{
      await saves.current;
      const all=await listAssets(owner),collection=assetPages(current.current,all);
      let next:AssetDocument[],detached:AssetDocument[]=[];
      if(action==='undo'){
        if(!pageArrangement)return;
        const restored=restoreAssetArrangement(collection,all,pageArrangement.ids,pageArrangement.restore);
        next=restored.pages;detached=restored.detached;
      }else if(action==='move')next=moveAssetPages(collection,pageIds,targetId!,side);
      else{
        const removed=removeAssetPages(collection,pageIds);
        next=removed.pages;detached=removed.detached;
        if(next===collection)return;
      }
      if(!next.length)return;
      await saveAssets(owner,[...next,...detached]);
      if(!mounted.current)return;
      setRecent([...next,...detached,...all.filter(page=>![...next,...detached].some(item=>item.id===page.id))]);
      const selected=next.find(page=>page.id===current.current!.id)??next[Math.min(collection.findIndex(page=>pageIds.includes(page.id)),next.length-1)]??next[0];
      setPageArrangement(action==='undo'?undefined:{ids:collection.map(page=>page.id),activeId:selected.id,anchor:animationCanvasKey(selected)});
      if(selected.id!==current.current.id){
        pageHistory.current.set(current.current.id,{past:past.current,future:future.current});
        const history=pageHistory.current.get(selected.id);past.current=history?.past??[];future.current=history?.future??[];
      }
      put(selected);setVisual(undefined);setHistoryVersion(value=>value+1);
    }catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'Could not update the asset order.');}
    finally{if(mounted.current)setAddingPage(false);}
  };
  undoArrangement.current=()=>void arrangeAssetPages('undo');
  const duplicatePages=async(ids:string[])=>{
    if(busy||addingPage||changingTemplate||!current.current)return;
    setAddingPage(true);setError('');
    try{
      await saves.current;
      const all=await listAssets(owner),collection=assetPages(current.current,all),result=duplicateAssetPages(collection,ids);
      await saveAssets(owner,result.pages);
      if(!mounted.current)return;
      pageHistory.current.set(current.current.id,{past:past.current,future:future.current});past.current=[];future.current=[];
      setPageArrangement({ids:collection.map(page=>page.id),activeId:result.ids[0],anchor:animationCanvasKey(result.pages.find(page=>page.id===result.ids[0]))});
      setRecent([...result.pages,...all.filter(page=>!result.pages.some(item=>item.id===page.id))]);
      put(result.pages.find(page=>page.id===result.ids[0])!);setVisual(undefined);setHistoryVersion(value=>value+1);
      return result.ids;
    }catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'Could not duplicate these assets.');}
    finally{if(mounted.current)setAddingPage(false);}
  };
  const screenMode=import.meta.env.DEV&&studioWorkspace==='lovable'&&isScreenDemo(asset);
  const canvasToolbar = asset && <div className="lovable-canvas-toolbar">
    <Input className="lovable-design-title" aria-label="Asset name" maxLength={100} disabled={busy} value={asset.title} onChange={event=>{if(event.target.value.trim())change({...asset,title:event.target.value});}}/>
    <div className="lovable-canvas-tools">


      <AssetLibrary open={libraryOpen} onOpenChange={setLibraryOpen}/>
      <HtmlPresentationTools primitivesOnly imageTool={import.meta.env.DEV&&studioWorkspace==='lovable'?<ScreenImageMenu key={asset.id} disabled={busy||reading||changingTemplate||exporting} onImport={loadImage}/>:undefined}/>
      {studioWorkspace==='lovable'&&<Dropdown align="end" value={screenMode?undefined:isAppStudioAsset(asset)?'app-studio':'collaboration'} items={[{id:'collaboration',label:'Partnership'},{id:'app-studio',label:'App Studio'}]} onChange={value=>void switchBrandTemplate(value)} trigger={<Button variant="ghost" disabled={busy||changingTemplate} aria-label="Lovable template" trailingIcon={<Icon name="chevron-down" size={14}/>}>Template</Button>}/>}
      {studioWorkspace==='ambassadors'?<Dropdown align="end" value={templateFormat?.id} items={[...ambassadorFormats,graphicEventFormat].map(format=>({id:format.id,label:format.name,leadingIcon:<Icon name={format.width===format.height?'square':'rectangle-horizontal'} size={16} style={format.width<format.height?{transform:'rotate(90deg)'}:undefined}/>}))} onChange={value=>void switchCommunityTemplate(value)} trigger={<Button variant="ghost" disabled={busy||changingTemplate||exporting} className="asset-format-trigger" aria-label={`Community template: ${templateFormat?.name??'Custom'}`} trailingIcon={<Icon name="chevron-down" size={14}/>}>{templateFormat?.name??'Template'}</Button>}/>:<Dropdown align="end" value={asset.format} items={Object.entries(formats).map(([id,item])=>({id,label:item.label,leadingIcon:<Icon name={id==='square'?'square':'rectangle-horizontal'} size={16} style={id==='portrait'?{transform:'rotate(90deg)'}:undefined}/>}))} onChange={value=>{change(resizeAsset({...asset,editor:nativeDocument(asset)},value as AssetFormat,import.meta.env.DEV&&asset.editor?.pages.some(page=>page.sections.some(section=>section.columns.flat().some(block=>block.id==='holiday-motif')))));setZoom(0);}} trigger={<Button variant="ghost" disabled={busy} className="asset-format-trigger" aria-label={`Canvas format: ${formats[asset.format].label}`} leadingIcon={<Icon name={asset.format==='square'?'square':'rectangle-horizontal'} size={16} style={asset.format==='portrait'?{transform:'rotate(90deg)'}:undefined}/>} trailingIcon={<Icon name="chevron-down" size={14}/>}/>}/>}
      <span className="asset-tools-divider" aria-hidden="true"/>
      <Button className="lovable-mobile-design-toggle" variant="ghost" aria-label="Open design panel" leadingIcon={<Icon name="sliders-horizontal" size={16}/>} onClick={()=>setDesignOpen(value=>!value)}/>
      {studioWorkspace==='ambassadors'&&<Tooltip label="Coming soon" side="bottom"><span className="studio-insert-tool"><Button variant="ghost" className="community-add-template" disabled>Add to templates</Button></span></Tooltip>}
      {videoProgress !== undefined ? <Tooltip label="Cancel export" side="bottom"><Button className="asset-export-control asset-export-progress" variant="primary" aria-label={`Cancel export, ${videoProgress}%`} onClick={() => videoExportAbort.current?.abort()}>Export<span className="asset-export-progress-value" aria-hidden="true">{videoProgress}%<Icon name="x" size={12}/></span></Button></Tooltip> : <Dropdown align="end" items={[...[1,2].map(scale=>({id:scale===1?'png':'png-2x',label:`.png · ${scale}× · ${assetDimensions(asset).width*scale} × ${assetDimensions(asset).height*scale}`,leadingIcon:<Icon name="image" size={16}/>})),...(canExportVideoAsset(asset)?[{id:'video-asset',label:'Video · Current asset',leadingIcon:<Icon name="video" size={16}/>}]:[]),...(canExportAnimation(pages)?[{id:'video',label:'Video · All assets',leadingIcon:<Icon name="video" size={16}/>}]:[]),{id:'source',label:'Editable source',leadingIcon:<Icon name="file-text" size={16}/>},...(pages.length>1?[{id:'collection-source',label:'All editable sources',leadingIcon:<Icon name="files" size={16}/>},{id:'all',label:'All assets · ZIP',leadingIcon:<Icon name="archive" size={16}/>}]:[])]} onChange={value=>{if(value==='png')void exportImage();else if(value==='png-2x')void exportImage(2);else if(value==='video-asset')void exportAnimation('asset');else if(value==='video')void exportAnimation();else if(value==='all')void exportAll();else if(value==='collection-source')exportCollectionSource(pages,asset.id);else exportSource(asset);}} trigger={<Button className="asset-export-control" variant="primary" disabled={busy||changingTemplate||exporting} loading={exporting}>Export</Button>}/>}
    </div>
  </div>;
  return <CommunityRenderErrors.Provider value={communityErrors}><WorkspaceRuntimeContext.Provider value={runtime}><WorkspaceSelectionContext.Provider value={{visual,setVisual}}><div className="workspace-editor asset-app" data-asset data-workspace={studioWorkspace} data-view="editor" style={assetTheme as CSSProperties} data-history={historyVersion} onDragOverCapture={event => { if ((event.target as Element).closest('.we-chat')) setDragging(false); }} onDragOver={event => { if (!event.defaultPrevented && !(event.target as Element).closest('.we-chat') && event.dataTransfer.types.includes('Files') && !busy) { event.preventDefault(); setDragging(true); } }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={event => { setDragging(false); if(event.defaultPrevented || (event.target as Element).closest('.we-chat'))return; event.preventDefault(); void loadImage(event.dataTransfer.files[0]); }}>
    <input ref={upload} type="file" hidden accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/ogg,video/quicktime,.asset.json,.json" aria-label="Upload image, video or editable source" onChange={event => { void loadImage(event.target.files?.[0]); event.target.value = ''; }} />
    <input ref={sourceUpload} type="file" hidden accept=".asset.json,.json" aria-label="Import editable source into collection" onChange={event=>{const file=event.target.files?.[0],after=sourceAfter.current;event.target.value='';sourceAfter.current=undefined;if(file&&after)void importSource(file,after);}}/>


    {loading ? <div className="asset-empty"><p role="status">Opening your asset…</p></div> : !asset ? <div className="we-body asset-workspace"><WorkspaceChat singleAsset/><AssetHome reading={reading} onBrowse={() => upload.current?.click()}>
      {(recentLoading || recent.length > 0) && <AssetRecents loading={recentLoading}>{recent.map(item=><AssetLibraryCard key={item.id} asset={item} onOpen={()=>navigate(`/assets/${item.id}`)}/>)}</AssetRecents>}
    </AssetHome></div> : <>
      <div className="we-body asset-workspace"><WorkspaceChat singleAsset preserveSourceTransparency={studioWorkspace!=='partners'} placeholder={screenMode?'Edit or animate the component…':'Work with Studio...'}/><AssetCanvas toolbar={canvasToolbar} asset={generationPreview??asset} pages={generationPreview?pages.map(page=>page.id===asset.id?generationPreview:page):pages} generating={busy} busy={busy||addingPage||changingTemplate} zoom={zoom} onZoom={setZoom} onChange={change} onOpen={openAssetPage} onAdd={(afterId,kind)=>void addAssetPage(afterId,kind)} onOverview={()=>setVisual(undefined)} onDuplicate={duplicatePages} onRename={renameAssetPage} onMove={(pageId,targetId,side)=>void arrangeAssetPages('move',pageId,targetId,side)} onRemove={pageId=>void arrangeAssetPages('remove',pageId)}/>
        <AssetDesignPanel mobileOpen={designOpen} onClose={()=>setDesignOpen(false)} asset={asset} onChange={change} onImport={() => upload.current?.click()}/>
      </div>
      <div className="asset-export-host" aria-hidden="true"><Artwork ref={exportBoard} asset={reviewCandidate??asset} /></div>
    </>}
    {dragging && <div className="asset-drop-overlay"><Icon name="upload" size={20} /><strong>Drop your image or video</strong></div>}
  </div></WorkspaceSelectionContext.Provider></WorkspaceRuntimeContext.Provider></CommunityRenderErrors.Provider>;
}
