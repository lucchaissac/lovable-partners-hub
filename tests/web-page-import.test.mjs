import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {webPageURL,importWebPage,webPageImportPlugin} from '../server/webPageImport.mjs';
import {webPageSnapshotSchema} from '../shared/webPageImport.mjs';
import {pageImportProxy} from '../server/webPageProxy.mjs';
import {request} from 'node:http';

test('Page imports reject non-public sources before starting a browser',async()=>{
 assert.equal(webPageURL('lovable.dev'),'https://lovable.dev/');
 for(const input of ['file:///etc/passwd','javascript:alert(1)','https://user:password@example.com','https://example.com:8443'])assert.throws(()=>webPageURL(input));
 for(const url of ['http://127.0.0.1','http://localhost'])await assert.rejects(importWebPage({url},{launch:()=>assert.fail('No browser should launch for a private address')}),/public web page/);
 await assert.rejects(importWebPage({url:'https://lovable.dev'},{env:{VERCEL:'1'},launch:()=>assert.fail('Local only')}),/local studio/);
});
test('A timed-out page import aborts its renderer and releases the next import',async t=>{
 let handler,calls=0,firstSignal;
 const server=createServer((req,res)=>handler(req,res));
 webPageImportPlugin({env:{},timeoutMs:80,importPage:async(input,signal)=>{if(++calls===1){firstSignal=signal;return new Promise(()=>{});}return {sourceUrl:input.url};}}).configureServer({httpServer:server,middlewares:{use(_path,middleware){handler=middleware;}}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url=`http://127.0.0.1:${server.address().port}`,options={method:'POST',headers:{Origin:url,'Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify({url:'https://example.com'})};
 assert.equal((await fetch(url,options)).status,504);assert.equal(firstSignal.aborted,true);
 assert.equal((await fetch(url,options)).status,200);
});
test('The renderer proxy rejects private HTTP reads and HTTPS tunnels',async t=>{
 const abort=new AbortController(),proxy=await pageImportProxy(abort.signal),target=new URL(proxy.url);t.after(()=>proxy.close());
 for(const method of ['GET','CONNECT']){
  const status=await new Promise((resolve,reject)=>{
   const req=request({host:target.hostname,port:target.port,method,path:method==='CONNECT'?'127.0.0.1:443':'http://127.0.0.1/'},res=>{res.resume();resolve(res.statusCode);});
   req.on('connect',(res,socket)=>{socket.destroy();resolve(res.statusCode);});req.on('error',reject);req.end();
  });assert.equal(status,403);
 }
});
test('DOM snapshot data cannot introduce executable HTML or remote image requests',()=>{
 const base={version:1,sourceUrl:'https://lovable.dev',title:'Source title',width:1440,height:900,preview:'data:image/jpeg;base64,aGVsbG8=',layers:[{id:'dom-1',kind:'text',x:100,y:120,width:600,height:80,text:'<script>literal source text</script>',fontSize:40}],warnings:[]};
 assert.equal(webPageSnapshotSchema.parse(base).layers[0].text,base.layers[0].text);
 assert.equal(webPageSnapshotSchema.safeParse({...base,html:'<script/>',layers:base.layers}).success,false);
 assert.equal(webPageSnapshotSchema.safeParse({...base,layers:[{...base.layers[0],kind:'image',src:'https://tracker.example/image.png'}]}).success,false);
 assert.equal(webPageSnapshotSchema.safeParse({...base,layers:[...base.layers,base.layers[0]]}).success,false);
});
test('The local page route checks origin and headers and returns actual importer data',async t=>{
 let handler,calls=0;
 const server=createServer((req,res)=>handler(req,res));
 webPageImportPlugin({env:{},importPage:async input=>{calls++;return {sourceUrl:input.url};}}).configureServer({httpServer:server,middlewares:{use(_path,middleware){handler=middleware;}}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url=`http://127.0.0.1:${server.address().port}`;
 assert.equal((await fetch(url)).status,405);
 assert.equal((await fetch(url,{method:'POST',headers:{Origin:'https://outside.example','Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify({url:'https://lovable.dev'})})).status,403);
 assert.equal((await fetch(url,{method:'POST',body:'{}'})).status,415);
 const response=await fetch(url,{method:'POST',headers:{Origin:url,'Content-Type':'application/json','X-Lovable-Local':'1'},body:JSON.stringify({url:'https://lovable.dev'})});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{snapshot:{sourceUrl:'https://lovable.dev'}});assert.equal(calls,1);
});
