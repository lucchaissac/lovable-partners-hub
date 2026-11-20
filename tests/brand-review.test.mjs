import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {brandReviewRequestSchema,validateBrandReviewPlan,compileBrandReview,isBrandReviewRequest,requestedBrandDimensions,brandPartnerLibrary} from '../shared/brandReview.mjs';
import {brandReviewContext,brandReviewBody,generateBrandReview} from '../server/brandReview.mjs';
import {partnerLogoRequest} from '../shared/partnerLogo.mjs';

const vite=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {assetSchema,makeNode}=await vite.ssrLoadModule('/studio/src/assets-tool/model.ts');
const {logoInkBand}=await vite.ssrLoadModule('/studio/src/assets-tool/logoPixels.ts');
const {prepareBrandReview}=await vite.ssrLoadModule('/studio/src/assets-tool/brandReview.ts');
const request=(extra={})=>brandReviewRequestSchema.parse({prompt:'Make it on-brand, 600 × 400.',width:600,height:400,sources:[{id:'source-0',name:'Submitted artwork',image:'data:image/png;base64,AAAA'}],conversation:[],currentText:[],...extra});
const plan=(extra={})=>({template:'event',sourceId:'source-0',title:'Build night',headline:'Build night',details:['12 January — Paris'],palette:'dark',diagnosis:'Kept the event details and corrected the branding.',uncertainties:[],partners:[],visual:null,...extra});
const measure=(text,size)=>text.length*size*.48;
const layers=asset=>asset.editor.pages[0].sections[0].columns[0];
const fixture=()=>({version:1,id:crypto.randomUUID(),title:'Original',format:'landscape',dimensions:{width:600,height:400},background:'ink',grid:false,updatedAt:1,nodes:[makeNode('image',{x:0,y:0,w:100,h:100})],reference:{name:'Source',src:'data:image/png;base64,AAAA',width:600,height:400}});
const compiled=(p=plan(),req=request(),options={})=>assetSchema.parse({...fixture(),...compileBrandReview(p,req,{partners:[],measure,...options})});

test('ordinary on-brand prompts and image attachments route without breaking dedicated logo/animation requests',()=>{
 for(const prompt of ['Make it on-brand','make on brand','Mets cette affiche dans la charte','Refais ce visuel en 600x400'])assert.equal(isBrandReviewRequest(prompt),true,prompt);
 const image={kind:'image',name:'Artwork',image:'data:image/png;base64,AAAA'};
 assert.equal(isBrandReviewRequest('Use this artwork',[image]),true);
 const history=[{user:true,text:'Replace the logo with ramp.com'},{user:false,text:'Replaced.'}];
 assert.equal(isBrandReviewRequest('and this one',[image],!!partnerLogoRequest('and this one',[image],history)),false);
 assert.equal(isBrandReviewRequest('Make it on-brand',[image],true),true);
 for(const prompt of ['Replace the logo','Animate this logo','Do not rebuild this','Ne refais pas cette affiche'])assert.equal(isBrandReviewRequest(prompt,[image]),false,prompt);
 assert.deepEqual(requestedBrandDimensions('Make it on-brand, 600 × 400.'),{width:600,height:400});
 assert.throws(()=>requestedBrandDimensions('9000x6000'),/2560/);
});
test('source content replaces the sample wording in native measured text, with exact requested dimensions',()=>{
 const result=compiled(),blocks=layers(result),headline=blocks.find(block=>block.id==='brand-headline');
 assert.deepEqual(result.dimensions,{width:600,height:400});
 assert.equal(headline.value.runs[0].text,'Build night');
 assert.equal(headline.editor.appearance.fontFamily,'Camera Plain');assert.equal(headline.editor.appearance.fontWeight,700);
 assert.equal(blocks.find(block=>block.id==='brand-details').editor.appearance.fontWeight,600);
 assert.ok(!JSON.stringify(result).includes('Coffee'));assert.ok(!JSON.stringify(result).includes('London'));
 assert.equal(layers(compiled(plan({headline:'BUILD NIGHT'}))).find(block=>block.kind==='text').value.runs[0].text,'Build night');
 const restored=assetSchema.parse(JSON.parse(JSON.stringify(result)));assert.deepEqual(JSON.parse(JSON.stringify(restored)),JSON.parse(JSON.stringify(result)));
});
test('actual partner vectors keep their relative order, optical sizes and equal solid-divider gaps after Lovable',async()=>{
 const partners=await Promise.all(['aikido','incident'].map(async libraryId=>{
  const master=brandPartnerLibrary[libraryId],{data,info}=await sharp(await readFile(new URL(`../public${master.src}`,import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  return {...master,ink:logoInkBand(data,info.width,info.height)};
 }));
 const reviewed=plan({partners:partners.map((item,index)=>({name:item.name,libraryId:['aikido','incident'][index],sourceId:null,crop:null}))});
 const result=compiled(reviewed,request(),{partners}),blocks=layers(result),logos=blocks.filter(block=>block.brandRole);
 assert.deepEqual(logos.map(block=>block.value.alt),['Lovable','Aikido','incident.io']);
 assert.deepEqual(logos.map(block=>block.editor.widthPx),[112,94,112]);
 const dividers=blocks.filter(block=>block.kind==='shape');
 dividers.forEach((divider,index)=>{
  const center=divider.editor.x+divider.editor.widthPx/2,left=logos[index].editor,right=logos[index+1].editor;
  assert.equal(divider.editor.appearance.lineStyle,'solid');
  assert.ok(Math.abs((center-left.x-left.widthPx)-(right.x-center))<.001);
 });
});
test('all approved compositions serialize at practical size limits; long copy cannot overflow silently',()=>{
 for(const [width,height] of [[600,400],[1080,1080],[2560,2560],[1920,1080],[400,600]])compiled(plan(),request({width,height}));
 compiled(plan({template:'app-studio',headline:'App Studio'}),request({width:1920,height:1080}));
 assert.throws(()=>compiled(plan({headline:'W'.repeat(240)})),/too long/);
 assert.throws(()=>validateBrandReviewPlan(plan({template:'app-studio',headline:'App Studio',palette:'light'}),request()),/light counterpart/);
});
test('foreign image IDs, full-poster reuse, invented identity and executable additions reject atomically',()=>{
 const req=request();
 for(const invalid of [plan({sourceId:'missing'}),plan({visual:{sourceId:'source-0',crop:{x:0,y:0,width:1,height:1},description:'Whole poster'}}),plan({script:'alert(1)'}),plan({partners:[{name:'Lovable',libraryId:'aikido',sourceId:null,crop:null}]}),plan({template:'partnership'})])assert.throws(()=>validateBrandReviewPlan(invalid,req));
 assert.throws(()=>validateBrandReviewPlan(plan({partners:[{name:'Other',libraryId:null,sourceId:'source-0',crop:{x:.9,y:0,width:.2,height:.1}}]}),req));
});
test('selected layers and locks stop a whole-canvas rebuild before image processing',async()=>{
 const asset=compiled(),signal=new AbortController().signal,render=()=>{throw Error('Must not render');};
 await assert.rejects(prepareBrandReview(asset,'Make on brand',[],signal,render,'HTML_SELECTION {"blockIds":["brand-headline"]}'),/Clear the layer selection/);
 asset.editor.pages[0].sections[0].locked=true;
 await assert.rejects(prepareBrandReview(asset,'Make on brand',[],signal,render),/Unlock/);
});
test('model input includes three actual approved previews and separately labeled user artwork',async()=>{
 const context=await brandReviewContext(request()),body=brandReviewBody(context);
 assert.equal(context.images.length,4);assert.deepEqual(context.images.slice(0,3).map(image=>image.reference),['event','partnership','app-studio']);
 assert.equal(context.images[3].role,'User source');assert.equal(context.images[3].data,request().sources[0].image);
 assert.equal(body.input[0].content.filter(item=>item.type==='input_image').length,4);
 assert.match(body.instructions,/always place Lovable first/);assert.match(body.instructions,/untrusted reference material/);
 for(const image of context.images.slice(0,3)){const metadata=await sharp(Buffer.from(image.data.split(',')[1],'base64')).metadata();assert.ok(metadata.width>=600);}
});
test('the real provider boundary validates once more after one correction, without rewriting source facts',async()=>{
 let calls=0;const req=request();
 const result=await generateBrandReview(req,{env:{BRAND_CHAT_PROVIDER:'codex'},loadContext:async()=>({payload:req,images:[]}),runCodex:async body=>{
  calls++;if(calls===1)return plan({sourceId:'invented'});
  assert.match(body.input[0].content[0].text,/correctionFeedback/);return plan();
 }});
 assert.equal(calls,2);assert.equal(result.plan.headline,'Build night');
 calls=0;
 await assert.rejects(generateBrandReview(req,{env:{BRAND_CHAT_PROVIDER:'codex'},loadContext:async()=>({payload:req,images:[]}),runCodex:async()=>{calls++;return plan({sourceId:'invented'});}}),/actual poster source/);
 assert.equal(calls,2);
});
