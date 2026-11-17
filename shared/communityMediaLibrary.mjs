// Curated local artwork. These IDs are the only library image sources the planner can use.
const media=(id,name,file,width,height,category,description)=>({id,name,src:`/ambassadors/library/${file}.webp`,thumbnail:`/ambassadors/library/${file}-thumb.webp`,width,height,category,description});
export const communityMediaLibrary=[
 media('library-flash-dark','Flash · Dark','flash-dark',1254,1254,'Photos','Fictional diverse makers in a dark interior. Exact Community badges and a gradient laptop sticker are baked into this photo. Quiet dark upper-left area for light copy.'),
 media('library-flash-light','Flash · Light','flash-light',1254,1254,'Photos','The matching fictional maker group on a pale wall, with exact Community badges and laptop sticker baked in. Dark copy belongs above the people; keep faces clear.'),
 media('library-malaga-makers','Málaga makers','malaga-makers',1254,1254,'Photos','Fictional makers collaborating in a Mediterranean cafe, with a pale wall and palm shadow. Community badges and the exact laptop sticker are baked in. Keep the large upper quiet area for dark copy.'),
 media('library-paper-collage','Paper collage','paper-collage',1254,1254,'Illustrations','Transparent tactile paper collage with a printed Lovable gradient. Use a large deliberate lower/right edge crop.'),
 media('library-mediterranean-materials','Mediterranean materials','mediterranean-materials',1536,1024,'Illustrations','Transparent limestone arch, lavender material, gradient paper and green palm frond. The approved Málaga artwork; preserve its colors and original silhouette.'),
 media('library-leaf-macro','Leaf macro','leaf-macro',1254,1254,'Illustrations','Transparent green leaf macro with a water droplet and subtle Lovable-color refraction. Large lower/right crop, keep the leaf green.'),
 media('library-pixel-abstraction','Pixel abstraction','pixel-abstraction',600,600,'Shapes','A single flat Lovable-beige stepped geometric loop on transparency. Clean abstract pixels, no gradient, texture, glow or figurative gaming object. Use a large deliberate edge crop.'),
 media('library-pixel-abstraction-dark','Pixel abstraction · Dark ink','pixel-abstraction-dark',600,600,'Shapes','The exact same stepped loop in #1b1b1b on transparency, for a light or Lovable-beige canvas. Preserve its geometry and crop.'),
 media('library-pixel-bloom','Pixel bloom','pixel-bloom',600,600,'Shapes','A flat Lovable-beige stepped four-point geometric shape on transparency. Abstract, no gradient or texture. Large right-edge crop, clear of the headline.'),
];
export const communityMediaById=new Map(communityMediaLibrary.map(item=>[item.id,item]));
