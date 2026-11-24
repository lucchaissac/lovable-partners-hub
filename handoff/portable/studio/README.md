# Lovable design studio

The native React editor is embedded at `/studio/index.html`. Run commands from the project root. See `../README.md` for setup and `../docs/INTEGRATION.md` for the server-side model contract.

The editor supports editable text, shapes, lines, original brand artwork, partner badges, Lucide icons, images and videos; selections, groups, transforms, native animation, undo, collections, local persistence and export. Each workspace keeps separate drafts and templates. Original font files are bundled for preview and export.

The hub communicates with the editor through the existing same-origin frame integration. Preserve document IDs, independent layer editing, source round trips, authored colors, reduced-motion behavior, theme persistence and layout readiness before revealing the canvas.

Manual editing requires no backend AI service. Optional AI features use the receiving host's configured gateway with the preserved prompts and validation schemas. Development-only screenshot and HTML import controls remain gated as described in the integration guide.
