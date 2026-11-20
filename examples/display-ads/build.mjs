import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'vite';
import sharp from 'sharp';

// Regeneration uses fresh IDs and writes separately from a user's saved edits.
const root=new URL('../../',import.meta.url);
const source=await readFile(new URL('gradient.png',import.meta.url));
const metadata=await sharp(source).metadata();
// Do not invalidate the live studio's optimized dependency cache.
const cacheDir=await mkdtemp(join(tmpdir(),'display-ads-vite-'));
const server=await createServer({root:root.pathname,cacheDir,configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
try {
  const {buildDisplayAdsAssets}=await server.ssrLoadModule('/studio/src/assets-tool/displayAdsAsset.ts');
  const {editableAssetCollection}=await server.ssrLoadModule('/studio/src/assets-tool/assetCollection.ts');
  const assets=buildDisplayAdsAssets({name:'Display ad · Original gradient',src:`data:image/png;base64,${source.toString('base64')}`,width:metadata.width,height:metadata.height});
  const collection=editableAssetCollection(assets,assets[0].id);
  await writeFile(process.argv[2]??'/tmp/display-ads-300x250.collection.json',JSON.stringify(collection,null,2)+'\n');
  console.log(`Validated ${assets.length} editable 300 × 250 canvases; ${assets[0].editor.pages[0].sections[0].columns[0].length} native layers each.`);
} finally {await server.close();await rm(cacheDir,{recursive:true,force:true});}
