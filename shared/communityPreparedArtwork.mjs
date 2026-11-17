// Prepared from the original kit artwork, without changing its canvas or proportions.
export const communityGradientPreview='/ambassadors/assets/heart-overlay.webp';
export const communityGradientMaster='/ambassadors/assets/heart-overlay.png';
export function preparedCommunityGlobe(settings){
 return settings.format!=='spotlight'&&settings.city.trim().toLowerCase()==='paris'
  ?'/ambassadors/assets/paris-globe-1080.webp':null;
}
