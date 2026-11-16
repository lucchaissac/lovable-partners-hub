import { z } from 'zod';
import type { CSSProperties } from 'react';

export const themeColor = z.string().regex(/^(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent)$/);
export const htmlWidgetThemeSchema = z.object({
 accent:themeColor.optional(),surface:themeColor.optional(),text:themeColor.optional(),muted:themeColor.optional(),border:themeColor.optional(),buttonText:themeColor.optional(),
 fontFamily:z.enum(['Arial','Arial','Georgia','Verdana','Times New Roman']).optional(),
 radius:z.number().min(0).max(80).optional(),shadow:z.enum(['none','soft','strong']).optional(),
 frame:z.enum(['card','unframed']).optional(),
}).strict();
export type HtmlWidgetTheme=z.infer<typeof htmlWidgetThemeSchema>;
export function htmlWorkspaceThemeStyle(design?:{background?:string;widgetTheme?:HtmlWidgetTheme}):CSSProperties {
 const theme=design?.widgetTheme;
 return {background:design?.background,...Object.fromEntries(Object.entries(theme||{}).map(([key,value])=>[`--workspace-widget-${key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}`,key==='radius'?`${value}px`:key==='shadow'?({none:'none',soft:'0 6px 20px #0000000d',strong:'0 12px 36px #0000001a'} as const)[value as 'none'|'soft'|'strong']:value])),...(theme?.frame==='unframed'?{'--workspace-widget-frame-border':'0','--workspace-widget-frame-shadow':'none','--workspace-widget-frame-radius':'0px','--workspace-widget-frame-background':'transparent'}:{})} as CSSProperties;
}
