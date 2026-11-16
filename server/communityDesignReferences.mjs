import {readFile} from 'node:fs/promises';
import opentype from 'opentype.js';
import {createRenderer,DEFAULTS} from '../src/ambassadors/source/renderer.mjs';
import qrcode from '../src/ambassadors/source/qrcode.js';
import {ambassadorFormats} from '../src/ambassadors/catalog.js';
import {communityCompositionRules,communityLogo,communityWorkingDimensions,communityWorkingCanvasLimit} from '../shared/communityDesignRules.mjs';
const root=new URL('../public/',import.meta.url);
let references;
export function loadCommunityDesignReferences(){return references??=buildReferences().catch(error=>{references=undefined;throw error;});}
async function buildReferences(){
 const font=async path=>{const b=await readFile(new URL(path,root));return opentype.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
 const [bold,regular]=await Promise.all([font('fonts/CameraPlain-Bold.ttf'),font('ambassadors/assets/CameraPlain-Regular.ttf')]);
 const renderer=createRenderer({bold,regular,qrcode,heartOverlay:''});
 return {logo:communityLogo,background:'#1b1b1b',text:'#f7f4ed',maxCanvasSide:communityWorkingCanvasLimit,references:await Promise.all(ambassadorFormats.map(async f=>({
  id:f.id,name:f.name,width:f.width,height:f.height,workingDimensions:communityWorkingDimensions(f.id),rules:communityCompositionRules[f.id],
  // Spotlight is a separate original scene; its gallery image and native layer profile are authoritative.
  layers:f.id==='spotlight'?[]:renderer.layout({...structuredClone(DEFAULTS),format:f.id}).map(({src,text,...layer})=>layer),
  preview:await readFile(new URL(`ambassadors/previews/${f.id}.webp`,root)),
 })))};
}
