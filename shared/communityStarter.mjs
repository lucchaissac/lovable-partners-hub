import {communityDesignMetrics} from './communityDesignRules.mjs';
import {ambassadorDefaultTemplate} from '../src/ambassadors/catalog.js';

// The square starter is the Event master, with its original scene and editable layers.
export function squareEventLayers(source){
 const {width,height}=ambassadorDefaultTemplate,m=communityDesignMetrics('social',width,height);
 return source.map(layer=>{
  const next={...layer,x:layer.x*m.scale,y:layer.y*m.scale,w:layer.w*m.scale,h:layer.h*m.scale};
  if(layer.kind==='text')Object.assign(next,{size:layer.size*m.scale,leading:layer.leading*m.scale});
  if(layer.key==='title')Object.assign(next,{w:m.headlineWidth,size:m.headlineSize,leading:m.headlineLeading,h:m.headlineLeading*Math.max(1,layer.text.split('\n').length)});
  if(layer.key==='eventFooter')Object.assign(next,{y:height-m.inset-m.footerLeading,w:width-2*m.inset,size:m.footerSize,leading:m.footerLeading,h:m.footerLeading,weight:'bold'});
  return next;
 });
}
