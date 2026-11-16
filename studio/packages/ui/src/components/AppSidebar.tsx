import { useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Sidebar, SidebarItem, type SidebarProps } from './Sidebar';
import { Dropdown, type DropdownItem } from './Dropdown';
import { sidebarAssets } from './sidebarAssets';
import { Tooltip } from './Tooltip';
import { Icon } from './Icon';
import './app-sidebar.css';

export type AppSidebarEntry = { id: string; label: string; icon?: string; expandedIcon?: string; children?: AppSidebarEntry[]; groupOnly?: boolean; sectionHeader?: boolean; defaultExpanded?: boolean; actions?: ReactNode; status?: ReactNode; rowProps?: HTMLAttributes<HTMLDivElement> };
export const APP_SIDEBAR_ITEMS: AppSidebarEntry[] = [
  { id: 'asset-ai', label: 'Asset AI', icon: 'sparkles' },
  { id: 'workspaces', label: 'Workspaces', icon: 'workspaces', children: [
    { id: 'accounts', label: 'Accounts', icon: 'building' },
    { id: 'templates', label: 'Templates', icon: 'layout-template' },
    { id: 'tasks', label: 'Tasks', icon: 'list-todo' },
    { id: 'threads', label: 'Threads', icon: 'message-square' },
    { id: 'order-forms', label: 'Order forms', icon: 'receipt-text' },
  ] },
  { id: 'library', label: 'Library', icon: 'library', children: [{ id: 'slides', label: 'Slides', icon: 'presentation' }] },
  { id: 'learning', label: 'Learning', icon: 'route', children: [
    { id: 'playbooks', label: 'Playbooks', icon: 'book-open' },
    { id: 'courses', label: 'Courses', icon: 'graduation-cap' },
    { id: 'roleplay', label: 'Practice', icon: 'target' },
  ] },
  { id: 'admin', label: 'Admin', icon: 'sliders', children: [
    { id: 'reports', label: 'Reports', icon: 'chart-column' },
    { id: 'invite', label: 'Invite team', icon: 'users' },
    { id: 'settings', label: 'Settings', icon: 'sliders' },
  ] },
];
const helpItems: DropdownItem[] = [
  { id: 'help-center', leadingIcon: <Icon name="life-buoy" size={16} />, label: 'Help center' }, { id: 'product-updates', leadingIcon: <Icon name="megaphone" size={16} />, label: 'Product updates' },
  { id: 'api-docs', leadingIcon: <Icon name="code-xml" size={16} />, label: 'API documentation' }, { kind: 'separator' },
  { id: 'webinars', leadingIcon: <Icon name="video" size={16} />, label: 'Asset webinars' }, { kind: 'separator' }, { id: 'contact', leadingIcon: <Icon name="message-square" size={16} />, label: 'Contact us' },
];
const accountItems: DropdownItem[] = [{ id: 'account-settings', leadingIcon: <Icon name="settings" size={16} />, label: 'Settings' }, { kind: 'separator' }, { id: 'sign-out', leadingIcon: <Icon name="log-out" size={16} />, label: 'Log out' }];
function Asset({ name, className }: { name: string; className?: string }) {
  if (name.startsWith('logo-')) return <img className={className} src={sidebarAssets[name]} alt="" />;
  const icon = name.replace(/^icon-/, '').replace(/-16$/, '');
  const names: Record<string, string> = { 'panel-left': 'panel-left', workspaces: 'panels-top-left', building: 'building-2', 'circle-help': 'circle-help', sliders: 'sliders-horizontal' };
  return <Icon name={names[icon] ?? icon} size={16} className={className} />;
}
function MenuTrigger({ active, tooltip, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; tooltip?: string }) {
  return <Tooltip label={tooltip ?? ''} enabled={!!tooltip}><button type="button" aria-expanded={active ?? false} {...props} /></Tooltip>;
}
export type AppSidebarProps = Omit<SidebarProps, 'children' | 'width' | 'onSelect'> & {
  showHeader?: boolean;
  showFooter?: boolean;
  /** Compact actions beside the sidebar collapse control. */
  headerActions?: ReactNode;
  topContent?: ReactNode;
  beforeNavigation?: ReactNode;
  /** Extra navigation after the standard items, inside the same scroll area. */
  navigationContent?: ReactNode;
  /** Custom account footer for the host application's authenticated user. */
  footerContent?: ReactNode;
  initial?: string;
  selected?: string;
  onSelect?: (id: string) => void;
  notifications?: Record<string, number | boolean>;
  items?: AppSidebarEntry[];
  fixedItemIds?: string[];
  user?: { name: string; organization: string; initials: string };
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onAccountAction?: (id: string) => void;
  onHelpAction?: (id: string) => void;
};

/** Shared primary navigation, ported from asset-home. All app/proto consumers use this implementation. */
export function AppSidebar({ initial = 'library', selected: controlledSelected, onSelect, notifications,
  showHeader = true, showFooter = true, headerActions, topContent, beforeNavigation, navigationContent, footerContent, items = APP_SIDEBAR_ITEMS, fixedItemIds = [], user = { name: 'Example User', organization: 'Cursor', initials: 'LC' },
  collapsed: controlledCollapsed, onCollapsedChange, onAccountAction, onHelpAction, className = '', ...props }: AppSidebarProps) {
  const [localSelected, setLocalSelected] = useState(initial);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [closed, setClosed] = useState<Set<string>>(() => new Set(items.filter(item => item.defaultExpanded === false).map(item => item.id)));
  const dragExpandTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(dragExpandTimer.current), []);
  const prefix = useId();
  const selected = controlledSelected ?? localSelected;
  const collapsed = controlledCollapsed ?? localCollapsed;
  const navigationRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const updateOverflow = () => { navigation.toggleAttribute('data-overflow-bottom', navigation.scrollHeight - navigation.clientHeight - navigation.scrollTop > 1); navigation.parentElement?.toggleAttribute('data-scroll-top', navigation.scrollTop > 1); navigation.parentElement?.toggleAttribute('data-scroll-bottom', navigation.scrollHeight - navigation.clientHeight - navigation.scrollTop > 1); };
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(navigation);
    for (const child of navigation.children) observer.observe(child);
    navigation.addEventListener('scroll', updateOverflow, { passive: true });
    updateOverflow();
    return () => { observer.disconnect(); navigation.removeEventListener('scroll', updateOverflow); };
  }, [items, beforeNavigation, navigationContent, closed, collapsed]);
  const select = (id: string) => { setLocalSelected(id); onSelect?.(id); };
  const toggle = () => { setLocalCollapsed(!collapsed); onCollapsedChange?.(!collapsed); };
  const toggleGroup = (id: string) => setClosed(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const hasUnread = (id: string) => {
    const value = notifications?.[id];
    return typeof value === 'number' ? value > 0 : value === true;
  };
  const row = (item: AppSidebarEntry, child = false) => {
    if (item.sectionHeader && !collapsed) return <h3 className="ui-app-nav-section-title"><button type="button" aria-expanded={!closed.has(item.id)} aria-controls={`${prefix}-${item.id}`} onClick={() => toggleGroup(item.id)}><span>{item.label}</span><Asset className="ui-app-nav-section-chevron" name="icon-chevron-down-16" /></button></h3>;
    const unread = hasUnread(item.id) || ((collapsed || closed.has(item.id)) && item.children?.some(child => hasUnread(child.id)));
    return <Tooltip label={item.label} enabled={collapsed}><SidebarItem
    className={`ui-app-nav-row${child ? ' ui-app-nav-child' : ''}`} selected={selected === item.id || (collapsed && !!item.children?.some(child => child.id === selected))}
    aria-current={selected === item.id ? 'page' : undefined} aria-label={item.label}
    aria-description={unread ? 'Unread activity' : undefined}
    aria-expanded={item.groupOnly ? !closed.has(item.id) : undefined}
    onClick={() => {
      if (!item.groupOnly) { select(item.id); return; }
      if (collapsed) {
        setLocalCollapsed(false); onCollapsedChange?.(false);
        setClosed(previous => { const next = new Set(previous); next.delete(item.id); return next; });
      } else toggleGroup(item.id);
    }} label={item.label} trailingIcon={!collapsed ? item.status : undefined} keepTrailingVisible={!!item.status}
    leadingIcon={item.icon ? <span className="ui-app-nav-icon"><Asset name={`icon-${item.expandedIcon && !closed.has(item.id) ? item.expandedIcon : item.icon}-16`} />{unread ? <i className="ui-app-notification" aria-hidden="true" /> : null}</span> : undefined} /></Tooltip>;
  };
  function renderEntry(item: AppSidebarEntry, child = false): ReactNode {
    return <div key={item.id} data-section={item.sectionHeader && !collapsed ? '' : undefined} className={item.children ? 'ui-app-nav-group' : item.actions ? 'ui-app-nav-action-row' : undefined}>
      <div {...item.rowProps} className={`ui-app-nav-parent ${item.rowProps?.className || ''}`}
        onDragEnter={event => {
          item.rowProps?.onDragEnter?.(event);
          if (event.defaultPrevented && item.children && (closed.has(item.id) || collapsed)) {
            clearTimeout(dragExpandTimer.current);
            dragExpandTimer.current = setTimeout(() => {
              setClosed(previous => { const next = new Set(previous); next.delete(item.id); return next; });
              if (collapsed) { setLocalCollapsed(false); onCollapsedChange?.(false); }
            }, 550);
          }
        }} onDragLeave={event => { item.rowProps?.onDragLeave?.(event); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) clearTimeout(dragExpandTimer.current); }}
        onDrop={event => { clearTimeout(dragExpandTimer.current); item.rowProps?.onDrop?.(event); }}
        >{row(item, child)}
        {item.children && !collapsed && !item.sectionHeader && <button type="button" className="ui-app-nav-caret" aria-label={`Toggle ${item.label}`} aria-expanded={!closed.has(item.id)} aria-controls={`${prefix}-${item.id}`} onClick={() => toggleGroup(item.id)}><Asset name="icon-chevron-down-16" /></button>}
        {item.actions && <div className="ui-app-nav-item-actions">{item.actions}</div>}
      </div>
      {item.children && <div id={`${prefix}-${item.id}`} className="ui-app-nav-children" hidden={collapsed || closed.has(item.id)}>{item.children.map(entry => renderEntry(entry, true))}</div>}
    </div>;
  }
  return <Sidebar {...props} width={collapsed ? 64 : 'var(--ui-app-sidebar-w)'} bordered className={`ui-app-sidebar ${className}`} data-collapsed={collapsed || undefined} data-scroll-separators={fixedItemIds.length ? '' : undefined}>
    {showHeader && <header className="ui-app-sidebar-header">
      {collapsed ? <Tooltip label="Open sidebar"><button type="button" className="ui-app-sidebar-expand" aria-label="Open sidebar" aria-expanded={false} onClick={toggle}>
        <Asset name="logo-asset-mark" className="ui-app-logo-mark" /><Asset name="icon-panel-left-16" className="ui-app-logo-open" />
      </button></Tooltip> : <button type="button" className="ui-app-logo" aria-label="Asset home" onClick={() => select(items[0]?.id ?? 'asset-ai')}><Asset name="logo-asset-full" /></button>}
      {(!collapsed || headerActions) && <div className="ui-app-sidebar-header-actions">
        {headerActions}
        {!collapsed && <Tooltip label="Collapse sidebar"><button type="button" className="ui-app-sidebar-toggle" aria-label="Close sidebar" aria-expanded onClick={toggle}><Asset name="icon-panel-left-16" /></button></Tooltip>}
      </div>}
    </header>}
    {topContent}
    {!!fixedItemIds.length && <div className="ui-app-sidebar-fixed">{items.filter(item => fixedItemIds.includes(item.id)).map(item => renderEntry(item))}</div>}
    <nav ref={navigationRef} className="ui-app-sidebar-nav" aria-label="Main navigation">
      {beforeNavigation}
      {items.some(item => item.sectionHeader) || fixedItemIds.length ? items.filter(item => !fixedItemIds.includes(item.id)).map(item => renderEntry(item)) : items.map(item => <div key={item.id} className={item.children ? 'ui-app-nav-group' : undefined}>
        <div className="ui-app-nav-parent">{row(item)}
          {item.children && !collapsed && <button type="button" className="ui-app-nav-caret" aria-label={`Toggle ${item.label}`}
            aria-expanded={!closed.has(item.id)} aria-controls={`${prefix}-${item.id}`}
            onClick={() => toggleGroup(item.id)}>
            <Asset name="icon-chevron-down-16" />
          </button>}
        </div>
        {item.children && <div id={`${prefix}-${item.id}`} className="ui-app-nav-children" hidden={collapsed || closed.has(item.id)}>{item.children.map(child => <div key={child.id} className={child.actions ? 'ui-app-nav-action-row' : undefined}>{row(child, true)}{child.actions && <div className="ui-app-nav-item-actions">{child.actions}</div>}</div>)}</div>}
      </div>)}
      {navigationContent}
    </nav>
    {footerContent ?? (showFooter && <footer className="ui-app-sidebar-footer">
      <div className="ui-app-user-menu"><Dropdown fit={false} width={240} placement="top" align="start" items={accountItems} onChange={id => { if (id) onAccountAction?.(id); }}
        trigger={<MenuTrigger className="ui-app-user-button" aria-label="Account menu" tooltip={collapsed ? user.name : undefined}>
          <span className="ui-app-avatar">{user.initials}</span><span className="ui-app-user"><span className="ui-app-user-name">{user.name}</span><span className="ui-app-user-sub">{user.organization}</span></span>
        </MenuTrigger>} /></div>
      <div className="ui-app-help-menu"><Dropdown fit={false} width={240} placement="top" align={collapsed ? 'start' : 'end'} items={helpItems} onChange={id => { if (id) onHelpAction?.(id); }}
        trigger={<MenuTrigger className="ui-app-sidebar-toggle" aria-label="Help" tooltip="Help"><Asset name="icon-circle-help-16" /></MenuTrigger>} /></div>
    </footer>)}
  </Sidebar>;
}
