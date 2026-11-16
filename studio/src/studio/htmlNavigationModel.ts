import { z } from 'zod';

const color = z.string().regex(/^(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent|var\(--[a-z0-9-]+\))$/);
export const htmlPageIcons = ['file-text', 'briefcase', 'chart-line', 'users', 'calendar', 'book-open', 'list-todo', 'globe'] as const;
export const htmlPageIconSchema = z.enum(htmlPageIcons).nullable();
export const htmlNavigationSchema = z.object({
  variant: z.enum(['underline', 'card', 'chip']).optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
  background: color.optional(), text: color.optional(), activeText: color.optional(),
  activeBackground: color.optional(), pillBackground: color.optional(), indicator: color.optional(),
  shadow: z.enum(['none', 'hairline', 'sm', 'md']).optional(),
}).strict();
export type HtmlNavigationDesign = z.infer<typeof htmlNavigationSchema>;

// The content-design agent may theme navigation, not reconfigure its layout.
export const htmlNavigationColorSchema = htmlNavigationSchema.pick({
  background: true, text: true, activeText: true, activeBackground: true,
  pillBackground: true, indicator: true,
});
