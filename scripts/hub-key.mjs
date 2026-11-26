import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {readKeys,tokenHash} from '../server/hubAccess.mjs';
const [action,id,...args]=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2)options[args[i]]=args[i+1];
if(!['create','revoke'].includes(action)||!/^[-a-zA-Z0-9_]{1,80}$/.test(id||''))throw Error('Usage: npm run hub:key -- create <id> --name <name> --workspaces lovable,partners --scopes guidelines:read,assets:read,templates:read,designs:read,designs:write --days 90; or revoke <id>.');
const registry=resolve(options['--registry']||'output/hub-access/keys.json');
let keys=[];try{keys=readKeys({HUB_API_KEYS:await readFile(registry,'utf8')});}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(dirname(registry),{recursive:true,mode:0o700});
if(action==='create'){
  if(keys.some(key=>key.id===id))throw Error('This ID already exists. Use a new ID to rotate a key.');
  const days=Number(options['--days']||90);if(!Number.isInteger(days)||days<1||days>365)throw Error('Choose an expiry from 1 to 365 days.');
  const token='lhub_'+randomBytes(32).toString('base64url');
  const key={id,name:options['--name']||id,sha256:tokenHash(token),workspaces:(options['--workspaces']||'').split(','),scopes:(options['--scopes']||'').split(','),expiresAt:new Date(Date.now()+days*86400000).toISOString()};
  keys=readKeys({HUB_API_KEYS:JSON.stringify([...keys,key])});
  const tokenFile=resolve(dirname(registry),id+'.key');await writeFile(tokenFile,token+'\n',{mode:0o600,flag:'wx'});
  console.log('Individual key saved privately to '+tokenFile+'. Share only with its intended holder.');
}else{
  const key=keys.find(key=>key.id===id);if(!key)throw Error('Key not found.');key.revoked=true;
}
await writeFile(registry,JSON.stringify(keys,null,2)+'\n',{mode:0o600});
console.log('Registry saved to '+registry+'. Set HUB_API_KEYS to this complete JSON and redeploy to apply. Preserve all existing entries.');
