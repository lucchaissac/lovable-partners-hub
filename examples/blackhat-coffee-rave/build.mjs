import {readFile, writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import sharp from 'sharp';

// A one-off editable composition for Lovable Make. Never installs a global
// starter or overwrites an existing draft; the standard import assigns a new ID.
const root=new URL('../../',import.meta.url);
const source=await readFile(new URL('source-reference.png',import.meta.url));
const metadata=await sharp(source).metadata();
const image=(id,src,alt,x,y,width,height,groupId)=>({
  id,kind:'image',value:{src,alt,caption:'',alignment:'center',width:100},
  editor:{position:'absolute',x,y,widthPx:width,height,...(groupId?{groupId}:{}),appearance:{imageFit:'contain',radius:0}},
});
const text=(id,copy,y,size,leading,height,weight=700)=>({
  id,kind:'text',value:{runs:[{text:copy}],style:'Text',size,align:'center',color:'#ffffff'},
  editor:{position:'absolute',x:36,y,widthPx:528,height,appearance:{fontFamily:'Camera Plain',fontWeight:weight,fontSize:size,lineHeight:leading/size*100,letterSpacing:0}},
});
const divider=(id,x)=>({id,kind:'shape',shape:'line',editor:{
  groupId:'event-signature',position:'absolute',x:x-10.5,y:80,widthPx:22,height:1,rotation:90,
  appearance:{fill:'#ffffff',lineWidth:1,lineStyle:'solid',lineCap:'butt'},
}});
const server=await createServer({root:root.pathname,server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
try {
  const {assetSchema,makeNode}=await server.ssrLoadModule('/studio/src/assets-tool/model.ts');
  const {nativeDocument}=await server.ssrLoadModule('/studio/src/assets-tool/nativeDocument.ts');
  const draft={version:1,id:'d46a8511-94be-4f07-b15b-f1d208afee79',title:'Post Blackhat Coffee Shop Rave',format:'landscape',dimensions:{width:600,height:400},background:'#1b1b1b',grid:false,updatedAt:Date.now(),
    reference:{name:'Original event reference',src:`data:image/png;base64,${source.toString('base64')}`,width:metadata.width,height:metadata.height},
    nodes:[makeNode('text',{name:'Event title',text:'Post Blackhat\nCoffee Shop Rave',x:36,y:151,w:528,h:100,fontSize:48,weight:'700',align:'center',color:'white'})],
  };
  const editor=nativeDocument(draft);
  editor.pages[0].sections[0].columns=[[
    image('event-gradient','/ambassadors/assets/heart-overlay.webp','Original Lovable gradient',-200,-10,1000,1000),
    image('event-lovable','/brand/assets/full-white-pure.svg','Lovable',100,70,112,112*173/950,'event-signature'),
    divider('event-divider-1',232),
    image('event-aikido','/brand/assets/aikido-logo-white.svg','Aikido',253,73,94,94*46/203,'event-signature'),
    divider('event-divider-2',367),
    image('event-incident','/brand/assets/incident-logo-white.svg','incident.io',388,63,112,112*245/1000,'event-signature'),
    text('event-title','Post Blackhat\nCoffee Shop Rave',151,48,50,100),
    text('event-details','9 December — Grind Shoreditch, London',278,19,25,25,600),
  ]];
  const asset=assetSchema.parse({...draft,editor});
  // Regeneration stays separate from the exported, possibly manually refined
  // snapshot in this directory. Import through Make → Add asset → Import.
  await writeFile(process.argv[2]??'/tmp/blackhat-coffee-rave.asset.json',JSON.stringify(asset,null,2)+'\n');
  console.log(`Validated ${asset.dimensions.width} × ${asset.dimensions.height}: ${editor.pages[0].sections[0].columns[0].length} native editable layers.`);
} finally {await server.close();}
