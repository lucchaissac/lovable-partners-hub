import {lucideIconNames} from './generated/lucideNames.js';
import { z } from 'zod';
import {blendModes} from '../../../shared/blendModes.mjs';
import {textAnimationModes} from '../../../shared/textAnimation.mjs';
import {techArtworkSchema} from '../assets-tool/techArtworkSettings';
import {ambassadorSchema} from '../assets-tool/ambassadorSettings';
import { partnerBadgeSchema } from '../assets-tool/partnerBadgeSettings';
import { htmlInventorySchema } from './htmlInventorySchema.js';
import { htmlPageIconSchema } from './htmlNavigationModel.js';

/** Coordinate semantics shared with the page-design agent; numeric limits come from the schemas. */
export const htmlLayoutContract = {
  absoluteOrigin: 'Each column content box, AFTER section padding and centered contentWidth, is the origin for absolute x/y. Coordinates are NOT relative to the outer section edge. x=0,y=0 shares the start of the first flow item in that column.',
  absoluteFlow: 'Absolute elements reserve NO space in normal flow. A positive absolute y can cover the first flow heading. To place logos above a flow heading, use negative y with enough section top padding to keep the logos visible, or explicitly position the entire hero composition with separated rectangles and a sufficient section minHeight.',
  overlap: 'Overlapping decorative artwork/logos is available, but keep title/body text and interactive controls clear of foreground artwork unless the user explicitly requests that overlap.',
  clipping: 'Absolute artwork outside the outer section bounds is clipped. Flow items remain inside the padded column and reserve their own layout space.',
  corners: 'radius sets the common corner radius. Optional radiusTopLeft, radiusTopRight, radiusBottomRight and radiusBottomLeft override individual corners on sections and rectangular elements/images. Omitted corners inherit radius; set an override to null to clear it. Circles stay circular and triangles use their shared radius.',
  elementSpacing: 'All blocks, including native widgets (checklists, tables, contacts, forms and libraries), share editor.appearance.padding (and paddingTop/Right/Bottom/Left overrides) inside their border-box, editor.spacingAfter for external space after flow items, and editor.position for flow/absolute placement. These are block editor fields, separate from widget-specific content/design data. Spacing after adds to the section item gap; absolute items do not reserve it. Image/shape heights include padding. Text grows to fit its content; padding must not clip readable text.',
  elementBackground: 'editor.appearance.background sets the element background independently of text color and image content. Shapes accept backgroundImage and backgroundFit (cover/contain) as an image fill. Images keep value.src independently; imageVisible:false displays only the background and preserves the source for switching back.',
  sizing: 'Native widgets (tasks, contacts, inventory, synced), HTML/code widgets and media have a minimum width of 200px. Keep their columns wide enough for that minimum plus section padding. The minimum does not apply to text, images or shapes. width is a percentage of the containing column; widthPx overrides it. height is pixels. minHeight describes the whole section including its padding. contentWidth centers the inner grid; it does not restrict full-width section backgrounds.',
} as const;

const id = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/);
const safeURL = z.string().max(2400000).refine(value => /^\/(?!\/)[^<>]*$/.test(value) || /^https?:\/\/[^\s<>]+$/.test(value) || /^data:(?:application\/pdf|image\/(?:png|jpeg|webp|gif));base64,[a-zA-Z0-9+/]+=*$/.test(value));
const textValue = z.object({
 list:z.enum(['none','bullet']).optional(),
 runs:z.array(z.object({text:z.string().max(8000),bold:z.boolean().optional(),italic:z.boolean().optional(),underline:z.boolean().optional()}).strict()).max(200),
 style:z.enum(['Heading 1','Heading 2','Heading 3','Text','Small text']),size:z.number().min(1).max(1000),align:z.enum(['left','center','right']),color:z.string().max(80),
}).strict();
const mediaURL = z.union([safeURL, z.string().max(34_000_000).regex(/^data:video\/(?:mp4|webm|ogg|quicktime);base64,[a-zA-Z0-9+/]+=*$/)]);
const imageValue=z.object({crop:z.object({x:z.number().nonnegative(),y:z.number().nonnegative(),width:z.number().positive(),height:z.number().positive(),sourceWidth:z.number().positive(),sourceHeight:z.number().positive()}).strict().refine(c=>c.x+c.width<=c.sourceWidth+1&&c.y+c.height<=c.sourceHeight+1,'Crop must stay inside the source image.').optional(),playIcon:z.boolean().optional(),aspectRatio:z.number().min(.1).max(10).optional(),src:safeURL,alt:z.string().max(500),caption:z.string().max(500),alignment:z.enum(['left','center','right']),width:z.number().min(25).max(100),link:z.string().max(2000).optional()}).strict();
export const elementAppearance = z.object({
 blendMode:z.enum(blendModes).optional(),blur:z.number().min(0).max(100).optional(),textAnimation:z.enum(textAnimationModes).optional(),
 padding:z.number().min(0).max(160).optional(),paddingTop:z.number().min(0).max(160).optional(),paddingRight:z.number().min(0).max(160).optional(),paddingBottom:z.number().min(0).max(160).optional(),paddingLeft:z.number().min(0).max(160).optional(),
 background:z.string().regex(/^(?:#[0-9a-fA-F]{3,8}|transparent|var\(--[a-z0-9-]+\))$/).optional(),backgroundImage:safeURL.optional(),backgroundFit:z.enum(['cover','contain']).optional(),imageVisible:z.boolean().optional(),
 fill:z.string().regex(/^(?:#[0-9a-fA-F]{3,8}|transparent|var\(--[a-z0-9-]+\))$/).optional(),radius:z.number().min(0).max(1500).optional(),radiusTopLeft:z.number().min(0).max(1500).optional(),radiusTopRight:z.number().min(0).max(1500).optional(),radiusBottomRight:z.number().min(0).max(1500).optional(),radiusBottomLeft:z.number().min(0).max(1500).optional(),borderWidth:z.number().min(0).max(24).optional(),borderColor:z.string().regex(/^(?:#[0-9a-fA-F]{3,8}|transparent|var\(--[a-z0-9-]+\))$/).optional(),shadow:z.enum(['none','soft','strong']).optional(),opacity:z.number().min(0).max(100).optional(),imageFit:z.enum(['cover','contain']).optional(),
 lineWidth:z.number().min(1).max(24).optional(),lineStyle:z.enum(['solid','dashed']).optional(),lineCap:z.enum(['butt','round','square']).optional(),
 fontFamily:z.enum(['Camera Plain','Arial','Impact','Georgia','Times New Roman','Verdana','Courier New','Bodoni Moda','Pixelify Sans','Anton']).optional(),fontSize:z.number().min(1).max(1000).optional(),fontWeight:z.number().min(100).max(900).optional(),italic:z.boolean().optional(),underline:z.boolean().optional(),uppercase:z.boolean().optional(),textAlign:z.enum(['left','center','right']).optional(),letterSpacing:z.number().min(-20).max(100).optional(),lineHeight:z.number().min(50).max(300).optional(),
}).strict();
export const htmlIconNames = lucideIconNames;
export type HtmlIconName = typeof htmlIconNames[number];
const editorFrame = z.object({
 motionId:id.optional(),groupId:id.optional(),groupScale:z.number().positive().optional(),scaleOrigin:z.tuple([z.number().min(0).max(1),z.number().min(0).max(1)]).optional(),
 position:z.enum(['flow','absolute']).optional(),spacingAfter:z.number().min(0).max(400).optional(),appearance:elementAppearance.optional(),
 locked:z.boolean().optional(),hidden:z.boolean().optional(),width:z.number().min(.1).max(500).optional(),widthPx:z.number().min(1).max(4000).optional(),height:z.number().min(1).max(4000).optional(),
 x:z.number().min(-4000).max(4000).optional(),y:z.number().min(-4000).max(4000).optional(),rotation:z.number().min(-360).max(360).optional(),
 rotationX:z.number().min(-360).max(360).optional(),rotationY:z.number().min(-360).max(360).optional(),depth:z.number().min(-2000).max(2000).optional(),perspective:z.number().min(100).max(5000).optional(),
 radius:z.number().min(0).max(160).optional(),opacity:z.number().min(0).max(1).optional(),
}).strict().optional();
export const htmlBlockSchema=z.discriminatedUnion('kind',[
 z.object({id,editor:editorFrame,kind:z.literal('shape'),icon:z.enum(htmlIconNames).optional(),filled:z.boolean().optional(),shape:z.enum(['rectangle','circle','triangle','line'])}).strict(),
 z.object({id,editor:editorFrame,kind:z.literal('text'),value:textValue}).strict(),
 z.object({id,editor:editorFrame,kind:z.literal('image'),value:imageValue,techArtwork:techArtworkSchema.optional(),brandRole:z.enum(['identity','partner']).optional(),badge:partnerBadgeSchema.optional(),ambassador:ambassadorSchema.optional(),ambassadorElement:z.enum(['globe','spotlight-globe','qr']).optional(),ambassadorRender:z.object({revision:z.string().max(40),rendered:z.string().max(40)}).strict().optional()}).strict(),
 z.object({id,editor:editorFrame,kind:z.literal('pdf'),name:z.string().max(200),src:safeURL}).strict(),
 z.object({id,editor:editorFrame,kind:z.literal('cta'),color:z.string().max(80).optional(),leadingIcon:z.enum(['play','arrow-right','sparkles','check','video','calendar','book-open','users','message-square','file-text','circle','circle-check','chart-line']).optional(),label:z.string().min(1).max(100),href:z.string().max(2000).refine(value=>/^(?:#[a-zA-Z0-9-]+|\/(?!\/)[^\s<>]*|https?:\/\/[^\s<>]+)$/.test(value))}).strict(),
 z.object({id,editor:editorFrame,kind:z.literal('inventory'),content:htmlInventorySchema.optional()}).strict(),
 z.object({id,editor:editorFrame,kind:z.literal('media'),format:z.enum(['Link','File','Video','Embed','iFrame']),name:z.string().max(200),src:mediaURL,poster:safeURL.optional()}).strict(),
 z.object({id,editor:editorFrame,kind:z.literal('toggle'),title:z.string().max(200),body:z.string().max(16000)}).strict(),
 z.object({id,editor:editorFrame,kind:z.literal('code'),code:z.string().max(16000)}).strict(),
 z.object({id,editor:editorFrame,kind:z.enum(['contacts','tasks','divider','synced'])}).strict(),
]);
export const htmlSectionSchema=z.object({id,minHeight:z.number().min(0).max(12000).optional(),hidden:z.boolean().optional(),navigationHidden:z.boolean().optional(),collaboration:z.boolean().optional(),automation:z.enum(['viewed','completed']).nullable().optional(),locked:z.boolean().optional(),width:z.number().min(20).max(100).optional(),widthPx:z.number().min(160).max(4000).optional(),spacingAfter:z.number().min(0).max(400).optional(),radius:z.number().min(0).max(160).optional(),radiusTopLeft:z.number().min(0).max(160).optional(),radiusTopRight:z.number().min(0).max(160).optional(),radiusBottomRight:z.number().min(0).max(160).optional(),radiusBottomLeft:z.number().min(0).max(160).optional(),shadow:z.enum(['none','subtle','soft','strong']).optional(),name:z.string().min(1).max(100),columns:z.array(z.array(htmlBlockSchema).max(80)).min(1).max(3),weights:z.array(z.number().min(10).max(90)).min(2).max(3).optional(),background:z.string().regex(/^(?:#[0-9a-fA-F]{3,8}|transparent|var\(--[a-z0-9-]+\))$/),padding:z.number().min(0).max(160),paddingTop:z.number().min(0).max(160).optional(),paddingRight:z.number().min(0).max(160).optional(),paddingBottom:z.number().min(0).max(160).optional(),paddingLeft:z.number().min(0).max(160).optional(),blockGap:z.number().min(0).max(160).optional(),gap:z.number().min(0).max(160).optional(),contentWidth:z.number().min(320).max(1800).nullable().optional(),verticalAlign:z.enum(['start','center','end']).optional(),appearance:z.enum(['hero','steps','story','page-intro','resources','closing']).optional()}).strict();
export const htmlPageSchema=z.object({id,name:z.string().min(1).max(100),sections:z.array(htmlSectionSchema).max(40),icon:htmlPageIconSchema.optional(),hidden:z.boolean().optional(),access:z.enum(['everyone','team','invited']).optional(),automation:z.enum(['viewed','completed']).nullable().optional(),externalUrl:z.string().max(2000).regex(/^https?:\/\/[^\s<>]+$/).optional()}).strict();
export type HtmlPage=z.infer<typeof htmlPageSchema>;
export const htmlEditorSchema=z.object({version:z.literal(1),pages:z.array(htmlPageSchema).min(1).max(20)}).strict().superRefine((value,ctx)=>{
 const ids=value.pages.flatMap(page=>[page.id,...page.sections.flatMap(section=>[section.id,...section.columns.flat().map(block=>block.id)])]);
 if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Each page, section and block needs a unique ID.'});
 if(JSON.stringify(value).length>80_000_000)ctx.addIssue({code:'custom',message:'This workspace is too large to save.'});
});
export type HtmlEditorState=z.infer<typeof htmlEditorSchema>;
export type HtmlSection=z.infer<typeof htmlSectionSchema>;
export type HtmlBlock=z.infer<typeof htmlBlockSchema>;
export const htmlId=()=>crypto.randomUUID();
export const htmlText=(id:string,text:string,style:'Heading 1'|'Heading 2'|'Text'='Text'):Extract<HtmlBlock,{kind:'text'}>=>({id,kind:'text',value:{runs:text?[{text}]:[],style,size:style==='Heading 1'?64:style==='Heading 2'?36:18,align:'left',color:style==='Text'?'#62625e':'#171714'}});
function rampV1HtmlEditor():HtmlEditorState {
 return {version:1,pages:[{id:'overview',name:'Overview',sections:[
  {id:'welcome',name:'Welcome',background:'#ffffff',padding:40,columns:[[
   {...htmlText('welcome-label','Welcome to your Ramp workspace'),value:{runs:[{text:'Welcome to your Ramp workspace'}],style:'Small text',size:13,align:'left',color:'#62625e'}},
   htmlText('welcome-title','Ramp × Linear','Heading 1'),
   htmlText('welcome-copy','A clear path from setup to your first team rollout. Align your people, put spending policies in place, and launch with confidence.'),
   {id:'welcome-cta',kind:'cta',label:'Start your rollout',href:'#section-projects'},
  ],[{id:'welcome-image',kind:'image',value:{src:'/assets/ramp/card-hand.webp',alt:'A Ramp card, ready for your team',caption:'',alignment:'center',width:100}}]]},
  {id:'projects',name:'Projects',background:'#f5f4ef',padding:40,columns:[[
   htmlText('project-title','A smooth start, together.','Heading 2'),
   htmlText('project-copy','Align on your goals, bring the right people together, and track the work that gets you to launch.'),
   {id:'rollout-tasks',kind:'tasks'},
  ]]},
  {id:'resources',name:'Resources',background:'#ffffff',padding:40,columns:[[
   {id:'resources-image',kind:'image',value:{src:'/assets/ramp/receipt-phone.webp',alt:'Capture receipts on the go with Ramp',caption:'',alignment:'center',width:100}},
   htmlText('resources-title','For your rollout owner','Heading 2'),
   htmlText('resources-copy','Bring your spending policy, approval owners, and accounting requirements to your kickoff.'),
   {id:'rollout-pdf',kind:'pdf',name:'Ramp rollout guide.pdf',src:'/demo-assets/rollout-guide.pdf'},
  ],[
   {id:'team-image',kind:'image',value:{src:'/assets/ramp/globe.webp',alt:'Your team, connected around the world',caption:'',alignment:'center',width:100}},
   htmlText('team-title','For your team','Heading 2'),
   htmlText('team-copy','Everything your team needs to feel ready for day one. Your rollout partner is here to help.'),
   {id:'ramp-contact',kind:'contacts'},
  ]]},
 ]}]};
}
const rampText=(id:string,text:string,style:'Heading 1'|'Heading 2'|'Text'|'Small text'='Text',size=style==='Heading 1'?64:style==='Heading 2'?42:style==='Small text'?12:18,color=style==='Text'?'#62625e':'#171714'):HtmlBlock=>({id,kind:'text',value:{runs:[{text,...(style.startsWith('Heading')?{bold:false}:{})}],style,size,align:'left',color}});
const rampImage=(id:string,src:string,alt:string):HtmlBlock=>({id,kind:'image',value:{src,alt,caption:'',alignment:'center',width:100}});
export function initialHtmlEditor():HtmlEditorState {
 return {version:1,pages:[
  {id:'overview',name:'Overview',sections:[
   {id:'welcome',name:'Welcome to Ramp',appearance:'hero',background:'#f4f3ef',padding:64,gap:48,weights:[48,52],verticalAlign:'center',columns:[[
    rampText('welcome-label','RAMP × LINEAR  /  YOUR NEXT CHAPTER','Small text'),
    rampText('welcome-title','Less busywork.\nMore possibility.','Heading 1'),
    rampText('welcome-copy','The time you save is just the beginning. Bring your people, payments, and plans together — and make room for what’s next.'),
    {id:'welcome-cta',kind:'cta',label:'Let’s get you going',href:'#section-projects'},
   ],[rampImage('welcome-image','/assets/ramp/card-hand.webp','A black Ramp card held against a warm ivory background')]]},
   {id:'possibilities',name:'Built for your next move',appearance:'steps',background:'#e4f222',padding:64,gap:48,columns:[[
    rampText('control-number','01','Small text'),rampText('control-title','Spend smarter.','Heading 2',34),rampText('control-copy','The right cards. The right limits. More freedom for your team, with control built in.','Text',17,'#34362a'),
   ],[
    rampText('time-number','02','Small text'),rampText('time-title','Get time back.','Heading 2',34),rampText('time-copy','Less chasing receipts. Fewer manual steps. A little more room for the work that matters.','Text',17,'#34362a'),
   ],[
    rampText('together-number','03','Small text'),rampText('together-title','Move as one.','Heading 2',34),rampText('together-copy','One shared plan, from the first conversation to your team’s first purchase.','Text',17,'#34362a'),
   ]]},
   {id:'connected',name:'A better way to work',appearance:'story',background:'#ffffff',padding:64,gap:64,weights:[52,48],verticalAlign:'center',columns:[[
    rampImage('workflow-image','/assets/ramp/workflow.webp','A connected approval workflow in Ramp'),
   ],[
    rampText('workflow-label','LESS FRICTION. MORE FORWARD.','Small text'),
    rampText('workflow-title','Good things happen\nwhen it all connects.','Heading 2',52),
    rampText('workflow-copy','A clear plan. A team in your corner. Everything you need for a confident rollout, right here in your workspace.'),
    {id:'workflow-cta',kind:'cta',label:'Explore your resources',href:'#section-resources'},
   ]]},
   {id:'ready',name:'Your next move',appearance:'closing',background:'#193b2d',padding:64,gap:48,weights:[65,35],verticalAlign:'center',columns:[[
    rampText('ready-label','READY WHEN YOU ARE','Small text',12,'#c7d6c9'),rampText('ready-title','Your next chapter\nstarts with a plan.','Heading 2',52,'#ffffff'),
   ],[
    rampText('ready-copy','Let’s turn a good kickoff into a great launch.','Text',18,'#e0e8df'),{id:'ready-cta',kind:'cta',label:'Open your rollout plan',href:'#section-projects'},
   ]]},
  ]},
  {id:'rollout',name:'Rollout plan',sections:[
   {id:'rollout-intro',name:'From kickoff to takeoff',appearance:'page-intro',background:'#f4f3ef',padding:64,gap:48,weights:[60,40],verticalAlign:'end',columns:[[
    rampText('rollout-label','01 / THE PLAN','Small text'),rampText('rollout-title','From kickoff\nto takeoff.','Heading 1',72),
   ],[rampText('rollout-intro-copy','Small steps. Real momentum. Align on what matters, set your team up, and make your first week with Ramp a great one.')]]},
   {id:'projects',name:'Your rollout checklist',background:'#ffffff',padding:64,columns:[[
    rampText('project-title','Make it happen.','Heading 2',42),rampText('project-copy','Your shared checklist, from first steps to launch day. Open a task to add details, assign an owner, or set a date.'),{id:'rollout-tasks',kind:'tasks'},
   ]]},
   {id:'kickoff',name:'A strong start',appearance:'story',background:'#f4f3ef',padding:64,gap:64,weights:[48,52],verticalAlign:'center',columns:[[
    rampText('kickoff-label','BEFORE YOUR FIRST PURCHASE','Small text'),rampText('kickoff-title','Set the stage.\nWe’ll take it from here.','Heading 2',48),rampText('kickoff-copy','Bring your spending policy, department list, approval owners, and accounting requirements. We’ll help connect the dots.'),
    {id:'kickoff-toggle',kind:'toggle',title:'Your kickoff checklist',body:'Choose your rollout owner. Confirm your goals and launch date. Bring your spending policy, department list, approval owners, and accounting requirements.'},
    {id:'launch-toggle',kind:'toggle',title:'Ready to invite your team?',body:'Confirm your card limits and approval flows, then invite your first group. Share the quick-start guide and run a pilot purchase before the wider rollout.'},
   ],[rampImage('resources-image','/assets/ramp/receipt-phone.webp','Ramp automatically matches a receipt to a purchase')]]},
  ]},
  {id:'resource-page',name:'Resources',sections:[
   {id:'resources',name:'Your resource hub',appearance:'page-intro',background:'#e4f222',padding:64,gap:48,weights:[60,40],verticalAlign:'end',columns:[[
    rampText('resources-label','02 / YOUR GO-TO PLACE','Small text'),rampText('resources-title','All the right things.\nRight here.','Heading 1',72),
   ],[rampText('resources-copy','The guides, the answers, and the people to help you move forward. A little less searching. A lot more doing.','Text',18,'#34362a')]]},
   {id:'resource-library',name:'Guides and your team',appearance:'resources',background:'#ffffff',padding:64,gap:48,weights:[55,45],columns:[[
    rampImage('team-image','/assets/ramp/globe.webp','Your Ramp team connected around the world'),rampText('guide-title','A smoother start.','Heading 2',36),rampText('guide-copy','Keep the essentials close. Share this guide with your rollout owner and anyone getting started with Ramp.'),{id:'rollout-pdf',kind:'pdf',name:'Ramp rollout guide.pdf',src:'/demo-assets/rollout-guide.pdf'},
   ],[
    rampText('team-label','PEOPLE, NOT JUST A PLATFORM','Small text'),rampText('team-title','Meet your\ncorner of Ramp.','Heading 2',44),rampText('team-copy','Questions, ideas, or a little help getting unstuck. Your rollout partner is one message away.'),{id:'ramp-contact',kind:'contacts'},
   ]]},
   {id:'answers',name:'Good questions',background:'#f4f3ef',padding:64,gap:64,weights:[40,60],columns:[[
    rampText('answers-label','A LITTLE CLARITY','Small text'),rampText('answers-title','Glad you asked.','Heading 2',48),
   ],[
    {id:'answers-start',kind:'toggle',title:'Where should we start?',body:'Open your Rollout plan and align on the first task together. Your shared checklist keeps owners, dates, and next steps in one place.'},
    {id:'answers-team',kind:'toggle',title:'What does our team need?',body:'Start with your spending policy and approval owners. Your rollout partner can help you prepare the invitation, quick-start guide, and first purchases.'},
    {id:'answers-help',kind:'toggle',title:'Who can help with the rollout?',body:'Reach out to your Ramp partner above. Share your goals and questions so we can make the next step clear.'},
   ]]},
  ]},
 ]};
}
const legacyText=(id:string,text:string,style:'Heading 1'|'Heading 2'|'Text'='Text'):HtmlBlock=>({id,kind:'text',value:{runs:[{text}],style,size:style==='Heading 1'?40:style==='Heading 2'?26:16,align:'left',color:style==='Text'?'#62625e':'#171714'}});
function legacyHtmlEditor():HtmlEditorState {
 return {version:1,pages:[{id:'overview',name:'Overview',sections:[
  {id:'welcome',name:'Welcome',background:'#ffffff',padding:40,columns:[[
   legacyText('welcome-label','YOUR SHARED WORKSPACE'),
   legacyText('welcome-title','Ramp × Linear','Heading 1'),
   legacyText('welcome-copy','A clear path from your first conversation to a successful rollout. Everything we need, in one shared place.'),
  ]]},
  {id:'projects',name:'Projects',background:'#ffffff',padding:40,columns:[[
   legacyText('project-title','A smooth start, together.','Heading 2'),
   legacyText('project-copy','Align on your goals, bring the right people together, and track the work that gets you to launch.'),
   {id:'rollout-tasks',kind:'tasks'},
  ]]},
  {id:'resources',name:'Resources',background:'#ffffff',padding:40,columns:[[
   legacyText('resources-title','Everything you need to get going.','Heading 2'),
   {id:'rollout-pdf',kind:'pdf',name:'Ramp rollout guide.pdf',src:'/demo-assets/rollout-guide.pdf'},
  ],[
   legacyText('team-title','Your point of contact','Heading 2'),
   {id:'ramp-contact',kind:'contacts'},
  ]]},
 ]}]};
}
// Refresh only untouched starter sections; preserve pages, user edits and widget data.
export function upgradeHtmlEditorStarter(state:HtmlEditorState):HtmlEditorState {
 const identical=(a:HtmlEditorState,b:HtmlEditorState)=>JSON.stringify(htmlEditorSchema.parse(a))===JSON.stringify(htmlEditorSchema.parse(b));
 if(identical(state,rampV1HtmlEditor())||identical(state,legacyHtmlEditor()))return initialHtmlEditor();
 const previous=legacyHtmlEditor().pages[0].sections;
 const current=rampV1HtmlEditor().pages[0].sections;
 const existingIds=new Set(state.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat().map(block=>block.id))));
 let changed=false;
 const pages=state.pages.map(page=>({...page,sections:page.sections.map(section=>{
  const index=previous.findIndex(item=>item.id===section.id);
  if(index<0||JSON.stringify(htmlSectionSchema.parse(section))!==JSON.stringify(htmlSectionSchema.parse(previous[index])))return section;
  const oldIds=new Set(section.columns.flat().map(block=>block.id));
  if(current[index].columns.flat().some(block=>!oldIds.has(block.id)&&existingIds.has(block.id)))return section;
  changed=true;return current[index];
 })}));
 const next=changed?{...state,pages}:state;
 return identical(next,rampV1HtmlEditor())?initialHtmlEditor():next;
}
export function newHtmlBlock(kind:HtmlBlock['kind']):HtmlBlock {
 const id=htmlId();
 if(kind==='shape')return {id,kind,shape:'rectangle',editor:{width:50,height:160}};
 if(kind==='text')return htmlText(id,'');
 if(kind==='cta')return {id,kind,label:'Get started',href:'#section-projects'};
 if(kind==='image')return {id,kind,value:{src:'/assets/ramp/card-hand.webp',alt:'Ramp corporate card',caption:'',alignment:'center',width:100}};
 if(kind==='media')return {id,kind,format:'Link',name:'Website',src:'https://ramp.com'};
 if(kind==='toggle')return {id,kind,title:'Learn more',body:'Add your content here.'};
 if(kind==='code')return {id,kind,code:'// Add your code here'};
 if(kind==='inventory')return {id,kind};
 if(kind==='pdf')return {id,kind,name:'Ramp rollout guide.pdf',src:'/demo-assets/rollout-guide.pdf'};
 return {id,kind};
}
export function moveHtmlBlock(state:HtmlEditorState,blockId:string,targetSection:string,column:number,index:number):HtmlEditorState {
 const next=structuredClone(state);let block:HtmlBlock|undefined;
 for(const page of next.pages)for(const section of page.sections)section.columns.forEach((items,c)=>{
  const i=items.findIndex(item=>item.id===blockId);if(i<0)return;
  [block]=items.splice(i,1);if(section.id===targetSection&&c===column&&i<index)index--;
 });
 const target=next.pages.flatMap(page=>page.sections).find(section=>section.id===targetSection)?.columns[column];
 if(!block||!target)return state;
 target.splice(index,0,block);return next;
}
export const htmlEditorCode={source:'export default function Content() { return <Asset.HtmlEditorV1 />; }',compiled:'exports.default = function Content() { return React.createElement(Asset.HtmlEditorV1, null); };',route:'prototype',summary:'Editable workspace with pages, sections and native Asset content.'};

export function sectionWeights(section: HtmlSection): number[] {
 const weights=section.weights?.length===section.columns.length?section.weights:section.columns.map(()=>1);
 const total=weights.reduce((sum,value)=>sum+value,0);
 return weights.map(value=>value/total*100);
}
export function resizeSectionColumns(section: HtmlSection, divider: number, delta: number): number[] {
 const weights=sectionWeights(section), total=weights[divider]+weights[divider+1];
 let left=Math.max(10,Math.min(total-10,weights[divider]+delta));
 const anchors=[total/2,total/3,total*2/3];
 left=anchors.find(anchor=>Math.abs(anchor-left)<1.5)??left;
 weights[divider]=left;weights[divider+1]=total-left;return weights;
}
