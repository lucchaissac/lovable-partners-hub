import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import opentype from 'opentype.js';
const {parse}=opentype;
import {createRenderer,DEFAULTS,FORMATS,validateDetails,cityLocation} from '../src/ambassadors/source/renderer.mjs';
import qrcode from '../src/ambassadors/source/qrcode.js';
import {ambassadorFormats} from '../src/ambassadors/catalog.js';
import {ambassadorSchema,defaultAmbassador} from '../studio/src/assets-tool/ambassadorSettings.ts';
const font=path=>{const bytes=readFileSync(new URL(path,import.meta.url));return parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));};
const renderer=createRenderer({bold:font('../public/fonts/CameraPlain-Bold.ttf'),regular:font('../public/ambassadors/assets/CameraPlain-Regular.ttf'),qrcode,heartOverlay:''});
test('All six Community templates preserve their source canvas geometry',()=>{
 for(const format of ambassadorFormats){assert.equal(FORMATS[format.id].w,format.width);assert.equal(FORMATS[format.id].h,format.height);const state={...DEFAULTS,...defaultAmbassador(format.id)};const svg=renderer.render(state,{globeImage:'data:image/png;base64,AA==',spotlightImage:'data:image/png;base64,AA=='});assert.ok(svg.includes(`viewBox="0 0 ${format.width} ${format.height}"`));assert.equal(validateDetails(state),'');}
});
test('Editable source round-trips city, multiline copy, portraits and every speaker',()=>{
 const draft={...defaultAmbassador('speakers'),city:'Montreal',title:'Build together.\nIn Montreal.',count:3};draft.speakers[2]={name:'Jo Martin',role:'Designer',photo:'data:image/png;base64,AA=='};
 assert.deepEqual(ambassadorSchema.parse(JSON.parse(JSON.stringify(draft))),draft);
 assert.ok(!ambassadorSchema.safeParse({...draft,photo:'https://example.com/private-photo.jpg'}).success);
});
test('Print QR links reject non-web protocols, and markup escapes editable copy',()=>{
 assert.ok(validateDetails({...DEFAULTS,format:'poster',url:'javascript:alert(1)'}));
 const svg=renderer.render({...DEFAULTS,format:'badge',city:'Paris <script>alert(1)</script>'});assert.ok(!svg.includes('<script>'));assert.ok(svg.includes('&lt;script&gt;'));
});
test('Offline city resolution uses both built-in names and the source index',()=>{
 assert.deepEqual(cityLocation('Montréal'),[45.5,-73.57]);assert.deepEqual(cityLocation('Lyon', {lyon:[45.75,4.85]}),[45.75,4.85]);
});

const {communityTemplate,communityBlocks,editCommunityBlock,needsCommunityRender,applyCommunityRender}=await import('../studio/src/assets-tool/communityDocument.ts');
const communityFixture=()=>({id:'test-document',title:'Event · Paris',editor:{version:1,pages:[{id:'page',sections:[{id:'board',columns:[[{id:'artwork',kind:'image',ambassador:defaultAmbassador(),value:{src:'original'},editor:{widthPx:1200,height:630}}]]}]}]}});
test('Community edits persist before rendering and survive closing the inspector / source serialization',()=>{
 const document=communityFixture(),block=communityTemplate(document);
 const edited=editCommunityBlock(block,{...block.ambassador,city:'Montréal',title:'Build together.\nIn Montréal.'});
 document.editor.pages[0].sections[0].columns[0][0]=edited;
 const reopened=JSON.parse(JSON.stringify(document));
 assert.equal(communityTemplate(reopened).ambassador.city,'Montréal');
 assert.equal(communityTemplate(reopened).value.src,'original');
 assert.ok(needsCommunityRender(communityTemplate(reopened)));
 const completed=applyCommunityRender(reopened,reopened.id,edited.id,edited.ambassadorRender.revision,'rendered');
 assert.equal(communityTemplate(completed).value.src,'rendered');
 assert.equal(needsCommunityRender(communityTemplate(completed)),false);
});
test('Late renders cannot overwrite newer text, undo, a removed element or another document',()=>{
 const document=communityFixture(),original=communityTemplate(document);
 const first=editCommunityBlock(original,{...original.ambassador,city:'Montréal'}),second=editCommunityBlock(first,{...first.ambassador,city:'Tokyo'});
 document.editor.pages[0].sections[0].columns[0][0]=second;
 assert.equal(applyCommunityRender(document,document.id,first.id,first.ambassadorRender.revision,'stale'),document);
 assert.equal(applyCommunityRender(document,'other-document',second.id,second.ambassadorRender.revision,'stale'),document);
 document.editor.pages[0].sections[0].columns[0][0]=original;
 assert.equal(applyCommunityRender(document,document.id,first.id,first.ambassadorRender.revision,'stale'),document);
 document.editor.pages[0].sections[0].columns[0]=[];
 assert.equal(applyCommunityRender(document,document.id,first.id,first.ambassadorRender.revision,'stale'),document);
});
test('A library globe remains independent of the full Community template',()=>{
 const document=communityFixture(),template=communityTemplate(document),globe={...template,id:'globe',ambassadorElement:'globe',ambassador:defaultAmbassador('badge')};
 document.editor.pages[0].sections[0].columns[0].unshift(globe);
 assert.equal(communityTemplate(document),template);
 assert.equal(communityBlocks(document).length,2);
});
