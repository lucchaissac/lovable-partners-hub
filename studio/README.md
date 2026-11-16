# Lovable design studio

The “Make your own” tab adapts the supplied Asset Studio editor. It runs in an isolated document at `/studio/index.html`, keeping its React components and styles separate from the hub’s guidelines and badge library.

Run `npm install`, `npm run dev` or `npm run build` from the repository root. The build type-checks the editor and emits both the hub and studio entry points. No separate server or environment variables are required.

The library dropdown inside the editor reuses the eight current partner badges. The editor includes editable text, shapes, Lucide icons images and videos, selection and Design controls, canvas formats, zoom, undo/redo, image/video import (up to 25 MB per video), and `.png`/`.asset.json` export. Camera Plain is embedded in image exports. Video files are embedded in the editable source; PNG exports contain a still frame. The starting composition reuses the gallery’s “Grow your business” artwork as independent editable elements. Designs save locally in the `lovable-partner-designs` IndexedDB database and reopen when returning to the tab.

The chat layout is present but explicitly unavailable in this visual integration. No AI service is configured, no AI requests are sent, and no simulated responses are produced.

The original reusable components live in `packages/ui` and `src/studio`. `src/lovable.css` supplies the hub’s light and dark tokens and removes borders around the workspace panels. `src/assets-tool/starter.ts` contains the editable Lovable starting design.

Verified in the embedded browser at desktop and narrow widths: library search and badge insertion; local video upload, playback, pause and persistence after reload; PNG export with the video poster and editable-source download; title hover, search focus, header blur, and Design collapse/reopen. The frame stays hidden behind a shell in the active theme until React has painted. The shared theme toggle persists the selected appearance and updates the studio without reloading its canvas. Light mode uses #f7f4ed with black foregrounds. The Chat composer is visual only and remains disabled until an AI service is connected.
