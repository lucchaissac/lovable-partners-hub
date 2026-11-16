import { Icon } from './Icon';
import { forwardRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import { cn } from '../lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './Dropdown';

// ============================================================
// IconPicker — popover with a color row + glyph grid.
// `@asset/ui` has no icon system of its own, so callers pass a
// `renderIcon` function that knows how to draw their glyphs.
// ============================================================

export type IconPickerValue = {
  name: string | null;
  color: string | null;
};

function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

// ============================================================
// IconPickerSwatch — square trigger showing the current value.
// Exported separately so callers can put it inline (e.g. in
// table cells, list rows) without the dropdown.
// ============================================================

export type IconPickerSwatchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & {
  value: IconPickerValue;
  /** Renders the glyph by id at the given size. */
  renderIcon: (name: string, size: number) => ReactNode;
  /** Visual size in pixels. Default 28. */
  size?: number;
  /** Used by DropdownMenuTrigger; mapped to data-active. */
  active?: boolean;
};

export const IconPickerSwatch = forwardRef<HTMLButtonElement, IconPickerSwatchProps>(
  function IconPickerSwatch(
    { value, renderIcon, size = 28, active, className, style, ...props },
    ref,
  ) {
    const empty = !value.name;
    const color = value.color ?? 'var(--ui-text-muted)';
    return (
      <button
        ref={ref}
        type="button"
        className={cn('ui-reset', 'ui-icon-swatch', className)}
        data-empty={empty ? '' : undefined}
        data-active={active ? '' : undefined}
        aria-label={empty ? 'Pick an icon' : `Icon: ${value.name}`}
        style={{
          width: size,
          height: size,
          background: empty ? 'transparent' : tint(color, 14),
          color,
          ...style,
        }}
        {...props}
      >
        {empty ? (
          <span className="ui-icon-swatch__plus" aria-hidden>
            <Icon name="plus" size={12} />
          </span>
        ) : (
          renderIcon(value.name as string, Math.round(size * 0.5))
        )}
      </button>
    );
  },
);

// ============================================================
// IconPicker — full popover (color row + glyph grid)
// ============================================================

export type IconPickerProps = {
  value: IconPickerValue;
  onChange: (next: IconPickerValue) => void;
  /** Glyph ids shown in the grid. */
  glyphs: string[];
  /** Color palette shown in the row above the grid. */
  colors: string[];
  /** Renders a glyph by id at the given size. Required — `@asset/ui` has no icon system. */
  renderIcon: (name: string, size: number) => ReactNode;
  /** Custom trigger element. Default: an `IconPickerSwatch` of the current value. */
  trigger?: ReactElement<{ onClick?: () => void; active?: boolean }>;
  /** Sizing for the default trigger swatch. Default 32. */
  triggerSize?: number;
  align?: 'start' | 'end';
  /** Width of the popover. Default 280. */
  width?: number;
  /** Section labels. */
  colorLabel?: ReactNode;
  iconLabel?: ReactNode;
  /** Label for the inline "remove" link shown next to the icon section when a glyph is set. */
  removeLabel?: ReactNode;
};

export function IconPicker({
  value,
  onChange,
  glyphs,
  colors,
  renderIcon,
  trigger,
  triggerSize = 32,
  align = 'start',
  width = 280,
  colorLabel = 'Color',
  iconLabel = 'Icon',
  removeLabel = 'Remove',
}: IconPickerProps) {
  const [open, setOpen] = useState(false);

  const setName = (name: string | null) => {
    onChange({
      name,
      color: name ? value.color ?? colors[0] ?? null : null,
    });
  };

  const setColor = (color: string) => {
    if (!value.name) onChange({ name: glyphs[0] ?? null, color });
    else onChange({ name: value.name, color });
  };

  const defaultTrigger = (
    <IconPickerSwatch value={value} renderIcon={renderIcon} size={triggerSize} />
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>{trigger ?? defaultTrigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side="bottom"
        width={width}
        className="ui-icon-popover"
      >
        <div className="ui-icon-popover__section">
          <div className="ui-icon-popover__label">{colorLabel}</div>
          <div className="ui-icon-popover__colors">
            {colors.map((c) => {
              const selected = value.color === c;
              return (
                <button
                  key={c}
                  type="button"
                  className="ui-reset ui-icon-color"
                  data-selected={selected ? '' : undefined}
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  style={{ background: c }}
                />
              );
            })}
          </div>
        </div>

        <div className="ui-icon-popover__section">
          <div className="ui-icon-popover__label-row">
            <span className="ui-icon-popover__label">{iconLabel}</span>
            {value.name && (
              <button
                type="button"
                className="ui-reset ui-icon-popover__clear"
                onClick={() => onChange({ name: null, color: null })}
              >
                {removeLabel}
              </button>
            )}
          </div>
          <div className="ui-icon-popover__glyphs">
            {glyphs.map((g) => {
              const selected = value.name === g;
              const fg = value.color ?? 'var(--ui-text)';
              return (
                <button
                  key={g}
                  type="button"
                  className="ui-reset ui-icon-glyph"
                  data-selected={selected ? '' : undefined}
                  aria-label={g}
                  onClick={() => setName(g)}
                  style={
                    selected
                      ? { background: tint(fg, 14), color: fg }
                      : undefined
                  }
                >
                  {renderIcon(g, 14)}
                </button>
              );
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
