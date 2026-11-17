import {studioWorkspace,studioLastAssetKey} from './assets-tool/workspace';
import {ambassadorDefaultFormat} from '../../src/ambassadors/catalog.js';
import {StrictMode,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Navigate,Route,Routes,useLocation} from 'react-router-dom';
import AssetPage from './assets-tool/AssetPage';
import './styles.css';
import './studio/studio.css';
import './app.css';
import './lovable.css';
function App(){const location=useLocation();useEffect(()=>{const themeChanged=(event:MessageEvent)=>{if(event.origin===window.location.origin&&event.source===window.parent&&event.data?.type==='lovable-studio-theme')document.documentElement.dataset.theme=event.data.theme==='light'?'light':'dark';};window.addEventListener('message',themeChanged);return()=>{window.removeEventListener('message',themeChanged);};},[]);return <Routes><Route path="/assets/new" element={<AssetPage key={location.pathname+location.search}/>}/><Route path="/assets/:id" element={<AssetPage key={location.pathname}/>}/><Route path="*" element={<Navigate to="/assets/new" replace/>}/></Routes>;}
let lastAsset: string | null = null;
try { lastAsset=localStorage.getItem(studioLastAssetKey); } catch {}
const entryParams = new URLSearchParams(window.location.search);
const requestedBadge = entryParams.get('badge');
const requestedAsset = studioWorkspace==='ambassadors'&&/^[a-f0-9-]{36}$/i.test(entryParams.get('asset')??'')?entryParams.get('asset'):null;
const requestedStarter = studioWorkspace==='partners' && entryParams.get('starter')==='grow-your-business';
const initialRoute = requestedAsset ? `/assets/${requestedAsset}` : requestedStarter ? '/assets/new' : requestedBadge ? `/assets/new?badge=${encodeURIComponent(requestedBadge)}` : lastAsset ? `/assets/${lastAsset}` : studioWorkspace==='ambassadors'?`/assets/new?badge=${ambassadorDefaultFormat}`:'/assets/new';
createRoot(document.getElementById('root')!).render(<StrictMode><MemoryRouter initialEntries={[initialRoute]}><App/></MemoryRouter></StrictMode>);
