import { workspaceSyncedSourceSchema, workspaceSyncedSectionSchema } from './workspaceSyncedSchema.js';
import { workspaceTaskEditSchema } from './workspaceTaskSchema.js';
import { z } from 'zod';

const link = z.union([z.literal(''), z.url().max(1000).refine(value => /^https:\/\//i.test(value), 'Use an https:// link.')]);
export const contactCardSchema = z.object({
  name: z.string().trim().min(1).max(100), role: z.string().max(120).default(''), company: z.string().max(120).default(''),
  description: z.string().max(1000).default(''), email: z.string().max(200).refine(value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email.').default(''),
  phone: z.string().max(60).regex(/^[+\d ().-]*$/, 'Enter a valid phone number.').default(''), website: link.default(''),
  actionLabel: z.string().max(80).default('Schedule a conversation'), actionUrl: link.default(''),
  layout: z.enum(['stacked', 'horizontal']).default('stacked'),
}).strict();
export type ContactCardValue = z.infer<typeof contactCardSchema>;
// Persist the same contact widget model used by the inventory, including direct edits.
const color = z.string().max(180).regex(/^(#[a-f0-9]{3,8}|transparent|(?:rgb|hsl)a?\([0-9.,% /-]+\)|var\(--(?:ui|ramp)-[a-z0-9-]+(?:,\s*#[a-f0-9]{3,8})?\))$/i);
const image = z.string().max(2000000).refine(value => /^data:image\/(png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/.test(value) || /^\/assets\/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp|gif)$/.test(value));
const textStyle = z.object({size:z.number().min(8).max(96),weight:z.number().min(100).max(900),color,italic:z.boolean(),underline:z.boolean(),spacing:z.number().min(-2).max(10),line:z.number().min(.8).max(3),uppercase:z.boolean()}).strict();
const surface = z.object({background:color,radius:z.number().min(0).max(100),radiusTopLeft:z.number().min(0).max(100).optional(),radiusTopRight:z.number().min(0).max(100).optional(),radiusBottomRight:z.number().min(0).max(100).optional(),radiusBottomLeft:z.number().min(0).max(100).optional(),border:z.number().min(0).max(10),borderColor:color,shadow:z.enum(['none','soft','strong','retro'])}).strict();
const cardStyle = surface.extend({name:textStyle,title:textStyle,button:z.object({background:color,radius:z.number().min(0).max(100),radiusTopLeft:z.number().min(0).max(100).optional(),radiusTopRight:z.number().min(0).max(100).optional(),radiusBottomRight:z.number().min(0).max(100).optional(),radiusBottomLeft:z.number().min(0).max(100).optional(),size:z.number().min(8).max(32),weight:z.number().min(100).max(900)}).strict()});
export const editorContactsSchema = z.object({
  contacts:z.array(z.object({id:z.string().min(1).max(100),name:z.string().max(200),title:z.string().max(300).optional(),description:z.string().max(2000).optional(),size:z.enum(['big','small']).optional(),avatar:image.optional(),hideAvatar:z.boolean().optional(),design:cardStyle.optional(),actions:z.array(z.object({kind:z.enum(['Email','Phone','LinkedIn','Calendar','Website']),value:z.string().max(1000),label:z.string().max(200)}).strict().refine(action => action.kind==='Email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(action.value) : action.kind==='Phone' ? /^[+\d ().-]+$/.test(action.value) : link.safeParse(action.value).success && !!action.value)).max(5).optional()}).strict()).max(30),
  size:z.enum(['big','small']),columns:z.number().int().min(1).max(6).optional(),alignment:z.enum(['left','center','right']),cardStyle:cardStyle.optional(),showTitle:z.boolean().optional(),showLogo:z.boolean().optional(),title:z.string().max(200).optional(),titleColor:color.optional(),logoSrc:image.optional(),background:color.optional(),widgetStyle:surface.optional(),
}).strict().refine(value=>new Set(value.contacts.map(contact=>contact.id)).size===value.contacts.length,'Contact IDs must be unique.');
const workspaceContactEditSchema = z.object({ original: contactCardSchema, value: contactCardSchema, hidden: z.boolean().optional(), fullWidth: z.boolean().optional(), width: z.number().min(10).max(100).optional(), inventory: editorContactsSchema.optional() }).strict();
export const workspaceWidgetEditSchema = z.union([workspaceContactEditSchema, workspaceTaskEditSchema, workspaceSyncedSourceSchema, workspaceSyncedSectionSchema]);
export const workspaceWidgetsSchema = z.record(z.string().regex(/^[a-zA-Z0-9-]{1,80}$/), workspaceWidgetEditSchema).refine(value => Object.keys(value).length <= 100);
export type WorkspaceWidgetEdit = z.infer<typeof workspaceWidgetEditSchema>;
export function resolvedContactCard(original: ContactCardValue, edit?: WorkspaceWidgetEdit) {
  // A prompt that changes the generated props supersedes the old direct edit,
  // just as EditableText does. Unrelated regenerations retain stable props/IDs.
  if (!edit || 'kind' in edit) return { original, value: original };
  if (JSON.stringify(edit.original) === JSON.stringify(original)) return edit;
  if (!edit.inventory) return {original,value:original};
  // A prompt can update the original card without discarding cards inserted in the UI.
  const previous = edit.original;
  const contacts = edit.inventory.contacts.map((contact,index) => {
    if(index) return contact;
    const next = {...contact};
    if(original.name!==previous.name) next.name=original.name;
    if(original.role!==previous.role || original.company!==previous.company) next.title=[original.role,original.company].filter(Boolean).join(' · ');
    if(original.description!==previous.description) next.description=original.description;
    const mappings = [{field:'email',kind:'Email'},{field:'phone',kind:'Phone'},{field:'website',kind:'Website'},{field:'actionUrl',kind:'Calendar'}] as const;
    for(const {field,kind} of mappings) if(original[field]!==previous[field] || (kind==='Calendar' && original.actionLabel!==previous.actionLabel)) {
      next.actions=(next.actions||[]).filter(action=>action.kind!==kind);
      if(original[field]) next.actions.push({kind,value:original[field],label:kind==='Calendar'?original.actionLabel:original[field]});
    }
    if(original.layout!==previous.layout) next.size=original.layout==='horizontal'?'small':'big';
    return next;
  });
  return {...edit,original,value:original,inventory:{...edit.inventory,contacts}};
}
export const workspaceVisualSchema = z.object({
  image: z.string().max(2000000).regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/).optional(),
  context: z.string().max(6000).optional(), page: z.string().max(200).optional(), label: z.string().max(500).optional(),
}).strict();
export type WorkspaceVisual = z.infer<typeof workspaceVisualSchema>;

export const workspaceLinkSchema = z.string().max(2000).refine(value => {
  if (/^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(value) || /^tel:[+\d]+$/.test(value)) return true;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
});
