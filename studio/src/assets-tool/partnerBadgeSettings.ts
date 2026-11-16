import { z } from 'zod';

export const badgeFormats = ['solution-horizontal','solution-compact','solution-stacked','solution-symbol','expert-horizontal','expert-compact','expert-stacked','expert-symbol'] as const;
export const partnerBadgeSchema = z.object({
  format: z.enum(badgeFormats),
  role: z.tuple([z.string().max(24), z.string().max(24)]),
  detail: z.tuple([z.string().max(24), z.string().max(24)]),
  partnerName: z.string().max(40),
  partnerImage: z.string().max(2_400_000).regex(/^(?:|data:image\/png;base64,[A-Za-z0-9+/]+=*)$/),
  logoName: z.string().max(200).optional(),
}).strict();
export type PartnerBadgeSettings = z.infer<typeof partnerBadgeSchema>;
export const badgeFormatName = (format: string) => format.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join(' · ');
export const defaultPartnerBadge = (format: PartnerBadgeSettings['format'] = 'solution-stacked'): PartnerBadgeSettings => ({
  format, role: ['Solution','Partner'], detail: [format.startsWith('expert') ? 'Expert' : 'Select','2026'], partnerName:'Logo', partnerImage:'',
});

/** Recognize the previous library imports without turning arbitrary user images into badges. */
export function legacyBadgeFormat(src: string, alt: string) {
  if (src === '/studio/partner-badge.svg') return 'solution-stacked' as const;
  return badgeFormats.find(format => alt === badgeFormatName(format));
}
