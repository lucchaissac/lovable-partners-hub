import {get,put,list} from '@vercel/blob';
import {HubError} from './hubAccess.mjs';
const prefix='hub-shared-designs/v1/';
export function hubBlobStore(env){
  const token=env.HUB_BLOB_READ_WRITE_TOKEN||env.BLOB_READ_WRITE_TOKEN;
  if(!token)throw new HubError(503,'Shared storage is not configured. Contact the hub administrator.');
  const path=(workspace,id)=>`${prefix}${workspace}/${id}.json`;
  return {
    async read(workspace,id){
      const result=await get(path(workspace,id),{access:'private',token,useCache:false});
      if(!result)return null;
      if(result.statusCode!==200||!result.stream)throw Error('Storage read failed.');
      return {record:JSON.parse(await new Response(result.stream).text()),etag:result.blob.etag};
    },
    async write(workspace,id,record,etag){
      try{await put(path(workspace,id),JSON.stringify(record),{access:'private',token,addRandomSuffix:false,allowOverwrite:!!etag,...(etag?{ifMatch:etag}:{}),contentType:'application/json',cacheControlMaxAge:60});}
      catch(error){if(['BlobPreconditionFailedError','BlobAlreadyExistsError'].includes(error?.name))throw new HubError(412,'This design changed. Fetch the latest version before saving again.');throw error;}
    },
    async list(workspace,cursor){
      const result=await list({token,prefix:prefix+workspace+'/',limit:20,...(cursor?{cursor}:{})});
      return {ids:result.blobs.map(blob=>blob.pathname.slice((prefix+workspace+'/').length).replace(/\.json$/,'')),cursor:result.hasMore?result.cursor:null};
    },
  };
}
