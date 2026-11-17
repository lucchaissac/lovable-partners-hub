import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fontFacesForAsset,assetFontFaces} from '../shared/assetTypography.mjs';

const asset=(...families)=>({editor:{pages:[{sections:[{columns:[families.map(fontFamily=>({kind:'text',editor:{appearance:{fontFamily}}}))]}]}]}});

test('Exports embed only the local families used across the document, including serif italics',()=>{
 assert.deepEqual(fontFacesForAsset(asset()).map(face=>face.family),['Camera Plain']);
 const faces=fontFacesForAsset(asset('Bodoni Moda','Pixelify Sans','Bodoni Moda'));
 assert.equal(faces.length,4);
 assert.deepEqual(faces.filter(face=>face.family==='Bodoni Moda').map(face=>face.style),['normal','italic']);
 assert.equal(faces.some(face=>face.family==='Anton'),false);
 assert.equal(fontFacesForAsset(asset('Anton')).find(face=>face.family==='Anton').weight,'400');
});

test('Every export font resolves to a bundled WOFF2, with licenses for the display families',async()=>{
 for(const face of assetFontFaces){
  const bytes=await readFile(new URL(`../public${face.src}`,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'wOF2');
 }
 for(const name of ['bodonimoda','pixelifysans','anton']){
  const license=await readFile(new URL(`../public/fonts/community/${name}-OFL.txt`,import.meta.url),'utf8');
  assert.match(license,/SIL OPEN FONT LICENSE/);
 }
});
