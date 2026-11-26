import {hubWorkspaces,hubOrigin} from './hubApiCatalog.mjs';
export function hubOpenApi(origin=hubOrigin){
  const workspace={name:'workspace',in:'query',required:true,schema:{type:'string',enum:hubWorkspaces}};
  const error={description:'Request rejected',content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}};
  const responses={'200':{description:'Successful response',content:{'application/json':{schema:{type:'object'}}}},'400':error,'401':error,'403':error,'404':error,'503':error};
  const read=(operationId,summary,parameters=[])=>({operationId,summary,parameters,responses});
  const write=(operationId,summary,update=false)=>({operationId,summary,parameters:[workspace,...(update?[{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}},{name:'If-Match',in:'header',required:true,schema:{type:'string'},description:'The exact quoted ETag returned by the last read.'}]:[])],requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['document'],additionalProperties:false,properties:{document:{type:'object',description:'Native .asset.json source. Start with the example endpoint or Export → Editable source in Make. Validated by the same schema as the editor. Chats and local series membership are removed.'}}}}}},responses:{...responses,...(!update?{'201':{description:'Created shared design'}}:{}),'412':error,'413':error,'415':error,'428':error}});
  return {openapi:'3.1.0',info:{title:'Lovable hub API',version:'1.0.0',description:'Authorized access to brand resources and shared editable designs. Keys are scoped by workspace and action. Existing browser drafts are private to their device until explicitly uploaded. Media already served by the public hub keeps its existing visibility.'},servers:[{url:origin+'/api/hub/v1'}],security:[{hubKey:[]}],paths:{
    '/me':{get:read('getAccess','Inspect your access')},
    '/workspaces':{get:read('listWorkspaces','List authorized workspaces')},
    ...Object.fromEntries(['guidelines','assets','templates'].map(resource=>['/'+resource,{get:read('read'+resource[0].toUpperCase()+resource.slice(1),'Read '+resource,[workspace])}])),
    '/example':{get:read('getExampleDocument','Get a native editable starter document',[workspace])},
    '/designs':{get:read('listDesigns','List shared designs',[workspace,{name:'cursor',in:'query',schema:{type:'string',maxLength:2048}}]),post:write('createDesign','Create a shared design')},
    '/designs/{id}':{get:read('getDesign','Read one shared design and its ETag',[workspace,{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}}]),put:write('updateDesign','Save a new version of a shared design',true)},
  },components:{securitySchemes:{hubKey:{type:'http',scheme:'bearer',description:'An individual lhub_ key issued by the hub administrator. Never include it in a URL.'}},schemas:{Error:{type:'object',required:['error'],properties:{error:{type:'string'}}}}}};
}
