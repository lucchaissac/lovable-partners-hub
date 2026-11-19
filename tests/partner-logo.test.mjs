import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import sharp from 'sharp';
import {partnerLogoRequest} from '../shared/partnerLogo.mjs';
import {websiteLogoCandidates,resolvePartnerLogo,selfContainedLogoSvg,isPublicLogoAddress,logoURL,readLogoURL,partnerLogoHandler} from '../server/partnerLogo.mjs';

const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false},logLevel:'silent'});
const {partnerLogoTarget,fittedBrandLogo,layoutPartnershipLogo}=await vite.ssrLoadModule('/studio/src/assets-tool/brandLogo.ts');
const {partnershipDivider}=await vite.ssrLoadModule('/studio/src/assets-tool/brandDivider.ts');
const {logoInkBand}=await vite.ssrLoadModule('/studio/src/assets-tool/logoPixels.ts');
const {updateBrandPartner}=await vite.ssrLoadModule('/studio/src/assets-tool/brandAsset.ts');
const {assetSchema,referenceDocument}=await vite.ssrLoadModule('/studio/src/assets-tool/model.ts');
await vite.close();
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30"><path fill="currentColor" d="M1 1H99V29H1z"/></svg>';
const fixture=()=>{
 const asset=referenceDocument({name:'Original',src:'data:image/png;base64,AAAA',width:1,height:1},'landscape');
 const partner={id:'partner',kind:'image',brandRole:'partner',value:{src:'/original.svg',alt:'Cerebras',caption:'',alignment:'center',width:100},editor:{x:686,y:272,widthPx:306,height:136,rotation:15,appearance:{opacity:65,radius:8,imageFit:'contain',blendMode:'screen'}}};
 asset.editor={version:1,pages:[{id:'page',name:'Canvas',sections:[{id:'scene',name:'Scene',columns:[[{...structuredClone(partner),id:'identity',brandRole:'identity'},partner]],padding:0,gap:0,background:'transparent'}]}]};
 return asset;
};
test('The exact screenshot request and French equivalents route to a website logo edit',()=>{
 for(const prompt of ['Update with ramp.com logo','Remplace le logo partenaire par https://ramp.com','Mets le logo de www.ramp.com.','Remplace le logo par ramp.com sans changer la composition'])assert.equal(new URL(partnerLogoRequest(prompt).url).hostname.replace('www.',''),'ramp.com');
 const link={kind:'link',url:'https://www.ramp.com/',originalUrl:'https://ramp.com/',name:'Ramp',text:'Source'};
 assert.equal(partnerLogoRequest('Update with ramp.com logo',[link]).kind,'website');
 assert.equal(partnerLogoRequest('Replace the partner logo',[link]).url,'https://ramp.com/');
});
test('Attachments, missing input and multiple targets are explicit; animation and template prompts stay separate',()=>{
 const image={kind:'image',name:'Logo.png',image:'data:image/png;base64,AAAA'};
 assert.equal(partnerLogoRequest('Use this logo',[image]).source,image);
 assert.equal(partnerLogoRequest('Replace logo').kind,'missing');
 assert.equal(partnerLogoRequest('Use ramp.com or example.com logo').kind,'ambiguous');
 assert.equal(partnerLogoRequest('Use this logo',[image,image]).kind,'ambiguous');
 for(const prompt of ['Animate the logo','Update the logo animation','Make the logo fade in','Use the original App Studio banner with its logo','Create an App Studio banner with its logo','Do not replace the logo','Ne change pas le logo','Make it epic'])assert.equal(partnerLogoRequest(prompt),null,prompt);
});
test('Follow-ups reuse the current logo task across multiple turns, legacy replies and saved chats',()=>{
 const messages=[{user:true,text:'Update the logo with ramp.com'},{user:false,text:'Replaced the partner logo with ramp.com, fitted in white.'}];
 for(const prompt of ['with elevenlabs.io','avec elevenlabs.io','elevenlabs.io','and now https://elevenlabs.io','non, plutôt elevenlabs.io'])assert.equal(partnerLogoRequest(prompt,[],messages).url,'https://elevenlabs.io/');
 messages.push({user:true,text:'with elevenlabs.io'},{user:false,text:'This request was not applied.'});
 assert.equal(partnerLogoRequest('with elevenlabs.io',[],messages).kind,'website');
 messages.push({user:false,text:'Replaced.',partnerLogoEdit:{targetId:'selected-partner'}});
 const roundTrip=assetSchema.parse({...fixture(),messages}).messages;
 assert.equal(partnerLogoRequest('now with ramp.com',[],roundTrip).targetId,'selected-partner');
 const image={kind:'image',name:'Next.png',image:'data:image/png;base64,AAAA'};
 assert.equal(partnerLogoRequest('and this one',[image],roundTrip).source,image);
 assert.equal(partnerLogoRequest('use this',[{kind:'link',url:'https://elevenlabs.io',name:'ElevenLabs',text:'Source'}],roundTrip).url,'https://elevenlabs.io/');
});
test('Logo context never leaks across chats or hijacks a new task, template or animation',()=>{
 const history=[{user:true,text:'Replace the logo with ramp.com',workspaceChatId:'first'}];
 assert.equal(partnerLogoRequest('with elevenlabs.io',[],history,'second'),null);
 assert.equal(partnerLogoRequest('with elevenlabs.io'),null);
 for(const text of ['Make a QR code for elevenlabs.io','Animate the logo','Create an App Studio banner','Change the headline to hello']){
  assert.equal(partnerLogoRequest('with elevenlabs.io',[],[...history,{user:true,text,workspaceChatId:'first'}],'first'),null,text);
 }
 assert.equal(partnerLogoRequest('Make a QR code for elevenlabs.io',[],history,'first'),null);
 assert.equal(partnerLogoRequest('Do not change it with elevenlabs.io',[],history,'first'),null);
});
test('Replacement retains the center, frame limit, styling, layer ID and all other objects through source serialization',()=>{
 const asset=fixture(),target=partnerLogoTarget(asset),original=structuredClone(asset);
 const replacement=fittedBrandLogo(target,'data:image/png;base64,BBBB','Ramp logo',710,200);
 const next=updateBrandPartner(asset,replacement),frame=replacement.editor;
 assert.equal(frame.x+frame.widthPx/2,target.editor.x+target.editor.widthPx/2);
 assert.equal(frame.y+frame.height/2,target.editor.y+target.editor.height/2);
 assert.ok(frame.widthPx<=306&&frame.height<=136);assert.equal(frame.widthPx/frame.height,710/200);
 assert.deepEqual(frame.appearance,target.editor.appearance);assert.equal(frame.rotation,15);
 assert.deepEqual(next.editor.pages[0].sections[0].columns[0][0],original.editor.pages[0].sections[0].columns[0][0]);
 assert.equal(next.id,asset.id);assert.deepEqual(asset,original);
 const restored=assetSchema.parse(JSON.parse(JSON.stringify(next)));
 assert.deepEqual(partnerLogoTarget(restored),JSON.parse(JSON.stringify(replacement)));
});
test('Locked, absent, unrelated or ambiguous logo selections cannot be overwritten',()=>{
 const asset=fixture();
 assert.throws(()=>partnerLogoTarget(asset,'HTML_SELECTION {"blockIds":["identity"]}'),/Select the partner/);
 asset.editor.pages[0].sections[0].columns[0][1].editor.locked=true;
 assert.throws(()=>partnerLogoTarget(asset),/Unlock/);
 asset.editor.pages[0].sections[0].columns[0].pop();assert.throws(()=>partnerLogoTarget(asset),/no partner logo/);
 const two=fixture(),blocks=two.editor.pages[0].sections[0].columns[0];blocks.push({...blocks[1],id:'second'});
 assert.throws(()=>partnerLogoTarget(two),/Select the partner/);
 assert.equal(partnerLogoTarget(two,'HTML_SELECTION {"blockIds":["second"]}').id,'second');
 assert.equal(partnerLogoTarget(two,undefined,'second').id,'second');
 assert.equal(partnerLogoTarget(two,'HTML_SELECTION {"blockIds":["partner"]}','second').id,'partner');
});
const partnership=()=>{
 const asset=fixture(),columns=asset.editor.pages[0].sections[0].columns;
 columns[0][0]={...columns[0][0],id:'brand-identity',editor:{x:190,y:307,widthPx:358,height:65.19,appearance:{imageFit:'contain'}}};
 columns[0][1].editor.rotation=0;columns[0].push(partnershipDivider(),{id:'gradient',kind:'image',value:{...columns[0][0].value,alt:'Keep this gradient'},editor:{x:-600,y:-280,widthPx:2400,height:2400}});
 return asset.editor;
};
const prepared=(name,width,height,top,inkHeight)=>({name,src:'data:image/png;base64,BBBB',width,height,ink:{top,height:inkHeight}});
test('Long wordmarks match visible letter height and baseline, with equal gaps and intact native artwork',()=>{
 const source=partnership(),original=structuredClone(source),ink={top:.3,height:.68};
 const logo=prepared('ElevenLabs',117,15,.24,.75),next=layoutPartnershipLogo(source,'partner',logo,ink);
 const blocks=next.pages[0].sections[0].columns[0],left=blocks[0].editor,right=blocks[1].editor,line=blocks[2].editor;
 const near=(a,b)=>assert.ok(Math.abs(a-b)<.00001,`${a} != ${b}`);
 near(left.height*ink.height,right.height*logo.ink.height);
 near(left.y+left.height*(ink.top+ink.height),right.y+right.height*(logo.ink.top+logo.ink.height));
 near(line.x+line.widthPx/2-line.height/2-left.x-left.widthPx,right.x-(line.x+line.widthPx/2+line.height/2));
 near(right.widthPx/right.height,117/15);assert.ok(right.widthPx>306,'a long wordmark must grow beyond the old partner frame');
 near((left.x+right.x+right.widthPx)/2,(190+686+306)/2);
 assert.deepEqual(blocks[3],original.pages[0].sections[0].columns[0][3]);assert.deepEqual(blocks[1].editor.appearance,source.pages[0].sections[0].columns[0][1].editor.appearance);
 assert.equal(blocks[2].shape,'line');assert.deepEqual(source,original);
 assert.deepEqual(assetSchema.parse({...fixture(),editor:next}).editor,next);
});
test('Alternating partners does not progressively shrink the signature; locked identities stay protected',()=>{
 const ink={top:.3,height:.68},ramp=prepared('Ramp',71,20,.22,.57),eleven=prepared('ElevenLabs',117,15,.24,.75);
 const first=layoutPartnershipLogo(partnership(),'partner',ramp,ink);
 const next=layoutPartnershipLogo(layoutPartnershipLogo(first,'partner',eleven,ink),'partner',ramp,ink);
 const a=first.pages[0].sections[0].columns[0],b=next.pages[0].sections[0].columns[0];
 for(const index of [0,1,2])for(const key of ['x','y','widthPx','height'])assert.ok(Math.abs(a[index].editor[key]-b[index].editor[key])<.00001);
 const locked=partnership();locked.pages[0].sections[0].columns[0][0].editor.locked=true;
 assert.throws(()=>layoutPartnershipLogo(locked,'partner',eleven,ink),/Unlock/);
});
test('Visible-ink measurement excludes a peripheral tall symbol from the lettering band',()=>{
 const width=200,height=100,pixels=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x<30||y>=30&&y<70&&x>=50&&x<160)pixels[(y*width+x)*4+3]=255;
 assert.deepEqual(logoInkBand(pixels,width,height),{top:.3,height:.4});
});
test('Logo discovery selects the home signature and ignores favicons, scripts and customer logos',()=>{
 const html=`<link rel="icon" href="/favicon.png"><script>const x='<img alt="Example logo" src="/fake.svg">'</script><a href="/">${svg}</a><img src="/customer-logo.svg" alt="Customer logo"><img alt="Unrelated logo" src="/other.svg">`;
 const candidates=websiteLogoCandidates(html,'https://example.com');
 assert.equal(candidates.length,1);assert.equal(candidates[0].svg,svg);
 assert.equal(websiteLogoCandidates('<img alt="Example logo" src="/logo.svg?x=1&amp;y=2">','https://example.com')[0].url,'https://example.com/logo.svg?x=1&y=2');
 assert.equal(websiteLogoCandidates('<img alt="Team photograph" src="/photo.png">','https://example.com').length,0);
});
test('Remote logos become self-contained PNGs; unreadable sites fail without inventing artwork',async()=>{
 const read=async url=>({url,type:'text/html',body:Buffer.from(`<a href="/">${svg}</a>`)});
 const result=await resolvePartnerLogo('https://example.com',{read});
 const metadata=await sharp(Buffer.from(result.image.split(',')[1],'base64')).metadata();
 assert.equal(metadata.format,'png');assert.equal(metadata.width,1200);assert.equal(result.name,'example.com');
 await assert.rejects(()=>resolvePartnerLogo('https://example.com',{read:async url=>({url,type:'text/html',body:Buffer.from('<p>No logo</p>')})}),/No usable partner logo/);
});
test('Image URLs and a later valid candidate work when the first image fails',async()=>{
 const read=async url=>{
  if(url.endsWith('/bad.svg'))throw Error('Not found');
  return url.endsWith('.svg')?{url,type:'image/svg+xml',body:Buffer.from(svg)}:{url,type:'text/html',body:Buffer.from('<a href="/"><img src="/bad.svg"><img src="/good.svg"></a>')};
 };
 assert.ok((await resolvePartnerLogo('https://example.com',{read})).image.startsWith('data:image/png;base64,'));
 assert.ok((await resolvePartnerLogo('https://example.com/logo.svg',{read})).image.startsWith('data:image/png;base64,'));
});
test('External SVG resources and private or non-web destinations are rejected',async()=>{
 for(const body of ['<script>alert(1)</script>','<image href="https://example.com/private"/>','<use href="file:///etc/passwd"/>','<!DOCTYPE svg>','<path fill="url(https://example.com/a)"/>'])assert.throws(()=>selfContainedLogoSvg(`<svg>${body}</svg>`));
 assert.match(selfContainedLogoSvg(svg),/#000000/);
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.0.1','100.64.0.1','224.0.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1'])assert.equal(isPublicLogoAddress(ip),false,ip);
 for(const ip of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111'])assert.equal(isPublicLogoAddress(ip),true,ip);
 for(const url of ['file:///etc/passwd','https://example.com:8080','https://name:secret@example.com'])assert.throws(()=>logoURL(url));
 await assert.rejects(()=>readLogoURL('http://127.0.0.1'),/public website/);
});
test('API rejects foreign and malformed origins before resolving a website',async()=>{
 for(const origin of ['https://other.example','null']){
  let status,body;const res={writeHead:code=>{status=code;},end:value=>{body=JSON.parse(value);}};
  await partnerLogoHandler({headers:{origin,host:'studio.example'},method:'POST'},res);
  assert.equal(status,403);assert.match(body.error,/studio/);
 }
});
