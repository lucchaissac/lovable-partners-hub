/** Remove a detected flat matte, including enclosed counters, and retain anti-aliased edges. */
export function cleanLogoPixels(pixels: Uint8ClampedArray, width: number, height: number) {
  const result = new Uint8ClampedArray(pixels), edge: number[] = [];
  for (let x=0;x<width;x++) edge.push(x*4,((height-1)*width+x)*4);
  for (let y=1;y<height-1;y++) edge.push(y*width*4,(y*width+width-1)*4);
  const transparent = edge.filter(i => pixels[i+3]<20).length / edge.length > .65;
  const corners = [0,(width-1)*4,((height-1)*width)*4,(width*height-1)*4].filter(i=>pixels[i+3]>240);
  const distance = (i:number, color:number[]) => Math.max(...color.map((c,k)=>Math.abs(pixels[i+k]-c)));
  const candidates = corners.map(i=>[pixels[i],pixels[i+1],pixels[i+2]]);
  const background = !transparent ? candidates.find(color=>edge.filter(i=>pixels[i+3]>240&&distance(i,color)<30).length/edge.length>.8) : undefined;
  if (!transparent && !background) throw new Error('Use a logo on a transparent or plain background.');
  let left=width,top=height,right=-1,bottom=-1;
  for (let i=0;i<result.length;i+=4) {
    if(background) {
      const delta=distance(i,background);
      result[i+3]=Math.round(result[i+3]*Math.min(1,Math.max(0,(delta-18)/46)));
    }
    result[i]=result[i+1]=result[i+2]=255;
    if(result[i+3]>12){const index=i/4,x=index%width,y=Math.floor(index/width);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  }
  if(right<left||bottom<top) throw new Error('No logo was detected. Try a file with more contrast.');
  return {pixels:result,crop:{x:left,y:top,width:right-left+1,height:bottom-top+1},removed:!!background};
}
