import {MakerDesignModes,useMakerDesign} from '../assets-tool/MakerDesignContext';
import { Button, Icon, Tooltip } from '@asset/ui';

/** Canvas and selection inspectors share one title and close-control geometry. */
export function DesignPanelHeader({ title, onClose, closeLabel = 'Close design', locked = false, className = '' }: {
  title: string; onClose: () => void; closeLabel?: string; locked?: boolean; className?: string;
}) {
  const maker=useMakerDesign();
  return <header className={`we-panel-header ${className}`}>
    {maker?<MakerDesignModes/>:<span className="hcs-design-design-title">
      <Tooltip label={title} onlyWhenTruncated><strong tabIndex={0}>{title}</strong></Tooltip>
      {locked && <Icon name="lock" size={14}/>}
    </span>}
    <Tooltip label={closeLabel} side="bottom">
      <Button variant="ghost" aria-label={closeLabel} leadingIcon={<Icon name="panel-right-close" size={16}/>} onClick={onClose}/>
    </Tooltip>
  </header>;
}
