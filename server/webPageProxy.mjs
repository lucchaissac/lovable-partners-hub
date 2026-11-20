import http from 'node:http';
import net from 'node:net';
import {lookup} from 'node:dns/promises';
import {isPublicLogoAddress,logoURL} from './partnerLogo.mjs';

export async function publicPageAddress(input){
 const url=logoURL(input),addresses=await lookup(url.hostname.replace(/^\[|\]$/g,''),{all:true});
 if(!addresses.length||addresses.some(item=>!isPublicLogoAddress(item.address)))throw Error('Use a public web page address.');
 return {url,address:addresses[0]};
}

/** TLS stays end-to-end in Chrome. Each proxy connection pins a validated public IP. */
export async function pageImportProxy(signal){
 const sockets=new Set();let bytes=0;
 const track=socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>socket.destroy());return socket;};
 const count=chunk=>{bytes+=chunk.length;if(bytes>90_000_000)for(const socket of sockets)socket.destroy();};
 const server=http.createServer(async(req,res)=>{
  try{
   const {url,address}=await publicPageAddress(req.url);
   if(url.protocol!=='http:')throw Error('Use CONNECT for HTTPS');
   const headers={...req.headers,host:url.host};delete headers['proxy-authorization'];delete headers['proxy-connection'];
   const upstream=http.request(url,{method:req.method,headers,signal,lookup:(_host,options,done)=>done(null,options.all?[address]:address.address,address.family)},response=>{res.writeHead(response.statusCode??502,response.headers);response.on('data',count);response.pipe(res);});
   upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.pipe(upstream);
  }catch{res.writeHead(403);res.end();}
 });
 server.on('connection',track);
 server.on('connect',async(req,client,head)=>{
  try{
   const target=new URL(`https://${req.url}`);if(target.port&&target.port!=='443')throw Error('Unsupported port');
   const {address}=await publicPageAddress(target.href);signal.throwIfAborted();
   const upstream=track(net.connect({host:address.address,port:443}));
   upstream.once('connect',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);client.pipe(upstream);upstream.pipe(client);});
   upstream.on('data',count);client.on('close',()=>upstream.destroy());upstream.on('close',()=>client.destroy());
  }catch{client.end('HTTP/1.1 403 Forbidden\r\n\r\n');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const close=()=>{for(const socket of sockets)socket.destroy();server.close();};signal.addEventListener('abort',close,{once:true});
 return {url:`http://127.0.0.1:${server.address().port}`,close:()=>{signal.removeEventListener('abort',close);close();}};
}
