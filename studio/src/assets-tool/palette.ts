import type { ColorPickerPalette } from '@asset/ui';
import { websiteTokens } from './websiteTokens';
import {communityBrandColors} from '../../../shared/communityColors.mjs';

const colors = ['ink', 'white', 'blue-deep', 'blue', 'sky', 'blue-light', 'blue-soft',
  'purple', 'purple-light', 'pink', 'pink-soft', 'green-deep', 'green', 'green-light',
  'mint', 'warm-deep', 'warm', 'yellow', 'yellow-soft'] as const;

export const assetPalette: ColorPickerPalette = {
  brandLabel: 'Colors',
  brandColors: colors.map(name => websiteTokens[`color-${name}`]),
  paletteLabel: 'No color',
  paletteColors: ['transparent'],
  showBrand: true,
  showCustom: false,
  showPalette: true,
  resolveColor: color => {
    const name = /^var\(--asset-([\w-]+)\)$/.exec(color)?.[1];
    return name && name in websiteTokens ? websiteTokens[name as keyof typeof websiteTokens] : color;
  },
};

export const communityPalette:ColorPickerPalette={
 ...assetPalette,brandLabel:'Lovable',brandColors:communityBrandColors,
 showCustom:true,showPalette:false,
};
