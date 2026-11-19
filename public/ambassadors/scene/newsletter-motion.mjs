export const newsletterLoopSeconds=8;
const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export function newsletterMarkerMotion(seconds,index){
  const phase=((seconds/newsletterLoopSeconds+index*.38196601125)%1+1)%1;
  const enter=smooth(phase/.12),leave=1-smooth((phase-.56)/.2);
  const settle=1-smooth((phase-.12)/.12);
  return {scale:.2+(.8*enter+.12*Math.sin(Math.PI*enter)*settle)*leave,opacity:enter*leave,mailMix:smooth((phase-.24)/.16)};
}
export const newsletterMailScale=seconds=>1+.045*Math.sin(seconds/newsletterLoopSeconds*Math.PI*4);
