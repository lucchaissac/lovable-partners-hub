import { forwardRef, useId, useMemo, type CSSProperties } from 'react';
import { HtmlEditorV1 } from '../studio/HtmlEditorV1';
import { HtmlEditorSharedContext } from '../studio/HtmlPageNavigation';
import { HtmlSelectionMode } from '../studio/HtmlSelectionMode';
import { WorkspaceEditingContext } from '../studio/WorkspaceAssets';
import { WorkspaceWidgetHost } from '../studio/WorkspaceWidgetHost';
import type { WorkspaceEdit } from '../studio/workspaceEditing';
import { assetDimensions, assetColor, type AssetDocument } from './model';
import { nativeDocument, previewDocument, REFERENCE_IMAGE } from './nativeDocument';

/** The exact same renderer is used for editing, preview, thumbnails and PNG export. */
export const Artwork = forwardRef<HTMLDivElement, { asset: AssetDocument; onChange?: (asset:AssetDocument)=>void; scale?:number }>(function Artwork({asset,onChange,scale=1}, ref) {
  const instance=useId().replace(/[^a-zA-Z0-9-]/g,'');
  const native=useMemo(()=>nativeDocument(asset),[asset]);
  const manual=useMemo(()=>onChange?native:previewDocument(native,instance),[native,!!onChange,instance]);
  const edit=(command:WorkspaceEdit)=>{
    const next=command.type==='manual'?command.value:command.type==='restore'?command.value.workspaceManual:undefined;
    if(next)onChange?.({...asset,editor:next});
  };
  const dimensions=assetDimensions(asset);
  const content=<HtmlEditorSharedContext.Provider value={!onChange}><HtmlSelectionMode.Provider value={true}>
    <WorkspaceEditingContext.Provider value={{manual,onEdit:onChange?edit:undefined,design:{layout:'full-width',contentTopSpacing:0,contentPaddingBottom:0}}}>
      <HtmlEditorV1 canvasOnly zoom={scale} imageSources={{[REFERENCE_IMAGE]:asset.reference.src}}/>
    </WorkspaceEditingContext.Provider>
  </HtmlSelectionMode.Provider></HtmlEditorSharedContext.Provider>;
  return <div ref={ref} className="asset-artwork" data-editable={!!onChange||undefined} data-grid={asset.grid||undefined} style={{width:dimensions.width,height:dimensions.height,backgroundColor:assetColor(asset.background),'--asset-editor-scale':scale} as CSSProperties}>
    {onChange?content:<WorkspaceWidgetHost>{content}</WorkspaceWidgetHost>}
  </div>;
});
