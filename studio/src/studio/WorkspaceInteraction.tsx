import { createContext, useContext } from 'react';

/** The inner HTML editor owns selection; generated content only consumes it. */
export const WorkspaceInteractionContext = createContext<{
  pointer: boolean;
  selected?: Element;
  hovered?: Element;
  clear: () => void;
}>({ pointer: false, clear: () => {} });

export function useWorkspaceInteraction() { return useContext(WorkspaceInteractionContext); }
