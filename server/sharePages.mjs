import {workspaceShares,workspaceFromPath,withShareHead} from '../shared/shareMetadata.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
/** Real HTML per universe: crawlers do not receive hash fragments or execute our router. */
export function sharePagesPlugin(){let outDir;return {
 name:'workspace-share-pages',
 configResolved(config){outDir=resolve(config.root,config.build.outDir);},
 transformIndexHtml:{order:'post',handler(html,ctx){return ctx.path==='/studio/index.html'?html:withShareHead(html,workspaceFromPath(ctx.originalUrl?.split('?')[0]??ctx.path));}},
 async writeBundle(){
  const index=await readFile(resolve(outDir,'index.html'),'utf8');
  for(const [key,share] of Object.entries(workspaceShares)){
   const target=resolve(outDir,share.path.slice(1),'index.html');
   await mkdir(dirname(target),{recursive:true});await writeFile(target,withShareHead(index,key));
  }
 },
};}
