import type { HtmlBlock } from '../studio/htmlEditorModel';
import { assetSchema, defaultCanvasAnimation, makeNode, resizeAsset, type AssetDocument, type AssetReference } from './model';
import { nativeDocument } from './nativeDocument';
import { rasterLibraryAsset } from './badgeLibrary';
import { linkAssetPages } from './assetSeries';
import { captureBlocks, layoutContentKey } from './layout';

export const holidayConcepts = [
  { id: 'holiday-original', name: 'Build for the holidays', title: 'Build for\nthe holidays' },
  { id: 'holiday-gift', name: 'Build a gift', title: 'Build\na gift' },
  { id: 'holiday-holidays', name: 'Build for holidays', title: 'Build for\nholidays' },
  { id: 'holiday-resolution', name: 'Build your resolution', title: 'Build your\nresolution' },
  { id: 'holiday-best-year', name: 'Build your best year', title: 'Build your\nbest year' },
];

function text(id: string, copy: string, x: number, y: number, width: number, height: number, size: number, leading: number, weight = 700): HtmlBlock {
  return { id, kind: 'text', value: { runs: [{ text: copy }], style: 'Text', size, align: 'left', color: '#ffffff' }, editor: { position: 'absolute', x, y, widthPx: width, height, appearance: { fontFamily: 'Camera Plain', fontWeight: weight, fontSize: size, lineHeight: leading / size * 100, letterSpacing: -size * .04 } } };
}
function image(id: string, src: string, name: string, x: number, y: number, width: number, height: number): HtmlBlock {
  return { id, kind: 'image', brandRole: 'identity', value: { src, alt: name, caption: '', alignment: 'center', width: 100 }, editor: { groupId: 'holiday-identity', position: 'absolute', x, y, widthPx: width, height, appearance: { imageFit: 'contain', radius: 0 } } };
}

/** Local exercise: exact Figma master first, then the four playbook concepts. */
export async function holidayAssets(): Promise<AssetDocument[]> {
  const reference = await rasterLibraryAsset({ id: 'holiday-poster', name: 'Original holiday gradient', src: '/holiday/gradient.webp' });
  return buildHolidayAssets(reference);
}

export function buildHolidayAssets(reference: AssetReference): AssetDocument[] {
  const pages = holidayConcepts.map((concept, index): AssetDocument => {
    const base: AssetDocument = { version: 1, id: crypto.randomUUID(), title: concept.name, format: 'landscape', dimensions: { width: 1092, height: 615 }, reference, background: '#ffa6f9', grid: false, updatedAt: Date.now(), nodes: [makeNode('text', { name: 'Event title', text: concept.name, x: 45, y: 196, w: 764, h: 202 })], animation: { ...defaultCanvasAnimation, enabled: index < holidayConcepts.length - 1, transition: 'instant', delayMs: 2400 } };
    const editor = nativeDocument(base);
    const motion = { kind: 'media' as const, format: 'Video' as const, src: '/gallery/motion-8-960.mp4', poster: '/holiday/gradient.webp', autoplay: false };
    const blocks: HtmlBlock[] = [
      { ...motion, id: 'holiday-gradient', name: 'Background gradient', editor: { position: 'absolute', x: -73, y: -254, widthPx: 1186, height: 1186, appearance: { imageFit: 'cover' } } },
      { ...motion, id: 'holiday-motif', name: 'Holiday motif · Masked video', mediaWindow: { x: -555.8408203125 / 1409.923828125 * 100, y: -1821.150390625 / 1428 * 100, width: 4180.06298828125 / 1409.923828125 * 100, height: 4180.06298828125 / 1428 * 100, maskSrc: '/holiday/motif-mask.svg' }, editor: { position: 'absolute', x: -26, y: -379, widthPx: 1409.923828125, height: 1428, appearance: { imageFit: 'cover' } } },
      image('holiday-symbol', '/holiday/symbol.svg', 'Lovable symbol', 51, 53, 42.9593, 43.6833),
      image('holiday-wordmark', '/holiday/wordmark.svg', 'Lovable wordmark', 108.2446, 53.48, 196.009, 43.686),
      text('holiday-title', concept.title, 45, 196, 900, 202, 129.87, 100.8),
      ...(index === 0 ? [text('holiday-cta', 'Apply to host', 45, 482, 618, 101, 64.87, 100.8, 600)] : [
        text('holiday-date', 'Your date · Time', 45, 486, 1002, 44, 36, 44, 600),
        text('holiday-location', 'Venue · Your city', 45, 534, 1002, 44, 36, 44, 600),
      ]),
    ];
    if (index === 0) blocks.find(block => block.id === 'holiday-title')!.editor!.widthPx = 764;
    editor.pages[0].sections[0].columns = [blocks];
    // Authored social formats use the same layers and preserve the landscape master.
    const contentKey = layoutContentKey(editor);
    const layouts: NonNullable<AssetDocument['layouts']> = {};
    for (const [format, height] of [['square', 1080], ['portrait', 1350]] as const) {
      layouts[format] = { reflowVersion: 2, preserveComposition: true, contentKey, dimensions: { width: 1080, height }, nodes: [{ id: base.nodes[0].id, x: 45, y: 240, w: 900, h: 250 }], blocks: captureBlocks(editor).map(block => {
        if (block.id === 'holiday-gradient') return { ...block, x: -140, y: -100, w: 1550, h: 1550 };
        if (block.id === 'holiday-motif') return { ...block, x: -100, y: 80, w: 1500, h: 1519.23 };
        if (block.id === 'holiday-title') return { ...block, x: 45, y: 240, w: 990, h: 314, fontSize: 160, textSize: 160, lineHeight: 88 };
        if (block.id === 'holiday-cta') return { ...block, y: height - 145 };
        if (block.id === 'holiday-date') return { ...block, y: height - 130 };
        if (block.id === 'holiday-location') return { ...block, y: height - 82 };
        return block;
      }) };
    }
    return assetSchema.parse({ ...base, editor, layouts });
  });
  const squares = pages.map(page => ({ ...resizeAsset(structuredClone(page), 'square', true), id: crypto.randomUUID(), title: `${page.title} · Square` }));
  // Keep every original first; the square copies are independent editable pages.
  const messages=holidayDemoMessages();
  return communityHolidayIdentity(linkAssetPages([...pages, ...squares])).map(page=>({...page,messages}));
}

export const holidayDemoPrompt = 'Use [this Figma template](https://www.figma.com/design/Q5hVpPc6dKxLT5xoi7eYPN/Untitled?node-id=1-2) for our [holiday playbook](https://community-holiday-playbook.lovable.app/). Create a version for each of the four event concepts, with editable event titles, dates and locations. Keep the five landscape designs and add matching squares, using the larger headline from asset 6. Use the full Lovable Community logo.';
export const holidayDemoReply = 'Ready — five landscape designs and five matching square posts, with the full Lovable Community logo. The four concepts are Build a gift, Build for holidays, Build your resolution and Build your best year. Titles, dates and locations are editable, and the gradient videos and vector masks stay separate. The squares follow the larger headline style from asset 6.';
function holidayDemoMessages(): NonNullable<AssetDocument['messages']> {
  return [true,false].map(user=>({id:crypto.randomUUID(),createdAt:new Date().toISOString(),user,text:user?holidayDemoPrompt:holidayDemoReply,channel:'workspace' as const,workspaceChatId:'workspace'}));
}
export function isHolidayAsset(page: AssetDocument) {
  return !!page.editor?.pages.some(p=>p.sections.some(section=>section.columns.flat().some(block=>block.id==='holiday-motif'&&block.kind==='media'&&block.mediaWindow?.maskSrc==='/holiday/motif-mask.svg')));
}
/** Logo-only correction: retain every page ID, native text, media, transform and manual edit. */
export function communityHolidayIdentity(pages: AssetDocument[]): AssetDocument[] {
  return pages.map(page=>{
    if(!isHolidayAsset(page)||!page.editor)return page;
    const old=page.editor.pages.flatMap(p=>p.sections.flatMap(section=>section.columns.flat())).find(block=>block.id==='holiday-symbol');
    if(!old?.editor)return page;
    // Match the existing heart height, retaining the source lockup's proportions and descender.
    const scale=(old.editor.height??43.6833)/35.6303;
    const logo=image('holiday-community-logo','/ambassadors/assets/lovable-community.svg','Lovable Community',old.editor.x??51,old.editor.y??53,470.029*scale,46.1959*scale);
    logo.editor={...old.editor,groupId:undefined,widthPx:470.029*scale,height:46.1959*scale};
    const replace=(blocks: HtmlBlock[])=>blocks.flatMap(block=>block.id==='holiday-symbol'?[logo]:block.id==='holiday-wordmark'?[]:[block]);
    const editor={...page.editor,pages:page.editor.pages.map(p=>({...p,sections:p.sections.map(section=>({...section,columns:section.columns.map(replace)}))}))};
    const layouts=Object.fromEntries(Object.entries(page.layouts??{}).map(([format,layout])=>[format,layout?{...layout,preserveComposition:true,blocks:layout.blocks.flatMap(b=>b.id==='holiday-symbol'?[{...b,id:logo.id,w:470.029*b.h/35.6303,h:46.1959*b.h/35.6303}]:b.id==='holiday-wordmark'?[]:[b])}:layout]));
    return assetSchema.parse({...page,editor,layouts});
  });
}
