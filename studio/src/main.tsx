import {StrictMode,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Navigate,Route,Routes,useLocation} from 'react-router-dom';
import AssetPage from './assets-tool/AssetPage';
import './styles.css';
import './studio/studio.css';
import './app.css';
import './lovable.css';
function App(){const location=useLocation();useEffect(()=>{const themeChanged=(event:MessageEvent)=>{if(event.origin===window.location.origin&&event.source===window.parent&&event.data?.type==='lovable-studio-theme')document.documentElement.dataset.theme=event.data.theme==='light'?'light':'dark';};window.addEventListener('message',themeChanged);const frame=requestAnimationFrame(()=>window.parent.postMessage({type:'lovable-studio-ready'},window.location.origin));return()=>{cancelAnimationFrame(frame);window.removeEventListener('message',themeChanged);};},[]);return <Routes><Route path="/assets/new" element={<AssetPage key="new"/>}/><Route path="/assets/:id" element={<AssetPage key={location.pathname}/>}/><Route path="*" element={<Navigate to="/assets/new" replace/>}/></Routes>;}
let lastAsset: string | null = null;
try { lastAsset=localStorage.getItem('lovable-studio-last-asset'); } catch {}
createRoot(document.getElementById('root')!).render(<StrictMode><MemoryRouter initialEntries={[lastAsset?`/assets/${lastAsset}`:'/assets/new']}><App/></MemoryRouter></StrictMode>);
