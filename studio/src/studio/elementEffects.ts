import type {CSSProperties} from 'react';
import type {ElementAppearance} from './htmlElementAppearance';

/** Shared by the editable canvas, thumbnails, playback and export renderers. */
export function elementEffectsStyle(appearance:ElementAppearance={}):CSSProperties {
 return {mixBlendMode:appearance.blendMode,filter:appearance.blur?`blur(${appearance.blur}px)`:undefined};
}

/** Only affect this mounted selection, never the document or export copies. */
export function previewElementBlend(elements:HTMLElement[],mode:NonNullable<ElementAppearance['blendMode']>){
 elements.forEach(element=>{element.style.setProperty('--hcs-preview-blend-mode',mode);element.setAttribute('data-blend-preview','');});
 return()=>elements.forEach(element=>{element.removeAttribute('data-blend-preview');element.style.removeProperty('--hcs-preview-blend-mode');});
}
