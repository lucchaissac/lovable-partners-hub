import type { CSSProperties } from 'react';
import type { HtmlSection } from './htmlEditorModel';
import {cornerRadiusStyle} from './htmlCornerRadius';

export const sectionShadows = {
  none: 'none',
  subtle: '0 0 1px .5px #0000001a, 0 2px 2px #0000000f',
  soft: 'var(--ui-shadow-sm)',
  strong: 'var(--ui-shadow-md)',
};

/** External section spacing is separate from the section's content padding. */
export function htmlSectionWrapperStyle(section: HtmlSection): CSSProperties {
  return { marginBottom: section.spacingAfter };
}

export function htmlSectionStyle(section: HtmlSection): CSSProperties {
  return {
    width: section.widthPx !== undefined ? `${section.widthPx}px` : section.width ? `${section.width}%` : undefined,
    maxWidth: section.widthPx !== undefined ? '100%' : undefined,
    marginInline: section.widthPx !== undefined || section.width ? 'auto' : undefined,
    minHeight: section.minHeight,
    paddingTop: section.paddingTop ?? section.padding,
    paddingRight: section.paddingRight ?? section.padding,
    paddingBottom: section.paddingBottom ?? section.padding,
    paddingLeft: section.paddingLeft ?? section.padding,
    ...cornerRadiusStyle(section),
    boxShadow: section.shadow ? sectionShadows[section.shadow] : undefined,
  };
}

export function resizedSectionWidth(section: HtmlSection, width: number, parentWidth: number): Pick<HtmlSection, 'width' | 'widthPx'> {
  return section.widthPx !== undefined
    ? { widthPx: Math.round(Math.max(160, Math.min(4000, width))) }
    : { width: Math.max(20, Math.min(100, width / Math.max(1, parentWidth) * 100)) };
}
