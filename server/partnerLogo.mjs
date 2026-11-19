import {lookup} from 'node:dns/promises';
import {isIP,BlockList} from 'node:net';
import http from 'node:http';
import https from 'node:https';
import sharp from 'sharp';

const blocked=new BlockList();
for(const [ip,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]])blocked.addSubnet(ip,prefix,'ipv4');
for(const [ip,prefix] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]])blocked.addSubnet(ip,prefix,'ipv6');
export const isPublicLogoAddress=address=>isIP(address)===4?!blocked.check(address,'ipv4'):isIP(address)===6&&/^[23]/.test(address)&&!blocked.check(address,'ipv6');
export function logoURL(input,base){
 const url=new URL(input,base);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||url.href.length>2000)throw Error('Use a public website address.');
 url.hash='';return url;
}

/** Resolve each redirect separately and pin the validated DNS answer to the socket. */
export async function readLogoURL(input,signal,redirects=0){
 const url=logoURL(input),hostname=url.hostname.replace(/^\[|\]$/g,'');
 const addresses=await lookup(hostname,{all:true});
 if(!addresses.length||addresses.some(item=>!isPublicLogoAddress(item.address)))throw Error('Use a public website address.');
 signal?.throwIfAborted();
 const address=addresses[0];
 const result=await new Promise((resolve,reject)=>{
  const request=(url.protocol==='https:'?https:http).get(url,{signal,headers:{'User-Agent':'LovableStudio/1.0 (partner logo import)','Accept':'text/html,image/svg+xml,image/png,image/webp,image/jpeg'},lookup:(_host,options,done)=>done(null,options.all?[address]:address.address,address.family)},response=>{
   if([301,302,303,307,308].includes(response.statusCode)){response.resume();resolve({redirect:response.headers.location});return;}
   if(response.statusCode!==200){response.resume();reject(Error('The website could not be read. Attach its logo instead.'));return;}
   const chunks=[];let size=0;
   response.on('data',chunk=>{size+=chunk.length;if(size>3_000_000)request.destroy(Error('The website or logo is too large. Attach the logo instead.'));else chunks.push(chunk);});
   response.on('error',reject);response.on('end',()=>resolve({body:Buffer.concat(chunks),type:response.headers['content-type']??'',url:url.href}));
  });
  request.setTimeout(8000,()=>request.destroy(Error('The website took too long. Attach the logo instead.')));request.on('error',reject);
 });
 if('redirect' in result){if(!result.redirect||redirects>=3)throw Error('The website redirected too many times.');return readLogoURL(logoURL(result.redirect,url).href,signal,redirects+1);}
 return result;
}

const decode=value=>value.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,decimal)=>String.fromCodePoint(Math.min(0x10ffff,parseInt(hex||decimal,hex?16:10))));
const attribute=(tag,name)=>decode(tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`,'i'))?.[1]??'');

/** Prefer the site's home signature, never its favicon, social card or customer wall. */
export function websiteLogoCandidates(html,base){
 const clean=html.replace(/<!--[^]*?-->|<script\b[^]*?<\/script>|<style\b[^]*?<\/style>/gi,''),url=logoURL(base),brand=url.hostname.replace(/^www\./,'').split('.')[0];
 const candidates=[];
 const add=(markup,home=false)=>{
  for(const match of markup.matchAll(/<svg\b[^]*?<\/svg>|<img\b[^>]*>/gi)){
   const tag=match[0],opening=tag.slice(0,tag.indexOf('>')+1),descriptor=['alt','aria-label','class','id','src'].map(key=>attribute(opening,key)).join(' ').toLowerCase();
   if(/favicon|sprite|chevron|arrow|customer|client/.test(descriptor))continue;
   let score=home?100:0;
   if(descriptor.includes(brand))score+=30;
   if(/logo|wordmark|logotype/.test(descriptor))score+=30;
   if(score<60)continue;
   if(/^<svg/i.test(tag))candidates.push({svg:tag,score});
   else{const src=attribute(opening,'src')||attribute(opening,'data-src');if(src){try{candidates.push({url:logoURL(src,url).href,score});}catch{}}}
  }
 };
 for(const match of clean.matchAll(/<a\b[^>]*>[^]*?<\/a>/gi)){
  const href=attribute(match[0].slice(0,match[0].indexOf('>')+1),'href');
  try{const link=new URL(href,url);if(href&&link.origin===url.origin&&/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/?)?$/.test(link.pathname))add(match[0],true);}catch{}
 }
 add(clean);
 const seen=new Set();return candidates.sort((a,b)=>b.score-a.score).filter(item=>{const key=item.url||item.svg;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,4);
}

export function selfContainedLogoSvg(svg){
 if(/<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|<image\b|<style\b|\bon\w+\s*=|@import|(?:href\s*=\s*["'](?!#))|url\(\s*["']?(?!#)/i.test(svg))throw Error('Use a self-contained SVG or PNG logo.');
 return svg.replace(/currentColor/gi,'#000000').replace(/<svg\b([^>]*)>/i,(_,attrs)=>`<svg${/\bxmlns=/.test(attrs)?attrs:` xmlns="http://www.w3.org/2000/svg"${attrs}`}>`);
}
const cache=new Map();
export async function resolvePartnerLogo(input,{signal,read=readLogoURL}={}){
 const url=logoURL(input),key=url.href,cached=cache.get(key);
 if(read===readLogoURL&&cached&&cached.expires>Date.now())return cached.value;
 const deadline=AbortSignal.timeout(20000),combined=signal?AbortSignal.any([signal,deadline]):deadline;
 const response=await read(url.href,combined);
 let candidates;
 if(/^image\/(svg\+xml|png|jpeg|webp)(?:;|$)/i.test(response.type))candidates=[{body:response.body,type:response.type}];
 else if(/text\/html|application\/xhtml\+xml/i.test(response.type))candidates=websiteLogoCandidates(response.body.toString('utf8'),response.url);
 else throw Error('This address is not a website or a supported logo image.');
 for(const candidate of candidates){
  try{
   combined.throwIfAborted();
   const image=candidate.svg?{body:Buffer.from(candidate.svg),type:'image/svg+xml'}:candidate.body?candidate:await read(candidate.url,combined);
   if(!/^image\/(svg\+xml|png|jpeg|webp)(?:;|$)/i.test(image.type))continue;
   const body=/svg/i.test(image.type)?Buffer.from(selfContainedLogoSvg(image.body.toString('utf8'))):image.body;
   const png=await sharp(body,{limitInputPixels:40_000_000,density:300}).resize({width:1200,height:1200,fit:'inside'}).png().toBuffer();
   combined.throwIfAborted();
   const value={name:url.hostname.replace(/^www\./,''),image:`data:image/png;base64,${png.toString('base64')}`};
   if(read===readLogoURL){if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{value,expires:Date.now()+86400000});}
   return value;
  }catch(error){if(combined.aborted)throw error;}
 }
 throw Error('No usable partner logo was found on this website. Attach its SVG or PNG to replace it.');
}

const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
export async function partnerLogoHandler(req,res){
 const origin=req.headers.origin;
 let sameOrigin=!origin;try{if(origin)sameOrigin=new URL(origin).host===req.headers.host;}catch{}
 if(req.headers['sec-fetch-site']==='cross-site'||!sameOrigin){json(res,403,{error:'Use the logo importer from this studio.'});return;}
 if(req.method!=='POST'){json(res,405,{error:'Method not allowed.'});return;}
 if(req.headers['x-lovable-logo']!=='1'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']??'')){json(res,415,{error:'Expected a logo request.'});return;}
 const abort=new AbortController(),cancel=()=>{if(!res.writableEnded)abort.abort();};res.on('close',cancel);
 try{
  let body=req.body;
  if(body===undefined){body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4000)break;}}
  if(Buffer.byteLength(typeof body==='string'?body:JSON.stringify(body))>4000){json(res,413,{error:'The website address is too long.'});return;}
  const input=typeof body==='string'?JSON.parse(body):body;
  if(!input||typeof input.url!=='string'){json(res,400,{error:'Include the partner website address.'});return;}
  const result=await resolvePartnerLogo(input.url,{signal:abort.signal});
  if(!abort.signal.aborted)json(res,200,result);
 }catch(error){if(!abort.signal.aborted)json(res,422,{error:error instanceof TypeError||error instanceof SyntaxError?'Use a public website address.':error.message});}
 finally{res.off('close',cancel);}
}
export const partnerLogoPlugin=()=>({name:'partner-logo',configureServer(server){server.middlewares.use('/api/partner-logo',partnerLogoHandler);}});
