import assets from './assets.json';

const artwork = id => assets.media.find(asset => asset.id === `artwork-${id}`);
const motion = (id, name, width, height) => ({
 id, name, kind:'video', width, height,
 src:`/brand/motion/${id}-960.mp4`, small:`/brand/motion/${id}-480.mp4`,
 thumbnail:`/brand/motion/${id}-poster.webp`,
});
const gradient = id => ({
 id:`gradient-${id}`, name:'Lovable gradient motion', kind:'video', width:960, height:960,
 src:`/gallery/motion-${id}-960.mp4`, small:`/gallery/motion-${id}-480.mp4`, thumbnail:`/gallery/motion-${id}.webp`,
});

export const brandGalleryAssets = [
 motion('fabian','Lovable marketing launch',1280,720),
 motion('og','Lovable animated identity',1200,630),
 gradient(4), artwork(1), artwork(2), artwork(3), artwork(4),
 gradient(3), artwork(5), artwork(6), artwork(7), gradient(8),
 artwork(8), artwork(9), artwork(10), artwork(11), artwork(12),
];
