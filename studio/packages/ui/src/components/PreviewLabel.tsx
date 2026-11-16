/** Quiet release-status label aligned like a superscript beside a title. */
export function PreviewLabel({ label = 'Preview' }: { label?: string }) { return <span className="ui-preview-label">{label}</span>; }
