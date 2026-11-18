import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {workspaceShares,shareOrigin,workspaceFromPath} from '../shared/shareMetadata.mjs';
test('the shared root opens Lovable while explicit workspace links keep their destination',async()=>{
 const html=await readFile('dist/index.html','utf8');
 assert.equal(workspaceFromPath('/'),'lovable');
 assert.ok(html.includes('<title>Lovable</title>'));
 assert.ok(html.includes('content="https://lovable-brands.vercel.app/share/lovable.jpg?v=1"'));
 const bootstrap=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(script=>script.includes('if(location.hash)return'));
 for(const [pathname,hash,expected] of [['/','','/#brand/gallery'],['/partners','','/partners#gallery'],['/community','','/community#ambassadors/gallery'],['/','#guidelines/color',undefined]]){
  let destination;
  runInNewContext(bootstrap,{location:{pathname,hash,search:''},history:{state:null,replaceState:(_state,_title,url)=>{destination=url;}}});
  assert.equal(destination,expected);
 }
});
test('each production share link has its own crawlable image, title and gallery route',async()=>{
 for(const [key,share] of Object.entries(workspaceShares)){
  assert.equal(workspaceFromPath(share.path+'/'),key);
  const html=await readFile(`dist${share.path}/index.html`,'utf8');
  assert.ok(html.includes(`<title>${share.title}</title>`));
  assert.ok(html.includes(`property="og:url" content="${shareOrigin}${share.path}"`));
  assert.ok(html.includes(`property="og:image" content="${shareOrigin}${share.image}?v=1"`));
  assert.ok((await stat(`dist${share.image}`)).size>1000);
  assert.equal(html.includes('property="og:video"'),Boolean(share.video));
 }
});
