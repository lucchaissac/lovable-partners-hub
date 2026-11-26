import {createHash,timingSafeEqual} from 'node:crypto';
import {hubWorkspaces,hubScopes} from '../shared/hubApiCatalog.mjs';
export class HubError extends Error{constructor(status,message){super(message);this.status=status;}}
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export function readKeys(env){
  try{
    const keys=JSON.parse(env.HUB_API_KEYS||'[]'),ids=new Set(),hashes=new Set();
    if(!Array.isArray(keys)||keys.length>200)throw Error();
    for(const key of keys){
      if(!key||!/^[-a-zA-Z0-9_]{1,80}$/.test(key.id)||!key.name||typeof key.name!=='string'||key.name.length>120||!/^[a-f0-9]{64}$/.test(key.sha256)||!Number.isFinite(Date.parse(key.expiresAt))||!Array.isArray(key.workspaces)||!key.workspaces.length||!key.workspaces.every(w=>hubWorkspaces.includes(w))||!Array.isArray(key.scopes)||!key.scopes.length||!key.scopes.every(s=>hubScopes.includes(s))||key.revoked!==undefined&&typeof key.revoked!=='boolean'||ids.has(key.id)||hashes.has(key.sha256))throw Error();
      ids.add(key.id);hashes.add(key.sha256);
    }
    return keys;
  }catch{throw new HubError(503,'Access configuration is unavailable. Contact the hub administrator.');}
}
export function authenticate(req,env,now=Date.now()){
  const keys=readKeys(env);
  if(!keys.length)throw new HubError(503,'Access is not configured. Contact the hub administrator.');
  const authorization=req.headers.authorization??'';
  if(typeof authorization!=='string'||!/^Bearer lhub_[A-Za-z0-9_-]{43}$/i.test(authorization))throw new HubError(401,'A valid access key is required.');
  const hash=Buffer.from(tokenHash(authorization.slice(7)),'hex');
  const key=keys.find(key=>timingSafeEqual(hash,Buffer.from(key.sha256,'hex')));
  if(!key||key.revoked||Date.parse(key.expiresAt)<=now)throw new HubError(401,'This access key is invalid, expired or revoked.');
  return key;
}
export function authorize(key,workspace,scope){
  if(!hubWorkspaces.includes(workspace))throw new HubError(400,'Choose a valid workspace.');
  if(!key.workspaces.includes(workspace)||!key.scopes.includes(scope))throw new HubError(403,'This access key does not allow this action in this workspace.');
}
