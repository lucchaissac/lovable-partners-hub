import { ambassadorDefaultFormat, ambassadorFormats } from '../../../src/ambassadors/catalog.js';
import { ambassadorAsset } from './ambassadorAsset';
import { brandStarterAsset } from './brandAsset';
import { communitySettings } from './communityDocument';
import { graphicEventFormat } from './communityGraphic';
import type { AssetDocument } from './model';
import { badgeFormatName, badgeFormats } from './partnerBadgeSettings';
import { badgeAsset, starterAsset } from './starter';
import { techStarterAsset } from './techAsset';

export type AssetWorkspace = 'lovable' | 'partners' | 'ambassadors' | 'tech-blog';
type AssetTemplate = { id: string; name: string; width: number; height: number };

/** Shared collection controls, with only this workspace's original templates. */
export function workspaceAssetTemplates(workspace: AssetWorkspace): AssetTemplate[] {
  if (workspace === 'ambassadors') return [...ambassadorFormats, graphicEventFormat];
  if (workspace === 'lovable') return [
    { id: 'collaboration', name: 'Partnership', width: 1200, height: 675 },
    { id: 'app-studio', name: 'App Studio', width: 1920, height: 1080 },
  ];
  if (workspace === 'tech-blog') return [{ id: 'cover', name: 'Tech blog cover', width: 674, height: 337 }];
  return [
    { id: 'grow-your-business', name: 'Grow your business', width: 1200, height: 738 },
    ...badgeFormats.map(id => ({ id, name: badgeFormatName(id), width: 1200, height: 630 })),
  ];
}

export async function workspaceTemplateAsset(workspace: AssetWorkspace, id?: string, source?: AssetDocument): Promise<AssetDocument> {
  const templateId = id ?? (workspace === 'ambassadors' ? ambassadorDefaultFormat : workspaceAssetTemplates(workspace)[0].id);
  if (!(workspace === 'ambassadors' && templateId === ambassadorDefaultFormat) && !workspaceAssetTemplates(workspace).some(template => template.id === templateId)) throw new Error('This template is not available in this workspace.');
  if (workspace === 'ambassadors') return ambassadorAsset(templateId, communitySettings(source));
  if (workspace === 'lovable') return brandStarterAsset(templateId);
  if (workspace === 'tech-blog') return techStarterAsset();
  return templateId === 'grow-your-business' ? starterAsset() : badgeAsset(templateId);
}
