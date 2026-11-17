import {curveDefaults,gridDefaults,techArtworkDataUrl,techArtworkSvg} from '../../../shared/techArtwork.mjs';
import {techArtworkSchema,type TechArtworkSettings} from './techArtworkSettings';
import type {HtmlBlock} from '../studio/htmlEditorModel';
type ImageBlock=Extract<HtmlBlock,{kind:'image'}>;
export function isTechArtwork(block:HtmlBlock):boolean{return block.kind==='image'&&(!!block.techArtwork||['/tech-blog/cover-curves.svg','/tech-blog/cover-grid.svg'].includes(block.value.src));}
export function techArtworkSettings(block:ImageBlock):TechArtworkSettings{return block.techArtwork??techArtworkSchema.parse(block.value.src.includes('grid')?gridDefaults:curveDefaults);}
export function renderedTechSource(block:ImageBlock){return block.techArtwork?techArtworkDataUrl(block.techArtwork):block.value.src;}
export function updateTechArtwork(block:ImageBlock,settings:TechArtworkSettings):ImageBlock{return {...block,techArtwork:techArtworkSchema.parse(settings)};}
export {techArtworkSvg};
