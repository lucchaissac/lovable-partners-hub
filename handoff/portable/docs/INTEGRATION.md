# Connect the receiving host

The application runs without an AI provider. There is one server-side model boundary: `server/modelGateway.mjs`. Implement its contract using the receiving host's model service, or replace its two exported call functions with a host-native implementation while preserving their behavior. No browser-side model credential is required.

## Configuration

Copy `.env.example` to `.env.local` for local use. Only the server reads these settings. Never prefix a secret with `VITE_`.

| Variable | Meaning |
| --- | --- |
| `MODEL_GATEWAY_URL` | Absolute HTTPS URL of the receiving host's gateway; loopback HTTP is allowed for development |
| `MODEL_GATEWAY_TOKEN` | Optional receiving-host authentication token, sent only from server to gateway |
| `APP_PUBLIC_ORIGIN` | Exact production application origin; used for same-origin checks and optional absolute share metadata |
| `COMMUNITY_PLAN_MODE` | `template` by default; `freeform` retains the native freeform planner |
| `PORT`, `HOST` | Optional portable Node server listening settings |

`GET` on the three model API routes reports whether a gateway is configured. It does not claim the remote gateway is healthy. An unavailable route leaves manual editing enabled. Use a real successful request to verify your connection.

`npm run dev` loads server settings through Vite. The included `npm start` reads `.env.local` and serves `dist/` plus the three model handlers and partner-logo import. `npm run preview` is static only. To embed absolute social URLs, also set `APP_PUBLIC_ORIGIN` in the process environment when building; otherwise metadata uses relative paths.

## Structured model contract

The server sends an HTTP POST with JSON and, when configured, `Authorization: Bearer <host token>`. This is a contract to implement, not a direct URL for an arbitrary model vendor API.

```json
{
  "version": 1,
  "task": "brand-review",
  "locale": "en-US",
  "instructions": "The complete original agent instructions...",
  "schema": { "type": "object" },
  "payload": { "prompt": "The user request and validated source context..." },
  "images": [
    { "role": "User source", "sourceId": "source-1", "data": "data:image/png;base64,..." }
  ]
}
```

Supported structured tasks are `community-template`, `community-freeform`, `brand-review`, `studio-animation` and `screen-import`. The actual schema is supplied with every request; never use the abbreviated example above as the production schema. Submit `instructions` as privileged model instructions, `payload` as untrusted user data, and every labeled image as a real multimodal input. Return parsed JSON:

```json
{ "plan": { "...": "Fields matching the supplied schema exactly" } }
```

The application validates the plan before applying it. A rejected plan may trigger one retry containing `payload.correctionFeedback` and `payload.rejectedPlan`. Do not discard reference images on that retry. Animation follow-ups use a revision schema keyed by existing asset IDs; the gateway must not substitute the creation schema.

The browser-facing response shapes are unchanged: Community returns `{templatePlan, plan, media}` or `{plan}` in freeform mode; brand review and motion return `{plan}`. Plain JSON is supported by the existing client. This handoff uses final JSON responses; staged layout streaming is a future host extension, not an enabled feature.

## Image service contract

Image generation and editing are separate from structured planning. A `task: "image"` request includes `operation` (`generate` or `edit`), `prompt`, `background` (`transparent` or `opaque`), `width`, `height`, and an optional `source` data URL. Return:

```json
{ "image": "data:image/webp;base64,..." }
```

PNG, JPEG and WebP are accepted. Preserve alpha when transparency is requested. The host creates only the requested separate visual; the editor retains native typography and original logos. The application bounds, validates and compresses the returned image. Glyph isolation is deterministic local image processing and does not call a model. If image generation is unsupported, return an error rather than substituting unrelated artwork.

## Hosting requirements

Keep same-origin `/api/` paths or provide a same-origin proxy. Preserve the JSON content type and existing `X-Lovable-Local: 1` compatibility header. That header is not authentication. Production handlers check `APP_PUBLIC_ORIGIN`; the receiving host must additionally enforce its own user authorization, rate limits and usage policy. This package does not include an account system.

The server requires Node.js with filesystem access to bundled `public/` references and the native `sharp` dependency. If the receiving host uses edge functions, port reference loading and image processing to compatible services; do not simply rename the Node files. Deploy static assets and original font files at the existing root-relative paths.

Respect request limits: Community 3.5 MB, brand review 6 MB, motion 500 KB, screenshot reconstruction 4.5 MB and logo lookup 4 KB. Gateway responses are bounded to 12 MB. Requests time out and cancel when the browser disconnects. Public network imports preserve existing destination validation and never use a signed-in browser profile.

The optional screenshot and HTML import controls remain development-only. HTML import requires local Chrome. A production implementation needs equivalent renderer isolation, network restrictions and explicit capability gating; it is not provided by the model gateway alone.
