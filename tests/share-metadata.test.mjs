import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {workspaceShares,shareOrigin,workspaceFromPath} from '../shared/shareMetadata.mjs';
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
