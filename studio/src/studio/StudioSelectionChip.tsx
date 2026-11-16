import { Button, Icon, Tooltip } from '@asset/ui';

export function StudioSelectionChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <div className="studio-selection-context">
    <div className="studio-selection-chip">
      <Icon name="square" size={12} />
      <Tooltip label={label} onlyWhenTruncated side="top" maxWidth={360}>
        <span className="studio-selection-chip-label" tabIndex={0}>{label}</span>
      </Tooltip>
      <Tooltip label="Remove selection" side="top">
        <Button className="studio-selection-chip-remove" variant="ghost" size="sm" aria-label="Remove selection" leadingIcon={<Icon name="x" size={12} />} onClick={onRemove} />
      </Tooltip>
    </div>
  </div>;
}
