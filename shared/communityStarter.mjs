import {communityDesignMetrics} from './communityDesignRules.mjs';
import {ambassadorDefaultTemplate} from '../src/ambassadors/catalog.js';

// Luc's manual 1080-square composition, captured in examples/community-square-default/.
// These overrides belong to the starter only; the six original kit masters stay intact.
const frames={
 logo:{x:43.2,y:43.2,w:325.62,h:32.00293802722811},
 city:{x:765,y:38.1411,w:271.8,h:38.43,size:32,leading:41.91411042944785,tracking:-.2934/32,weight:'bold'},
 title:{x:43,y:184,w:793,h:439.992,size:160,leading:146.66666666666663,tracking:-.015,weight:'bold'},
 globe:{x:304,y:191,w:1340,h:1340},
 glow:{x:-692.697,y:119.958,w:2340,h:2358.91,rotation:-18.2698},
 eventFooter:{x:43.2,y:993.6,w:993.6,h:43.2,size:32.4,leading:43.2,tracking:0,weight:'bold'},
};
const order=['logo','city','title','event-details','globe','glow','eventFooter'];
export function squareEventLayers(source){
 const {width,height}=ambassadorDefaultTemplate,m=communityDesignMetrics('social',width,height);
 return source.filter(layer=>layer.key!=='event-details'||layer.text?.trim()).map(layer=>{
  const next={...layer,x:layer.x*m.scale,y:layer.y*m.scale,w:layer.w*m.scale,h:layer.h*m.scale};
  if(layer.kind==='text')Object.assign(next,{size:layer.size*m.scale,leading:layer.leading*m.scale});
  return Object.assign(next,frames[layer.key]);
 }).sort((a,b)=>order.indexOf(a.key)-order.indexOf(b.key));
}
