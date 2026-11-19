// Prepare one explicitly requested, immutable snapshot from the UI's full
// collection export. Native layers and their original image bytes stay intact.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {join,resolve} from 'node:path';

const [input,slug,workspace='lovable']=process.argv.slice(2);
if(!input||!slug||!/^[a-z0-9-]+$/.test(slug)||!['lovable','partners','ambassadors','tech-blog'].includes(workspace))throw Error('Usage: node scripts/publish-asset-collection.mjs absolute-collection.json unique-slug workspace');
const source=JSON.parse(await readFile(resolve(input),'utf8'));
if(source.type!=='lovable-asset-collection'||!source.assets?.length)throw Error('Export all editable sources from the studio first.');
const root=resolve('public/collections'),manifestPath=join(root,'index.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
if(manifest.collections.some(item=>item.source===`/collections/${slug}.json`))throw Error('Published snapshots are immutable. Choose a new slug.');
await mkdir(join(root,'media'),{recursive:true});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const ids=new Map(source.assets.map(asset=>[asset.id,randomUUID()]));
const references={},imageFiles=new Map();
async function externalize(value){
  if(typeof value==='string'&&/^data:(image\/(?:png|jpeg|webp|svg\+xml)|video\/(?:mp4|webm));base64,/.test(value)){
    const [,type,payload]=value.match(/^data:([^;]+);base64,(.*)$/s);
    const bytes=Buffer.from(payload,'base64'),hash=digest(bytes),ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/svg+xml':'svg','video/mp4':'mp4','video/webm':'webm'}[type];
    const path=`/collections/media/${hash}.${ext}`;
    if(!imageFiles.has(path)){await writeFile(join(root,'media',`${hash}.${ext}`),bytes);imageFiles.set(path,hash);}
    return path;
  }
  if(Array.isArray(value))return Promise.all(value.map(externalize));
  if(value&&typeof value==='object')return Object.fromEntries(await Promise.all(Object.entries(value).map(async([key,item])=>[key,await externalize(item)])));
  return value;
}
const assets=[];
for(const original of source.assets){
  const asset=structuredClone(original),referenceKey=digest(JSON.stringify(asset.reference));
  references[referenceKey]=asset.reference;asset.reference=referenceKey;
  // The requested publication contains artwork, not the local demo conversation.
  delete asset.messages;delete asset.workspaceChats;delete asset.workspaceActiveChatId;
  asset.id=ids.get(original.id);asset.series=source.assets.map(item=>({id:ids.get(item.id),title:item.title}));
  assets.push(await externalize(asset));
}
const published={...source,activeId:ids.get(source.activeId),assets,references};
await writeFile(join(root,`${slug}.json`),JSON.stringify(published));
manifest.collections.push({workspace,source:`/collections/${slug}.json`,assetIds:assets.map(asset=>asset.id)});
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
const route=workspace==='lovable'?'brand/':workspace==='ambassadors'?'ambassadors/':workspace==='tech-blog'?'tech-blog/':'';
console.log(JSON.stringify({url:`https://lovable-brands.vercel.app/brand#${route}create/${published.activeId}`,slug,assets:assets.length,activeId:published.activeId,idMap:Object.fromEntries(ids),mediaFiles:[...imageFiles.keys()]},null,2));
