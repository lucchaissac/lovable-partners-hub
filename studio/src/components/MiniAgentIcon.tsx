import { Icon } from './Icon';

export type AgentTone = 'blue' | 'pink' | 'green' | 'cream' | 'cyan' | 'mint';

export const TONE_BG: Record<AgentTone, string> = {
  blue: 'color-mix(in srgb, var(--ui-agent-blue) 12%, var(--ui-bg))',
  pink: 'color-mix(in srgb, var(--ui-agent-purple) 12%, var(--ui-bg))',
  green: 'color-mix(in srgb, var(--ui-agent-green) 12%, var(--ui-bg))',
  cream: 'color-mix(in srgb, var(--ui-agent-amber) 12%, var(--ui-bg))',
  cyan: 'color-mix(in srgb, var(--ui-agent-cyan) 12%, var(--ui-bg))',
  mint: 'color-mix(in srgb, var(--ui-agent-teal) 12%, var(--ui-bg))',
};

export const TONE_FG: Record<AgentTone, string> = {
  blue: 'var(--ui-agent-blue)',
  pink: 'var(--ui-agent-purple)',
  green: 'var(--ui-agent-green)',
  cream: 'var(--ui-agent-amber)',
  cyan: 'var(--ui-agent-cyan)',
  mint: 'var(--ui-agent-teal)',
};

/** Mini agent indicator — the agent glyph painted in its tone colour,
 *  no background block. Used inline (composer tag, conversation avatar,
 *  mention row, dropdown leading icon). */
export function MiniAgentIcon({
  icon,
  tone,
  size = 18,
  iconSize,
}: {
  icon: string;
  tone: AgentTone;
  size?: number;
  iconSize?: number;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        color: TONE_FG[tone],
        flexShrink: 0,
      }}
    >
      <Icon name={icon} size={iconSize ?? size} />
    </span>
  );
}
