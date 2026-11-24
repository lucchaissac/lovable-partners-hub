# Handoff verification

The portable source package was checked independently of the original application configuration.

- A clean `npm ci` completed using the included dependency lockfile.
- `npm run build` passed, including TypeScript checking and both Vite entry points. The dependency bundler reports nonblocking `use client` directive notices.
- The portable regression suite and 12 gateway integration checks passed. Tests cover native editing, selection, transforms, collections, typography, animation behavior, branded templates, source validation, isolated imports and the new provider boundary.
- All four galleries and all four editor starters opened in Chrome without page errors or failed resource responses. The document language is `en-US`.
- Desktop and narrow-width views were inspected. The original artwork, geometry, Camera Plain and light/dark appearance remain intact.
- A renamed native draft persisted through reload. Editable-source export and a 1200 × 675 PNG export succeeded.
- The integration boundary was exercised with simulated gateway responses: original reference images, structured plans, brand validation, native template geometry, selected/locked motion scope, targeted screen edits, transparent image assets, disabled configuration, origin checks and bounded requests.
- Model service errors do not expose upstream response bodies. Unconfigured AI tools do not send model requests.

No real model account was used for verification. The receiving host still needs to connect and test its own gateway. Hosted screenshot and HTML imports are not enabled by this handoff.

`docs/SOURCE_MANIFEST.json` records each distributed source file's SHA-256 digest. The final archive was also checked for integrity, excluded folders, private runtime references and credential values. The adjacent `.zip.sha256` file can be used to verify the downloaded archive.
