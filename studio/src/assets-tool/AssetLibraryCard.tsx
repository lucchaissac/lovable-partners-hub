import {useLayoutEffect,useRef,useState} from 'react';
import {StudioLibraryCard,editedLabel} from '../studio/StudioLibraryCard';
import {readStudioConfig} from '../studio/client';

import {Artwork} from './Artwork';
import {assetDimensions,type AssetDocument} from './model';

export function AssetLibraryCard({asset,onOpen}:{asset:AssetDocument;onOpen:()=>void}) {
  const preview=useRef<HTMLSpanElement>(null),[bounds,setBounds]=useState({width:240,height:156});
  useLayoutEffect(()=>{if(!preview.current)return;const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(preview.current);return()=>observer.disconnect();},[]);
  const dimensions=assetDimensions(asset),scale=Math.min(bounds.width/dimensions.width,bounds.height/dimensions.height),user=readStudioConfig()?.user;
  const date=new Date(asset.updatedAt).toISOString();
  return <StudioLibraryCard title={asset.title} author={user?.name??'You'}  caption={<time dateTime={date}>{editedLabel(date)}</time>} onOpen={onOpen}
    thumbnail={<span className="studio-prototype-thumbnail asset-thumbnail" ref={preview}><span className="asset-thumbnail-stage" style={{width:dimensions.width*scale,height:dimensions.height*scale}}><span className="asset-thumbnail-transform" style={{transform:`scale(${scale})`}}><Artwork asset={asset}/></span></span></span>}/>;
}
