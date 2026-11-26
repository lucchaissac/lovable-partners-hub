import {randomUUID} from 'node:crypto';
import {assetSchema, makeNode} from '../studio/src/assets-tool/model';
import {nativeDocument} from '../studio/src/assets-tool/nativeDocument';

// Use the editor's actual schema; shared sources remain native and importable.
export function validateDocument(input:unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Expected an editable source document.');
  const clean = {...input as Record<string,unknown>};
  delete clean.messages; delete clean.workspaceChats; delete clean.workspaceActiveChatId;
  // Local collection membership must not expose or refer to unshared drafts.
  delete clean.series;
  const parsed = assetSchema.safeParse(clean);
  if (!parsed.success) throw Error('Invalid editable source: '+parsed.error.issues.slice(0,3).map(issue=>`${issue.path.join('.')}: ${issue.message}`).join('; '));
  return parsed.data;
}

export function exampleDocument() {
  const document = assetSchema.parse({version:1,id:randomUUID(),title:'A shared design',format:'landscape',dimensions:{width:1200,height:675},background:'#1b1b1b',grid:false,updatedAt:Date.now(),
    reference:{name:'Transparent reference',width:1,height:1,src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg=='},
    nodes:[makeNode('text',{x:64,y:240,w:1000,h:160,text:'Made together.',fontSize:100,weight:'700',color:'white'})]});
  return {...document,editor:nativeDocument(document)};
}
