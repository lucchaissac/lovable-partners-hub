export { CommandMenu } from './components/CommandMenu';
export type { CommandMenuProps, CommandMenuItem } from './components/CommandMenu';
export { Assety } from './components/Assety';
export type { AssetyProps, AssetyVariant } from './components/Assety';
export { Icon, ICON_NAMES } from './components/Icon';
export type { IconProps } from './components/Icon';
import './tokens.css';

export { AppSidebar, APP_SIDEBAR_ITEMS } from './components/AppSidebar';
export type { AppSidebarProps, AppSidebarEntry } from './components/AppSidebar';

// Sidebar
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarSection,
  SidebarSectionHeader,
  SidebarDisclosure,
  SidebarItem,
  useSidebarTone,
} from './components/Sidebar';
export type {
  SidebarProps,
  SidebarContentProps,
  SidebarFooterProps,
  SidebarSectionProps,
  SidebarSectionHeaderProps,
  SidebarItemProps,
  SidebarTone,
} from './components/Sidebar';

// Button
export { Button, ButtonGroup } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize, ButtonGroupProps } from './components/Button';

// PageHeader
export { PageHeader } from './components/PageHeader';
export type { PageHeaderProps } from './components/PageHeader';

// Tabs
export {
  Tabs,
  TabsList,
  TabsItem,
  TabsVisibilityToggle,
  TabsTrigger,
  TabsTriggerIcon,
  TabsTriggerClose,
  TabsTriggerHandle,
  TabsAdd,
  SimpleTabs,
} from './components/Tabs';
export type {
  TabsProps,
  TabsVariant,
  TabsListProps,
  TabsVisibilityToggleProps,
  TabsTriggerProps,
  TabsTriggerCloseProps,
  TabsTriggerHandleProps,
  TabsAddProps,
  SimpleTabsProps,
  TabItem,
} from './components/Tabs';

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  Checkbox,
  useTableSelection,
  SimpleTable,
  TableRowActions,
  TableColumnHeader,
  RowActions,
  EditableTextCell,
  EditableSelectCell,
  TABLE_SELECT_COL_WIDTH,
} from './components/Table';
export type {
  TableProps,
  TableRowProps,
  TableCellProps,
  TableHeadProps,
  TableCaptionProps,
  TableRowActionsProps,
  CheckboxProps,
  CheckboxState,
  CheckboxShape,
  UseTableSelectionOptions,
  UseTableSelection,
  SimpleTableProps,
  SimpleTableColumn,
  TableColumn,
  TableColumnHeaderProps,
  RowAction,
  RowActionsProps,
  EditableTextCellProps,
  EditableSelectCellProps,
} from './components/Table';

// Avatar
export { Avatar } from './components/Avatar';
export type { AvatarProps, AvatarSize, AvatarTone } from './components/Avatar';

// AvatarGroup
export { AvatarGroup } from './components/AvatarGroup';
export type { AvatarGroupProps } from './components/AvatarGroup';

// SegmentedControl
export { SegmentedControl } from './components/SegmentedControl';
export type {
  SegmentedControlProps,
  SegmentedControlItem,
  SegmentedControlSize,
} from './components/SegmentedControl';

// FilterChip
export { FilterChip } from './components/FilterChip';
export type { FilterChipProps, FilterChipSize } from './components/FilterChip';

// StatCard
export { StatCard } from './components/StatCard';
export type { StatCardProps, StatCardTrend } from './components/StatCard';

// Toolbar
export { Toolbar } from './components/Toolbar';
export type { ToolbarProps } from './components/Toolbar';

// EmptyState
export { EmptyState } from './components/EmptyState';
export type { EmptyStateProps, EmptyStateSize } from './components/EmptyState';

// Panel
export {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelTitleBlock,
  PanelBody,
  PanelFooter,
  PanelField,
  PanelSection,
  PanelInlineActions,
  PanelMedia,
  PanelStatGrid,
  PanelActivityList,
  PanelActivityItem,
  PanelEmptyBlock,
  PanelNavCounter,
} from './components/Panel';
export type {
  PanelProps,
  PanelHeaderProps,
  PanelTitleProps,
  PanelTitleBlockProps,
  PanelBodyProps,
  PanelFooterProps,
  PanelFieldProps,
  PanelSectionProps,
  PanelInlineActionsProps,
  PanelMediaProps,
  PanelStatGridProps,
  PanelActivityListProps,
  PanelActivityItemProps,
  PanelEmptyBlockProps,
  PanelNavCounterProps,
} from './components/Panel';

// Dialog
export {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from './components/Dialog';
export type {
  DialogProps,
  DialogSize,
  DialogHeaderProps,
  DialogTitleProps,
  DialogDescriptionProps,
  DialogBodyProps,
  DialogFooterProps,
} from './components/Dialog';

// Card
export {
  Card,
  CardMedia,
  CardBody,
  CardTitle,
  CardDescription,
  CardMeta,
  CardFooter,
  CardActions,
  CardOverlay,
  CardBadge,
} from './components/Card';
export type {
  CardProps,
  CardVariant,
  CardDirection,
  CardMediaProps,
  CardBodyProps,
  CardTitleProps,
  CardDescriptionProps,
  CardMetaProps,
  CardMetaItem,
  CardFooterProps,
  CardActionsProps,
  CardOverlayProps,
  CardBadgeProps,
  CardBadgePlacement,
} from './components/Card';

// Form composition primitives
export { FormStack, FormField, FormRow } from './components/Form';
export type { FormStackProps, FormFieldProps, FormRowProps } from './components/Form';

// TriggerField — input-styled dropdown trigger
export { TriggerField } from './components/TriggerField';
export type { TriggerFieldProps, TriggerFieldSize } from './components/TriggerField';

// Divider
export { Divider } from './components/Divider';
export type { DividerProps } from './components/Divider';

// Pagination
export {
  Pagination,
  PaginationContent,
  PaginationFirst,
  PaginationPrevious,
  PaginationNext,
  PaginationLast,
  SimplePagination,
} from './components/Pagination';
export type {
  SimplePaginationProps,
  PaginationProps,
  PaginationPrevProps,
} from './components/Pagination';

// Dropdown
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSearch,
  DropdownMenuList,
  DropdownMenuPinned,
  DropdownMenuItemIcon,
  DropdownMenuItemAvatar,
  DropdownMenuItemLabel,
  DropdownMenuItemShortcut,
  Dropdown,
} from './components/Dropdown';
export type {
  DropdownMenuProps,
  DropdownMenuTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuCheckboxItemProps,
  DropdownMenuSearchProps,
  DropdownMenuListProps,
  DropdownProps,
  DropdownItem,
} from './components/Dropdown';

// Switch
export { Switch } from './components/Switch';
export type { SwitchProps, SwitchSize } from './components/Switch';

// Picker
export { Picker } from './components/Picker';
export type {
  PickerProps,
  PickerItem,
  PickerColumn,
  PickerFooter,
} from './components/Picker';

// ColorPicker
export {
  ColorPicker,
  ColorPickerPaletteProvider,
  ColorPickerDialog,
  ColorSwatch,
} from './components/ColorPicker';
export type {
  ColorPickerProps,
  ColorPickerPalette,
  ColorPickerDialogProps,
  ColorSwatchProps,
} from './components/ColorPicker';

// IconPicker
export { IconPicker, IconPickerSwatch } from './components/IconPicker';
export type {
  IconPickerProps,
  IconPickerSwatchProps,
  IconPickerValue,
} from './components/IconPicker';

// Radio
export { Radio, RadioGroup } from './components/Radio';
export type { RadioProps, RadioGroupProps } from './components/Radio';

// Badge
export { Badge } from './components/Badge';
export type { BadgeProps, BadgeTone, BadgeVariant, BadgeSize } from './components/Badge';

// Input + Textarea
export { Input, SearchInput, Textarea } from './components/Input';
export type {
  InputProps,
  InputSize,
  SearchInputProps,
  SearchInputVariant,
  TextareaProps,
} from './components/Input';

// Message
export { Message } from './components/Message';
export type { MessageProps, MessageRole } from './components/Message';
export { MessageActions } from './components/MessageActions';
export type { MessageActionsProps } from './components/MessageActions';

// Composer
export { Composer, ComposerSelection, ComposerSuggestion } from './components/Composer';
export type { ComposerProps } from './components/Composer';

// TypingIndicator
export { TypingIndicator } from './components/TypingIndicator';
export type { TypingIndicatorProps } from './components/TypingIndicator';

// Agent blocks
export { TodoBlock } from './components/agent/TodoBlock';
export type { TodoBlockProps, TodoBlockItem } from './components/agent/TodoBlock';
export { ToolCallBlock } from './components/agent/ToolCallBlock';
export type { ToolCallBlockProps } from './components/agent/ToolCallBlock';
export { RecapBlock } from './components/agent/RecapBlock';
export type { RecapBlockProps } from './components/agent/RecapBlock';
export { SourcesBlock } from './components/agent/SourcesBlock';
export type { SourcesBlockProps, SourceItem } from './components/agent/SourcesBlock';
export { ReasoningBlock } from './components/agent/ReasoningBlock';
export type {
  ReasoningBlockProps,
  ReasoningBlockStatus,
} from './components/agent/ReasoningBlock';
export { AttachmentChip } from './components/agent/AttachmentChip';
export type { AttachmentChipProps } from './components/agent/AttachmentChip';
export { PlanBlock } from './components/agent/PlanBlock';
export type {
  PlanBlockProps,
  PlanBlockItem,
  PlanBlockTag,
} from './components/agent/PlanBlock';

// cn helper
export { cn } from './lib/cn';

// Theme
export { fonts, spacing } from './theme';
export type { SpacingToken } from './theme';

export { ChatBoxTray } from './components/ChatBoxTray';
export type { ChatBoxTrayProps } from './components/ChatBoxTray';

export { Tooltip, TooltipBubble } from './components/Tooltip';
export type { TooltipProps } from './components/Tooltip';

export { PreviewLabel } from './components/PreviewLabel';

export { PageFrame } from './components/PageFrame';
export type { PageFrameProps } from './components/PageFrame';
