# Lovable brand hub

A complete, editable brand application for Lovable, Partners, Community and Tech blog. The interface, handoff documentation and default assistant language are US English.

## Start here

Use Node.js 22.13 or later and npm. The dependency lockfile is included.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Galleries, guidelines, the native canvas editor, local drafts, uploads and exports work without a model service. AI tools show an unavailable state until a host service is connected. Deterministic template shortcuts and manual editing remain available.

```sh
npm run build
npm test
npm run preview
```

The production build is in `dist/`. `preview` serves the static application only. To serve the build and included API handlers together, use `npm start`. Set `HOST=0.0.0.0` when required by your hosting environment; `PORT` defaults to 3000. The production model handlers also require `APP_PUBLIC_ORIGIN` to match the application's public origin.

## Import and continue in Lovable

1. Put the files from this archive at the root of the receiving project, retaining `public/`, `studio/`, `shared/` and `server/`.
2. Read `LOVABLE_IMPORT_PROMPT.md`, the root `AGENTS.md`, `docs/AGENTS.md` and `docs/INTEGRATION.md` before changing code.
3. Verify the existing application with the commands above. Keep its Vite multi-page setup and the studio entry point at `/studio/index.html`.
4. Connect the receiving project's AI service using the single server-side gateway contract. Keep the existing prompts, schemas, native compilers and post-generation validators.
5. Use the host's own access control, request limits and deployment settings. The package includes no configured model account, external billing state, machine login, deployment binding or private conversations.

This is a source handoff, not a claim that a hosting platform automatically imports ZIP files. If the receiving workflow uses a repository, commit these contents to that project's repository first.

## Application map

| Workspace | Gallery | Guidelines | Fresh editor |
| --- | --- | --- | --- |
| Lovable | `/#brand/gallery` | `/#brand/guidelines` | `/#brand/create/collaboration` |
| Partners | `/#gallery` | `/#guidelines` | `/#create/grow-your-business` |
| Community | `/#ambassadors/gallery` | `/#ambassadors/guidelines` | `/#ambassadors/create` |
| Tech blog | `/#tech-blog/gallery` | `/#tech-blog/guidelines` | `/#tech-blog/create` |

The build also emits `/brand/index.html`, `/partners/index.html`, `/community/index.html` and `/tech-blog/index.html`. Configure corresponding directory routes on your static host. Preserve direct links and the embedded editor's same-origin relationship with the hub.

| Location | Purpose |
| --- | --- |
| `src/` | Hub navigation, galleries, guidelines and embedded studio shell |
| `studio/` | React editor, native layers, collections, inspector, animation and exports |
| `shared/` | Schemas, editable template geometry, brand rules, compilers and validators |
| `server/` | Agent prompts, reference loading, provider-neutral gateway and optional import services |
| `api/` | Same-origin Node request handlers for model features and logo import |
| `public/` | Original vectors, bundled fonts, optimized media, source artwork and licenses |
| `design/` | Brand source references and specifications |
| `tests/` | Portable application and integration regression tests |

## Important behavior

Drafts and workspace state are browser-local. There is no configured account system or cloud database. Editable-source imports and exports retain native layers. Public collection loading remains supported, with an empty initial collection index. Private demo campaigns and scripted conversations are intentionally absent.

Screenshot reconstruction and public HTML import retain their development-only interface gates. HTML import requires an unsigned-in Chrome installation and the included local renderer; it is not available on a static host. Hosted support for these optional tools requires an explicit implementation decision. The model gateway does not fetch arbitrary sites or execute generated code.

Keep original artwork, proportions, brand identity and licensed asset notices intact. Place names, brand names and supplied source content may retain their original spelling. Do not translate embedded original artwork or alter a user's existing canvas during unrelated edits.

See `docs/VERIFICATION.md` for the checks performed on this handoff.
