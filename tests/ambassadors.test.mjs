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
test('All six library templates preserve their source canvas geometry',()=>{
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
