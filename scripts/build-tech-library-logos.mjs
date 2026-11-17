import {readFile,writeFile} from 'node:fs/promises';
import opentype from 'opentype.js';
import {techIdentity as t} from '../src/tech-blog/identity.js';
const bytes=await readFile('public/ambassadors/assets/CameraPlain-Regular.ttf');
const font=opentype.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
let x=t.labelX;
const paths=[];
for(const glyph of font.stringToGlyphs('Tech blog')){
 paths.push(glyph.getPath(x,12.555,13.541).toPathData(4));
 x+=(glyph.advanceWidth||0)*13.541/font.unitsPerEm-.5416;
}
const asset=async(name)=>'data:image/svg+xml;base64,'+(await readFile('public/tech-blog/'+name)).toString('base64');
const symbol=await asset('assets/15ed2026006af442.svg'),wordmark=await asset('assets/e4e106066e55f8b4.svg'),field=await asset('color-field.svg');
for(const withField of [false,true]){
 const width=withField?t.width:x+.5416;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width*3}" height="45" viewBox="0 0 ${width} 15" role="img" aria-label="Lovable Tech blog"><image href="${symbol}" x="0" y="1.8" width="10.555" height="10.755"/><image href="${wordmark}" x="14.42" y="2.58" width="44.759" height="9.975"/><path fill="#ffffff" d="${paths.join('')}"/>${withField?`<image href="${field}" x="${t.fieldX}" y="5.651091796875" width="${t.fieldWidth}" height="${t.fieldHeight}"/>`:''}</svg>`;
 await writeFile(`public/tech-blog/tech-logo${withField?'-color':''}.svg`,svg);
}
