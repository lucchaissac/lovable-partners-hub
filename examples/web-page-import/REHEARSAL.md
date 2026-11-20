# Public HTML import rehearsal

Local Lovable Make V1, November 20, 2026.

The existing Image → Import from URL action accepts a public webpage, including a bare domain. It reads the rendered DOM in a fresh unsigned-in Chrome renderer and creates separate native text, shapes and image layers. It uses no model call for extraction and never inserts a screenshot of the whole page as the component. The screenshot retained in the editable source is a reference only.

Camera Plain is applied with measured text fitting, retaining explicit source wraps and line pitch. The component remains grouped for proportional scaling, local chat edits and per-element animation. Reimport replaces only the previous imported component, preserving other artwork, canvas dimensions, document identity and the existing camera animation when present. File imports retain the earlier screenshot reconstruction and ordinary-image toggle.

## Verification

- Actual URL imports succeeded on the public Lovable brand page and on https://www.mozilla.org/. The final Mozilla demonstration contains 17 native elements (text, image and shape layers), including its original logo, with no missing-artwork warning. The original two Lovable artwork layers, 1200 × 800 dimensions, document ID and component-camera motion remain intact.
- Cancelling a slow import returned immediately to the unchanged canvas.
- 231 automated checks passed, including origin validation, private-address rejection before browser launch, HTTP/HTTPS proxy rejection of private targets, timeout recovery, native geometry, grouped scaling, editable-source roundtrip and unrelated-layer/motion preservation.
- Production build passed; no page-import route or Chromium renderer is included in the emitted browser bundle.
- Dark dropdowns and floating toolbars were visually checked and their computed shadow confirmed: a 0.5 px white-at-20% ring plus a soft shadow. The rule does not apply to light appearance. See verified-menu.jpg and verified-toolbar.jpg.

## Limits

The V1 captures the first 1440 × 900 viewport, up to 240 elements. Source website interactions and scripts are not exported. Complex animated, embedded or WebGL content may be omitted; inaccessible artwork produces a warning. Public websites can still block automated reads: lovable.dev currently presents an access check, reported as an error. Do not use a signed-in app session to work around that restriction. The public Linear homepage returned a partial intro, so it is not the selected demonstration.

HTML import stays disabled in the hosted build; no public demonstration link was created. The prepared screenshot example remains separate.

`verified.asset.json` is the final editable-source export from the actual UI, with conversation data omitted. Its screenshot is retained only as a reference; no native layer uses the page screenshot. Text cut by the viewport edge is omitted rather than overflowing the imported group.
