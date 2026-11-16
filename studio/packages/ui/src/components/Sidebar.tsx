import { Icon } from './Icon';
import { createContext, forwardRef, useContext, useId, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type SidebarTone = 'light' | 'dark';

type SidebarCtx = { tone: SidebarTone };
const Ctx = createContext<SidebarCtx>({ tone: 'light' });
export const useSidebarTone = () => useContext(Ctx).tone;

// ============================================================
// <Sidebar> — root container. Holds tone, sets up
// flex column with scrollable content and optional footer slot.
// ============================================================

export type SidebarProps = HTMLAttributes<HTMLDivElement> & {
  tone?: SidebarTone;
  width?: string | number;
  height?: string | number;
  bordered?: boolean;
};

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(function Sidebar(
  { tone = 'light', width, height, bordered, className, style, children, ...props },
  ref,
) {
  return (
    <Ctx.Provider value={{ tone }}>
      <div
        ref={ref}
        data-tone={tone}
        data-bordered={bordered ? '' : undefined}
        className={cn('ui-sidebar', className)}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
});

export type SidebarContentProps = HTMLAttributes<HTMLDivElement>;
export const SidebarContent = forwardRef<HTMLDivElement, SidebarContentProps>(
  function SidebarContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('ui-sidebar-content', className)} {...props} />;
  },
);

export type SidebarFooterProps = HTMLAttributes<HTMLDivElement>;
export const SidebarFooter = forwardRef<HTMLDivElement, SidebarFooterProps>(
  function SidebarFooter({ className, ...props }, ref) {
    return <div ref={ref} className={cn('ui-sidebar-footer', className)} {...props} />;
  },
);

// ============================================================
// <SidebarSection> — vertical group with optional top divider.
// ============================================================

export type SidebarSectionProps = HTMLAttributes<HTMLDivElement> & {
  divided?: boolean;
};

export const SidebarSection = forwardRef<HTMLDivElement, SidebarSectionProps>(
  function SidebarSection({ className, divided, style, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-divided={divided ? '' : undefined}
        className={cn('ui-sidebar-section', className)}
        style={style}
        {...props}
      />
    );
  },
);

// ============================================================
// <SidebarSectionHeader>
// ============================================================

export type SidebarSectionHeaderProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  title: ReactNode;
  trailingIcon?: ReactNode;
};

export const SidebarSectionHeader = forwardRef<HTMLDivElement, SidebarSectionHeaderProps>(
  function SidebarSectionHeader({ title, trailingIcon, className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('ui-sidebar-section-header', className)}
        {...props}
      >
        <span className="ui-sidebar-section-header-title">{title}</span>
        {trailingIcon && (
          <span className="ui-sidebar-section-header-trailing">{trailingIcon}</span>
        )}
      </div>
    );
  },
);

// ============================================================
// <SidebarItem> — one row.
// ============================================================

export type SidebarItemProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  label: ReactNode;
  leadingIcon?: ReactNode;
  /** Align an iconless row with neighboring icon labels. */
  reserveLeadingSpace?: boolean;
  trailingIcon?: ReactNode;
  hoverTrailingIcon?: ReactNode;
  selected?: boolean;
  indent?: 0 | 1;
  showDot?: boolean;
  /** Override text/icon color and derive a tinted bg for selected state. */
  accentColor?: string;
  /** Force the trailing icon to stay visible. */
  keepTrailingVisible?: boolean;
  /** Consumed when used as a Dropdown trigger; reflects open state. */
  active?: boolean;
};

const tint = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const SidebarItem = forwardRef<HTMLButtonElement, SidebarItemProps>(function SidebarItem(
  {
    label,
    leadingIcon,
    reserveLeadingSpace = false,
    trailingIcon,
    hoverTrailingIcon,
    selected,
    indent = 0,
    showDot,
    accentColor,
    keepTrailingVisible,
    active,
    className,
    style,
    ...props
  },
  ref,
) {
  void active;
  const accentBg = accentColor ? tint(accentColor, 14) : undefined;
  const localStyle: React.CSSProperties = {
    ...(accentColor ? { color: accentColor } : null),
    ...(accentBg ? ({ ['--ui-item-hover-bg' as never]: accentBg } as React.CSSProperties) : null),
    ...(selected && accentBg ? { background: accentBg } : null),
    ...style,
  };
  return (
    <button
      ref={ref}
      type="button"
      data-selected={selected || undefined}
      data-indent={indent}
      data-keep-trailing={keepTrailingVisible ? '' : undefined}
      data-has-hover-trailing={hoverTrailingIcon ? '' : undefined}
      className={cn('ui-reset', 'ui-sidebar-item', className)}
      style={localStyle}
      {...props}
    >
      {showDot && <span className="ui-sidebar-item-dot" />}
      {(leadingIcon || reserveLeadingSpace) && (
        <span className="ui-sidebar-item-leading" style={accentColor ? { color: accentColor } : undefined}>
          {leadingIcon}
        </span>
      )}
      <span className="ui-sidebar-item-label">{label}</span>
      {trailingIcon && (
        <span
          className="ui-sidebar-item-trailing"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {trailingIcon}
        </span>
      )}
      {hoverTrailingIcon && (
        <span
          className="ui-sidebar-item-trailing-hover"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {hoverTrailingIcon}
        </span>
      )}
    </button>
  );
});

/** A navigation group with a dedicated disclosure button and a static label. */
export function SidebarDisclosure({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const id = useId();
  return <div className="ui-sidebar-disclosure">
    <div className="ui-sidebar-disclosure-heading">
      {typeof icon === 'string' ? <Icon name={icon} size={16} /> : icon}
      <span className="ui-sidebar-disclosure-label">{label}</span>
      <button type="button" className="ui-reset ui-sidebar-disclosure-toggle" aria-label={`Toggle ${label}`}
        aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={14} />
      </button>
    </div>
    <div id={id} className="ui-sidebar-disclosure-children" hidden={!expanded}>{children}</div>
  </div>;
}
