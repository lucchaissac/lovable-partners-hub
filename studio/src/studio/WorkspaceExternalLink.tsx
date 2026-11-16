import { useContext, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { WorkspaceEditingContext } from './WorkspaceAssets';
import { workspaceLinkSchema } from './workspaceWidgets';

/** Sandboxed workspace chats open links through their existing host bridge. */
export function WorkspaceExternalLink({ href, onClick, onAuxClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { openLink } = useContext(WorkspaceEditingContext);
  const follow = (event: MouseEvent<HTMLAnchorElement>, callback?: typeof onClick) => {
    callback?.(event);
    if (event.defaultPrevented || !openLink || ![0, 1].includes(event.button)) return;
    event.preventDefault();
    const link = workspaceLinkSchema.safeParse(href);
    if (link.success) openLink(link.data);
  };
  return <a {...props} href={href} target="_blank" rel="noopener noreferrer" onClick={event => follow(event, onClick)} onAuxClick={event => follow(event, onAuxClick)} />;
}
