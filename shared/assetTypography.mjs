// Local font assets keep the canvas and exported files independent of a font CDN.
export const communityDisplayFonts = [
 {id:'Camera Plain',label:'Camera Plain',css:'"Camera Plain", sans-serif'},
 {id:'Bodoni Moda',label:'Bodoni Moda',css:'"Bodoni Moda", serif'},
 {id:'Pixelify Sans',label:'Pixelify Sans',css:'"Pixelify Sans", sans-serif'},
 {id:'Anton',label:'Anton',css:'"Anton", sans-serif'},
];
export const assetFontFaces = [
 {family:'Camera Plain',src:'/fonts/CameraPlainVariable.woff2',weight:'100 900',style:'normal'},
 {family:'Bodoni Moda',src:'/fonts/community/BodoniModa.woff2',weight:'400 900',style:'normal'},
 {family:'Bodoni Moda',src:'/fonts/community/BodoniModa-Italic.woff2',weight:'400 900',style:'italic'},
 {family:'Pixelify Sans',src:'/fonts/community/PixelifySans.woff2',weight:'400 700',style:'normal'},
 {family:'Anton',src:'/fonts/community/Anton.woff2',weight:'400',style:'normal'},
];
export function fontFacesForAsset(asset){
 const families=new Set(['Camera Plain']);
 for(const block of asset.editor?.pages.flatMap(page=>page.sections.flatMap(section=>section.columns.flat()))??[]){
  if(block.kind==='text')families.add(block.editor?.appearance?.fontFamily??'Camera Plain');
 }
 return assetFontFaces.filter(face=>families.has(face.family));
}
