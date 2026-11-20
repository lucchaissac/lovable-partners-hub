import {chromium} from 'playwright-core';
import sharp from 'sharp';
import {logoURL,selfContainedLogoSvg} from './partnerLogo.mjs';
import {publicPageAddress,pageImportProxy} from './webPageProxy.mjs';
import {localRequestAllowed} from './communityChat.mjs';
import {webPageImportRequestSchema,webPageSnapshotSchema} from '../shared/webPageImport.mjs';
import {extractWebPageDom} from './webPageDom.mjs';

export const webPageURL=input=>{const value=input.trim();if(/^[a-z][a-z0-9+.-]*:/i.test(value)&&!/^https?:\/\//i.test(value))throw Error('Use an HTTP or HTTPS web page URL.');return logoURL(/^https?:\/\//i.test(value)?value:`https://${value}`).href;};

/** A disposable, unsigned-in renderer. All network reads use validated, pinned public DNS. */
export async function importWebPage(input,{signal,env=process.env,launch=options=>chromium.launch(options)}={}){
 if(env.VERCEL)throw Error('Page import is available only in the local studio.');
 const url=webPageURL(webPageImportRequestSchema.parse(input).url);
 const timeout=AbortSignal.timeout(60000),abort=signal?AbortSignal.any([signal,timeout]):timeout;
 const cache=new Map();let requests=0;
 let context;
 const resource=async address=>{
  const target=logoURL(address).href;let result=cache.get(target);
  if(!result){const response=await context.request.get(target,{timeout:3000});result={body:await response.body(),type:response.headers()['content-type']??''};cache.set(target,result);}
  if(result.body.length>8_000_000)throw Error('Large image');return result;
 };
 let proxy;
 let browser;
 try{
  // Validate the main URL before opening Chrome. No local files, private IPs or credentials.
  await publicPageAddress(url);
  proxy=await pageImportProxy(abort);
  abort.throwIfAborted();
  browser=await launch({channel:'chrome',headless:true,chromiumSandbox:true,timeout:15000,proxy:{server:proxy.url,bypass:'<-loopback>'}});
  const stop=()=>{proxy?.close();void browser.close().catch(()=>{});};abort.addEventListener('abort',stop,{once:true});
  try{
   context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,serviceWorkers:'block',acceptDownloads:false,reducedMotion:'reduce'});
   await context.routeWebSocket('**',route=>route.close());
   await context.route('**/*',async route=>{
    const request=route.request();
    if(++requests>220||!['GET','HEAD'].includes(request.method())||['media','websocket','eventsource'].includes(request.resourceType()))return route.abort();
    try{logoURL(request.url());await route.continue();}catch{await route.abort().catch(()=>{});}
   });
   context.on('response',response=>{
    if(['image','font'].includes(response.request().resourceType()))void response.body().then(body=>{if(body.length<8_000_000)cache.set(response.url(),{body,type:response.headers()['content-type']??''});}).catch(()=>{});
   });
   const page=await context.newPage();page.setDefaultTimeout(10000);
   context.on('page',other=>{if(other!==page)void other.close();});
   const navigation=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
   if(!/text\/html|application\/xhtml\+xml/i.test(navigation?.headers()['content-type']??''))throw Error('Enter a web page URL, for example https://lovable.dev.');
   await page.waitForLoadState('networkidle',{timeout:8000}).catch(()=>{});
   await page.evaluate(async()=>{
    const visibleImages=[...document.images].filter(image=>{const box=image.getBoundingClientRect();return box.width>0&&box.height>0&&box.bottom>0&&box.right>0&&box.top<innerHeight&&box.left<innerWidth;});
    await Promise.race([Promise.all([document.fonts.ready,...visibleImages.map(image=>image.decode().catch(()=>{}))]),new Promise(resolve=>setTimeout(resolve,3000))]);
   });
   abort.throwIfAborted();
   if(/just a moment|attention required|access denied/i.test(await page.title())){
    throw Error('This website blocks automatic imports. Try another public page.');
   }
   if(navigation&&navigation.status()>=400)throw Error('This public page returned an error. Try another page URL.');
   const result=await page.evaluate(extractWebPageDom);
   if(!result.layers.some(layer=>layer.kind==='text'))throw Error('No readable HTML elements were found on this page.');
   const preview=`data:image/jpeg;base64,${(await page.screenshot({type:'jpeg',quality:72,animations:'disabled'})).toString('base64')}`;
   // Render only individual CSS backgrounds; text stays in separate native layers.
   // No page screenshot is inserted into the canvas.
   const paint=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,serviceWorkers:'block',acceptDownloads:false});
   await paint.route('**/*',async route=>{try{const response=await resource(route.request().url());await route.fulfill({status:200,contentType:response.type,body:response.body});}catch{await route.abort().catch(()=>{});}});
   await paint.setContent('<!doctype html><html><body style="margin:0;background:transparent"><div id="background"></div></body></html>');
   let embedded=0;
   for(const visual of result.visuals){
    abort.throwIfAborted();const layer=result.layers.find(item=>item.id===visual.id);
    try{
     let png;
     const target={width:Math.max(1,Math.round(layer.width)),height:Math.max(1,Math.round(layer.height))};
     if(visual.kind==='background'){
      if(visual.width>5000||visual.height>5000)throw Error('Oversized background');
      await paint.evaluate(spec=>{const element=document.getElementById('background');element.removeAttribute('style');Object.assign(element.style,spec.css,{width:`${spec.width}px`,height:`${spec.height}px`,position:'absolute',left:`${-spec.clip.x}px`,top:`${-spec.clip.y}px`});},visual);
      png=await paint.screenshot({type:'png',omitBackground:true,clip:{x:0,y:0,width:Math.min(1440,Math.ceil(layer.width)),height:Math.min(900,Math.ceil(layer.height))}});
     }else{
      let body;
      if(visual.kind==='svg')body=Buffer.from(visual.svg);
      else if(visual.data||visual.url?.startsWith('data:')){const match=(visual.data||visual.url).match(/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+=*)$/);if(!match)throw Error('Unsupported embedded image');body=Buffer.from(match[2],'base64');}
      else {const response=await resource(visual.url);if(!/^image\//i.test(response.type))throw Error('Not an image');body=/svg/i.test(response.type)?Buffer.from(selfContainedLogoSvg(response.body.toString('utf8'))):response.body;}
      png=await sharp(body,{limitInputPixels:40_000_000,density:144}).resize({...target,fit:visual.fit??'fill'}).png().toBuffer();
     }
     embedded+=png.length;if(png.length>1_700_000||embedded>16_000_000)throw Error('Large image');
     layer.src=`data:image/png;base64,${png.toString('base64')}`;
    }catch{result.warnings.push('Some page artwork could not be embedded.');}
   }
   const layers=result.layers.filter(layer=>layer.kind!=='image'||layer.src);
   const snapshot=webPageSnapshotSchema.parse({version:1,sourceUrl:url,title:result.title,width:1440,height:900,preview,layers,warnings:[...new Set(result.warnings)].slice(0,12)});
   return snapshot;
  }finally{abort.removeEventListener('abort',stop);}
 }catch(error){
  if(abort.aborted)throw Error(signal?.aborted?'Cancelled':'The page took too long to import.');
  if(/Executable doesn't exist|Chromium distribution|browserType.launch/.test(error.message))throw Error('Google Chrome is required for local HTML imports.');
  if(/Attach.*logo|website address/i.test(error.message))throw Error('This public web page could not be read. Check its URL.');
  if(/page\.(?:goto|evaluate|screenshot)|browserContext|locator\./.test(error.message))throw Error('This public page could not be read. Try another page URL.');
  throw error;
 }finally{proxy?.close();if(browser)await Promise.race([browser.close().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,2000))]);}
}

const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
export function webPageImportPlugin({env=process.env,importPage=(input,signal)=>importWebPage(input,{env,signal}),timeoutMs=65000}={}){
 const active=new Set();
 return {name:'lovable-web-page-import',apply:'serve',configureServer(server){
  server.httpServer?.once('close',()=>{for(const abort of active)abort.abort();});
  server.middlewares.use('/api/web-page-import',async(req,res)=>{
   if(env.VERCEL||!localRequestAllowed(req)){json(res,403,{error:'Use the local studio for HTML imports.'});return;}
   if(req.method!=='POST'){json(res,405,{error:'Method not allowed.'});return;}
   if(req.headers['x-lovable-local']!=='1'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,415,{error:'Expected a local JSON request.'});return;}
   if(active.size){json(res,409,{error:'A page import is already running.'});return;}
   const abort=new AbortController();active.add(abort);const cancel=()=>{if(!res.writableEnded)abort.abort();};res.on('close',cancel);req.on('aborted',cancel);
   const timer=setTimeout(()=>{if(!res.writableEnded)json(res,504,{error:'The page took too long to import. Please retry.'});abort.abort();active.delete(abort);},timeoutMs);
   try{
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4000){json(res,413,{error:'The URL is too long.'});return;}}
    const parsed=webPageImportRequestSchema.safeParse(JSON.parse(body));if(!parsed.success){json(res,400,{error:'Enter a web page URL.'});return;}
    const snapshot=await importPage(parsed.data,abort.signal);if(!abort.signal.aborted)json(res,200,{snapshot});
   }catch(error){if(!abort.signal.aborted&&!res.writableEnded)json(res,422,{error:error.name==='ZodError'?'The page contains unsupported element geometry.':error.message});}
   finally{clearTimeout(timer);active.delete(abort);res.off('close',cancel);req.off('aborted',cancel);}
  });
 }};
}
