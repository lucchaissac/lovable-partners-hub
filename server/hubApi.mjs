import {randomUUID} from 'node:crypto';
import {HubError,authenticate,authorize} from './hubAccess.mjs';
import {hubBlobStore} from './hubStore.mjs';
import {catalog,workspaceInfo,hubOrigin} from '../shared/hubApiCatalog.mjs';
import {hubOpenApi} from '../shared/hubOpenApi.mjs';

export const maxHubBody=4*1024*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const metadata=record=>({id:record.document.id,title:record.document.title,workspace:record.workspace,revision:record.revision,createdAt:record.createdAt,updatedAt:record.updatedAt,updatedBy:record.updatedBy});
const send=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));};
async function readBody(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new HubError(415,'Send application/json.');
  if(Number(req.headers['content-length'])>maxHubBody)throw new HubError(413,'Editable sources must be smaller than 4 MiB.');
  let raw=req.body;
  if(raw===undefined){const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>maxHubBody)throw new HubError(413,'Editable sources must be smaller than 4 MiB.');chunks.push(Buffer.from(chunk));}raw=Buffer.concat(chunks).toString('utf8');}
  if(Buffer.isBuffer(raw))raw=raw.toString('utf8');
  if(typeof raw==='object'){if(Buffer.byteLength(JSON.stringify(raw))>maxHubBody)throw new HubError(413,'Editable sources must be smaller than 4 MiB.');}
  else {if(Buffer.byteLength(raw||'')>maxHubBody)throw new HubError(413,'Editable sources must be smaller than 4 MiB.');try{raw=JSON.parse(raw);}catch{throw new HubError(400,'Invalid JSON.');}}
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length!==1||!raw.document)throw new HubError(400,'Send an object containing only document.');
  return raw.document;
}
export function createHubHandler({env=process.env,storeFactory=hubBlobStore,loadDocuments=()=>import('./generated/hubDocument.mjs'),now=Date.now}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Authorization, Origin');
    try{
      const origin=new URL(env.HUB_API_PUBLIC_ORIGIN||hubOrigin).origin;
      const allowed=[origin,...(env.HUB_API_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)];
      if(req.headers.origin){if(!allowed.includes(req.headers.origin))throw new HubError(403,'This browser origin is not allowed.');res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Access-Control-Expose-Headers','ETag, Location');}
      const url=new URL(req.url,'http://hub.local');
      const path=url.pathname.startsWith('/api/hub/v1/')?url.pathname.slice('/api/hub/v1/'.length):url.searchParams.get('path')||'';
      const parts=path.split('/');const resource=parts[0],id=parts[1];
      if(parts.length>2||id&&!uuid.test(id)||!['openapi','me','workspaces','guidelines','assets','templates','example','designs'].includes(resource)||id&&resource!=='designs')throw new HubError(404,'Endpoint not found.');
      const methods=resource==='designs'?(id?['GET','PUT']:['GET','POST']):['GET'];
      if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods',methods.join(', '));res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, If-Match');res.statusCode=204;res.end();return;}
      if(!methods.includes(req.method)){res.setHeader('Allow',methods.join(', '));throw new HubError(405,'Method not allowed.');}
      if(resource==='openapi'){send(res,200,hubOpenApi(origin));return;}
      const key=authenticate(req,env,now());
      if(resource==='me'){send(res,200,{id:key.id,name:key.name,workspaces:key.workspaces,scopes:key.scopes,expiresAt:key.expiresAt});return;}
      if(resource==='workspaces'){send(res,200,{data:key.workspaces.map(w=>workspaceInfo(w,origin))});return;}
      const workspace=url.searchParams.get('workspace');
      const scope=resource==='example'?'templates:read':resource==='designs'&&req.method!=='GET'?'designs:write':resource+':read';
      authorize(key,workspace,scope);
      if(['guidelines','assets','templates'].includes(resource)){send(res,200,{data:catalog(resource,workspace,origin)});return;}
      if(resource==='example'){const {exampleDocument}=await loadDocuments();send(res,200,{document:exampleDocument()});return;}
      const store=storeFactory(env);
      if(req.method==='GET'&&!id){
        const cursor=url.searchParams.get('cursor');if(cursor?.length>2048)throw new HubError(400,'Invalid cursor.');
        const page=await store.list(workspace,cursor);
        if(page.ids.some(id=>!uuid.test(id)))throw Error('Invalid stored design ID.');
        const rows=await Promise.all(page.ids.map(id=>store.read(workspace,id)));
        send(res,200,{data:rows.filter(Boolean).map(row=>metadata(row.record)),nextCursor:page.cursor});return;
      }
      const existing=id?await store.read(workspace,id):null;
      if(id&&!existing)throw new HubError(404,'Shared design not found.');
      if(req.method==='GET'){res.setHeader('ETag',`"${existing.record.revision}"`);send(res,200,{...metadata(existing.record),document:existing.record.document});return;}
      if(id){
        if(!req.headers['if-match'])throw new HubError(428,'If-Match is required. Read the current design first.');
        if(req.headers['if-match']!==`"${existing.record.revision}"`)throw new HubError(412,'This design changed. Fetch the latest version before saving again.');
      }
      const input=await readBody(req);let document;
      try{const {validateDocument}=await loadDocuments();document=validateDocument(input);}catch(error){if(error.code)throw error;throw new HubError(400,error.message);}
      if(id&&document.id!==id)throw new HubError(400,'The document ID must match the shared design being updated.');
      const timestamp=now(),designId=id||randomUUID();
      document={...document,id:designId,updatedAt:timestamp};
      const record={workspace,document,revision:randomUUID(),createdAt:existing?.record.createdAt??timestamp,updatedAt:timestamp,updatedBy:key.id};
      await store.write(workspace,designId,record,existing?.etag);
      res.setHeader('ETag',`"${record.revision}"`);res.setHeader('Location',`${origin}/api/hub/v1/designs/${designId}?workspace=${workspace}`);
      send(res,id?200:201,{...metadata(record),document});
    }catch(error){
      const status=error instanceof HubError?error.status:503;
      if(status===401)res.setHeader('WWW-Authenticate','Bearer realm="Lovable hub"');
      send(res,status,{error:error instanceof HubError?error.message:'The hub service is temporarily unavailable. Please retry.'});
    }
  };
}
export function hubApiPlugin({env}={}){return {name:'hub-api',configureServer(server){
  const origin=`http://${server.config.server.host||'127.0.0.1'}:${server.config.server.port||5173}`;
  const handler=createHubHandler({env:{...process.env,...env,HUB_API_PUBLIC_ORIGIN:origin,HUB_API_ALLOWED_ORIGINS:`${origin},http://localhost:${server.config.server.port||5173}`},loadDocuments:()=>server.ssrLoadModule('/server/hubDocument.ts')});
  server.middlewares.use((req,res,next)=>{if(req.url?.split('?')[0]==='/developers')req.url='/developers.html';if(req.url?.startsWith('/api/hub/v1/'))void handler(req,res);else next();});
}};}
