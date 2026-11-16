import { Button } from './Button';
import { Dropdown, type DropdownItem } from './Dropdown';
import { Icon } from './Icon';

export type ChatBoxTrayProps = {
  onBrowseAgents: () => void;
  actions: DropdownItem[];
  onAction: (id: string) => void;
};
/** Recessed utility tray shared by chat-box previews and the Asset AI home. */
export function ChatBoxTray({ onBrowseAgents, actions, onAction }: ChatBoxTrayProps) {
  return <div className="ui-chat-box-tray" aria-label="Chat quick actions">
    <Button variant="ghost" leadingIcon={<Icon name="store" size={14} />} onClick={onBrowseAgents}>Browse agents</Button>
    <Dropdown items={actions} onChange={onAction} placement="top" align="end" fit={false} width={240}
      trigger={<Button variant="ghost" leadingIcon={<Icon name="zap" size={14} />}>Quick actions</Button>} />
  </div>;
}
