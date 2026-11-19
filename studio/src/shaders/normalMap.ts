/** Euclidean distance to a transparent pixel, using separable parabola envelopes. */
export function silhouetteDistance(alpha:Uint8ClampedArray,width:number,height:number){
 const field=new Float32Array(width*height),line=new Float32Array(Math.max(width,height));
 const output=new Float32Array(line.length),sites=new Int32Array(line.length),edges=new Float32Array(line.length+1);
 const transform=(length:number)=>{
  let k=0;sites[0]=0;edges[0]=-Infinity;edges[1]=Infinity;
  for(let q=1;q<length;q++){
   let cross=((line[q]+q*q)-(line[sites[k]]+sites[k]*sites[k]))/(2*(q-sites[k]));
   while(cross<=edges[k]&&k>0){k--;cross=((line[q]+q*q)-(line[sites[k]]+sites[k]*sites[k]))/(2*(q-sites[k]));}
   sites[++k]=q;edges[k]=cross;edges[k+1]=Infinity;
  }
  k=0;for(let q=0;q<length;q++){while(edges[k+1]<q)k++;output[q]=(q-sites[k])**2+line[sites[k]];}
 };
 for(let y=0;y<height;y++){for(let x=0;x<width;x++)line[x]=alpha[(y*width+x)*4+3]>127?1e9:0;transform(width);for(let x=0;x<width;x++)field[y*width+x]=output[x];}
 for(let x=0;x<width;x++){for(let y=0;y<height;y++)line[y]=field[y*width+x];transform(height);for(let y=0;y<height;y++)field[y*width+x]=Math.sqrt(output[y]);}
 return field;
}
export function makeNormalMap(source:HTMLCanvasElement){
 const {width,height}=source,pixels=source.getContext('2d')!.getImageData(0,0,width,height),normal=document.createElement('canvas');
 normal.width=width;normal.height=height;
 const relief=new Float32Array(width*height),hasSilhouette=pixels.data.some((a,i)=>i%4===3&&a<128),radius=Math.max(3,Math.min(width,height)*.065);
 const distance=hasSilhouette?silhouetteDistance(pixels.data,width,height):undefined;
 for(let i=0;i<relief.length;i++)relief[i]=distance?Math.sqrt(Math.max(0,1-Math.max(0,1-distance[i]/radius)**2)):(pixels.data[i*4]*.2126+pixels.data[i*4+1]*.7152+pixels.data[i*4+2]*.0722)/255*.3;
 // Smooth the height field before deriving normals, preventing staircase reflections
 // around curved glyphs while retaining the original alpha silhouette exactly.
 const scratch=new Float32Array(relief.length),blurRadius=2;
 for(let pass=0;pass<2;pass++){
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){let sum=0;for(let d=-blurRadius;d<=blurRadius;d++)sum+=relief[y*width+Math.max(0,Math.min(width-1,x+d))];scratch[y*width+x]=sum/(blurRadius*2+1);}
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){let sum=0;for(let d=-blurRadius;d<=blurRadius;d++)sum+=scratch[Math.max(0,Math.min(height-1,y+d))*width+x];relief[y*width+x]=sum/(blurRadius*2+1);}
 }
 const result=new ImageData(width,height),at=(x:number,y:number)=>relief[Math.max(0,Math.min(height-1,y))*width+Math.max(0,Math.min(width-1,x))];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  // A small Sobel neighbourhood smooths the raster silhouette without moving the type.
  const dx=((at(x+1,y-1)+2*at(x+1,y)+at(x+1,y+1))-(at(x-1,y-1)+2*at(x-1,y)+at(x-1,y+1)))*radius/8;
  const dy=((at(x-1,y+1)+2*at(x,y+1)+at(x+1,y+1))-(at(x-1,y-1)+2*at(x,y-1)+at(x+1,y-1)))*radius/8;
  const length=Math.hypot(dx,dy,1),i=(y*width+x)*4;
  result.data[i]=(0.5-dx/length*.5)*255;result.data[i+1]=(0.5-dy/length*.5)*255;result.data[i+2]=(0.5+1/length*.5)*255;result.data[i+3]=255;
 }
 normal.getContext('2d')!.putImageData(result,0,0);return normal;
}
