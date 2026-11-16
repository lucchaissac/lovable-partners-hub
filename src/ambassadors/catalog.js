export const ambassadorFormats = [
 {id:'banner',name:'Roll-up',width:850,height:2000,detail:'85 × 200 cm'},
 {id:'poster',name:'Poster',width:1440,height:720,detail:'72 × 36 in'},
 {id:'social',name:'Event',width:1200,height:630,detail:'1200 × 630 px'},
 {id:'speakers',name:'Speakers',width:1200,height:630,detail:'1200 × 630 px'},
 {id:'spotlight',name:'Spotlight',width:1080,height:1080,detail:'1080 × 1080 px'},
 {id:'badge',name:'Name tag',width:900,height:600,detail:'90 × 60 mm'},
];
export const ambassadorSections=[['overview','Overview'],['identity','Identity'],['construction','Construction'],['clear-space','Clear space'],['layout','Layout'],['typography','Typography'],['globe','Globe'],['formats','Formats'],['usage','In use']];
export const ambassadorPreview=id=>`/ambassadors/previews/${id}.webp`;
