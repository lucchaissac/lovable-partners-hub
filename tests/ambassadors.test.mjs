import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import opentype from 'opentype.js';
const {parse}=opentype;
import {createRenderer,DEFAULTS,FORMATS,validateDetails,cityLocation} from '../src/ambassadors/source/renderer.mjs';
import qrcode from '../src/ambassadors/source/qrcode.js';
import {ambassadorFormats} from '../src/ambassadors/catalog.js';
import {squareEventLayers} from '../shared/communityStarter.mjs';
import {preparedCommunityGlobe,communityGradientPreview,communityGradientMaster} from '../shared/communityPreparedArtwork.mjs';
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

test('Native Community layouts preserve original type and image positions',()=>{
 const event=renderer.layout({...DEFAULTS,format:'social'});
 assert.deepEqual(event.map(layer=>layer.key),['glow','globe','logo','city','title','event-details','eventFooter']);
 const title=event.find(layer=>layer.key==='title');
 assert.deepEqual([title.x,title.y,title.w,title.size,title.leading],[48,166,710,96,88]);
 const poster=renderer.layout({...DEFAULTS,format:'poster'}),qr=poster.find(layer=>layer.kind==='qr');
 assert.deepEqual([qr.x,qr.y,qr.w,qr.h],[508,536,122,122]);
 const banner=renderer.layout({...DEFAULTS,format:'banner'}),headline=banner.find(layer=>layer.key==='headline');
 assert.equal(headline.x,35*FORMATS.banner.w/595);
 assert.equal(headline.size,82*FORMATS.banner.w/595);
 const speakers=renderer.layout({...DEFAULTS,format:'speakers',count:3});
 assert.equal(speakers.filter(layer=>layer.kind==='portrait').length,3);
});

test('Square Event starter follows Luc’s approved manual layout without changing the Event master',()=>{
 const original=renderer.layout({...DEFAULTS,format:'social'}),square=squareEventLayers(original);
 assert.deepEqual(square.map(layer=>layer.key),['logo','city','title','globe','glow','eventFooter']);
 const title=square.find(layer=>layer.key==='title');
 assert.equal(title.text,'Build something\nlovable.');
 assert.deepEqual([title.x,title.y,title.w,title.size],[43,184,793,160]);
 assert.ok(Math.abs(title.leading/title.size-11/12)<.00001);
 const bold=font('../public/fonts/CameraPlain-Bold.ttf'),options={letterSpacing:title.tracking};
 assert.ok(bold.getAdvanceWidth('Build something',title.size,options)>title.w);
 assert.ok(bold.getAdvanceWidth('something',title.size,options)<title.w);
 assert.equal(square.some(layer=>layer.key==='name'||layer.kind==='portrait'),false);
 const globe=square.find(layer=>layer.key==='globe');
 assert.deepEqual([globe.x,globe.y,globe.w,globe.h],[304,191,1340,1340]);
 const glow=square.find(layer=>layer.key==='glow');
 assert.deepEqual([glow.x,glow.y,glow.w,glow.h,glow.rotation],[-692.697,119.958,2340,2358.91,-18.2698]);
 const logo=square.find(layer=>layer.key==='logo');
 assert.equal(logo.x,logo.y);assert.ok(Math.abs(logo.w/logo.h-470.029/46.1959)<.0001);
 const footer=square.find(layer=>layer.key==='eventFooter');
 assert.ok(Math.abs(1080-footer.y-footer.h-footer.x)<.001);
 assert.ok(Math.abs(footer.size-32.4)<.001);
 assert.equal(original.find(layer=>layer.key==='title').size,96);
});

test('Prepared Paris artwork skips scene startup without replacing a personalized city or Spotlight',()=>{
 const src=preparedCommunityGlobe(defaultAmbassador());
 assert.equal(src,'/ambassadors/assets/paris-globe-1080.webp');
 assert.equal(preparedCommunityGlobe({...defaultAmbassador(),city:'  PARIS '}),src);
 assert.equal(preparedCommunityGlobe({...defaultAmbassador(),city:'Montréal'}),null);
 assert.equal(preparedCommunityGlobe(defaultAmbassador('spotlight')),null);
 for(const path of [src,communityGradientPreview]){
  const bytes=readFileSync(new URL(`../public${path}`,import.meta.url));
  assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 }
 assert.equal(communityGradientMaster,'/ambassadors/assets/heart-overlay.png');
});

const {syncCommunityDocument}=await import('../studio/src/assets-tool/communityDocument.ts');
test('Font-size toolbar edits update custom Community canvases without template bindings',()=>{
 const previous=communityFixture();
 const text={id:'headline',kind:'text',value:{runs:[{text:'Let’s\nbuild it.'}],size:192},editor:{x:41,y:219,widthPx:994,height:367,appearance:{fontSize:192,fontWeight:700,lineHeight:92}}};
 previous.editor.pages[0].sections[0].columns[0].push(text);
 const edited=structuredClone(previous);
 edited.editor.pages[0].sections[0].columns[0][1].value.size=180;
 const saved=JSON.parse(JSON.stringify(syncCommunityDocument(edited,previous)));
 const result=saved.editor.pages[0].sections[0].columns[0][1];
 assert.equal(result.editor.appearance.fontSize,180);
 assert.equal(result.value.size,180);
 assert.deepEqual({...result.editor,appearance:undefined},{...text.editor,appearance:undefined});
 assert.equal(result.editor.appearance.lineHeight,92);
 assert.equal(text.editor.appearance.fontSize,192);
 assert.equal(saved.community,undefined);
});
test('Native text edits survive source serialization without moving artwork or mutating the prior draft',()=>{
 const previous=communityFixture(),blocks=previous.editor.pages[0].sections[0].columns[0];
 blocks[0].ambassadorElement='globe';
 blocks.push({id:'city',kind:'text',value:{runs:[{text:'Paris'}],size:32},editor:{x:850,y:48,appearance:{fontSize:32}}});
 previous.community={settings:defaultAmbassador(),bindings:{city:'city'}};
 const edited=structuredClone(previous);edited.editor.pages[0].sections[0].columns[0][1].value={runs:[{text:'Montréal'}],size:40};
 const saved=JSON.parse(JSON.stringify(syncCommunityDocument(edited,previous)));
 assert.equal(saved.community.settings.city,'Montréal');
 assert.equal(previous.community.settings.city,'Paris');
 assert.equal(saved.editor.pages[0].sections[0].columns[0][1].editor.appearance.fontSize,40);
 assert.deepEqual(saved.editor.pages[0].sections[0].columns[0][0],blocks[0]);
});
