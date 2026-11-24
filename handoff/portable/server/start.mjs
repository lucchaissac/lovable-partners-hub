import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import community from '../api/community-chat.mjs';
import brand from '../api/brand-review.mjs';
import animation from '../api/studio-animation.mjs';
import logo from '../api/partner-logo.mjs';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const routes={'/api/community-chat':community,'/api/brand-review':brand,'/api/studio-animation':animation,'/api/partner-logo':logo};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(routes[path]){await routes[path](req,res);return;}
  if(path.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({enabled:false,error:'This optional service is not configured.'}));return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let file=resolve(root,'.'+path);
  if(file!==root.slice(0,-1)&&!file.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403);res.end();return;}
  let info=await stat(file).catch(()=>null);
  if(info?.isDirectory()){file=resolve(file,'index.html');info=await stat(file).catch(()=>null);}
  if(!info?.isFile()){res.writeHead(404);res.end('Not found');return;}
  const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Content-Length':data.length,'X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
 }catch{if(!res.headersSent)res.writeHead(500);res.end('Could not complete the request.');}
});
const port=Number(process.env.PORT)||3000;
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Brand hub is available on port ${port}.`));
