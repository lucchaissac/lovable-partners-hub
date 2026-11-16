# Gallery partner profile

Reference: Luc's partner listing screenshot. Stageshow's static-card informed the hierarchy and spacing; the specimen uses this project's native DOM, Lucide icons and shared badge generator.

Composition: one light profile with Luc's supplied Eames Institute screenshot inset over the animated gradient, the original LoCo logo, agency name and rating, then the compact Expert badge. Luc's latest correction halves it to 14–16 px high and removes every filled tile. The country is now a joined third outlined module, United above States, with exactly the same module height and visible text padding as Expert/2026. The outer padding is equal on every side and the thumbnail radius is 5–8 px. The agency name remains 15–22 px with a 2 px row gap above the badge.

Media: the supplied screenshot is preserved in full and encoded as 640/1280 px WebP variants (32/85 kB). The logo is a local 128 px WebP asset (8 kB). The existing optimized gradient loop plays behind the website screenshot with equal padding on all four sides, using the shared visibility-aware playback controller.

Verified in the browser at 320, 390 and 2560 CSS pixels: complete name and badge, aligned metadata, equal outer insets, both image assets loaded, video playing behind the inset screenshot, no horizontal overflow. The mobile composition brings this example first. Desktop and mobile screenshots were captured.

Not rechecked in this iteration: the unchanged reduced-motion and save-data branches, or Safari and Firefox. Stageshow's React-specific film gate was not used for this native DOM specimen; verification used the actual app in the browser.

## Four additional gallery compositions

Figma 4:143 (Area), 4:154 (shop window), 4:119 (Locomotive), and 4:118 (2027 program) are interspersed with the existing ten pieces across six staggered desktop rows. The website image fills keep their full aspect ratios and small proportional corners. The shop photo's obsolete sticker was removed with built-in ImageGen; the current transparent white SVG signature is placed back onto the glass. The program uses the exact authored photo crop with separate text and current transparent modules. Its wording is Partner Program / Apply for 2027, not an awarded partner tier. Provenance and the complete edit prompt are in design/gallery-assets.json.

The four new desktop images total 174,916 bytes; responsive smaller variants are provided for websites and the window. Existing video decoding, visibility pause, reduced-motion and data-saving behavior is reused unchanged.

Verified at 320, 390, 820 and 2560 CSS pixels: all fourteen pieces present, no horizontal overflow, all four new assets load, all signatures stay inside their compositions, website and photo framing match the source, and the profile's three modules have transparent fills. Off-screen videos pause. Build passes. A temporary Node comparison confirmed all 144 existing badge variants (eight formats, three tiers, two symbol sizes and three color treatments) remain byte-for-byte unchanged by the optional campaign/country labels.

## Make it yours studio invitation

Reference: the actual Make your own editor, inspected in the browser, and Luc's request for its miniature with the Grow your business composition. Stageshow's craft and framing guidance, static-card and Figma examples informed this native DOM adaptation. No React kit or duplicate editor runtime is mounted. The shared badge generator supplies the signature and the existing visibility-aware gallery controller plays the optimized gradient loop.

The full-width scene has Chat, the canvas toolbar and Design at desktop size. At narrower sizes it progressively hides the side panels and simplifies the toolbar; the artwork keeps its aspect ratio. A 900-weight Camera Plain title gives the requested oversized emphasis. Faux toolbar controls remain noninteractive and hidden from accessibility APIs; the entire preview is one named link to the real studio, alongside the separate Create a badge button.

Browser verification: 320, 390, 820 and 2560 CSS pixels with no horizontal or toolbar overflow; light and dark appearances; white artwork preserved on the gradient; visible video playing; both preview link and button opening the real studio. Header controls measure exactly 40 px; studio and mobile guideline offsets match the resulting 72/124 px header. The search footer is absent. The actual desktop page reports no console errors. Screenshots saved. Reduced-motion/save-data behavior is reused unchanged, not newly exercised. Safari and Firefox and the React-specific film gate were not run for this native DOM specimen.

## Two photographic compositions and continuous gallery preview

Figma 1:1417 adds the dark brick storefront. Its baked-in legacy badge was removed with built-in ImageGen, and the current transparent outlined stacked signature occupies the same door position. Figma 4:209 preserves both original photo layers, with the foreground clipped at 839/1215 of the frame; the current compact badge sits behind the people at the original position and height. All source images are local WebP variants. The three desktop image layers total 265,116 bytes; smaller variants total 107,652 bytes. Full provenance and the image edit prompt are in design/gallery-assets.json.

The centered grid now has larger side margins and sixteen compositions across seven desktop rows. Opening and closing use the same thumbnail geometry, with transform and subtle opacity animations. The backdrop is completely transparent with no blur. Preview width and height are each capped at 60% of the viewport. Video previews inherit the original playback position and transfer it back on closing; background videos pause while the preview is open. Reduced-motion skips the spatial animation. Escape and an outside click close the dialog, restore the thumbnail and return focus.

Verified in the browser at 320, 390, 820 and 2560 CSS pixels: no horizontal overflow, sixteen compositions, both new assets and the transparent foreground loaded, correct foreground/badge order, centered grid, filled star and 4.6 below the profile name. Mobile previews measured 192 px wide at a 320 px viewport and 234 px at 390 px; desktop portrait height measured 864 px in a 1440 px viewport. Backdrop paint is transparent and backdrop-filter is none. Opening was observed with an intermediate transform; closing returns to the source with no hidden cards left behind. Video playback pauses behind the dialog and resumes afterward. No gallery console errors. Chat and Design icons are mirrored, both panels collapse/reopen, and their tooltips appear below the controls on keyboard focus. Reduced-motion and Safari/Firefox were not exercised in this iteration.

## Compact chat composer

Reduced the miniature’s placeholder-to-action gap from 44 to 16 px, and the real studio’s composer/input minimum heights from 132/78 to 96/44 px. Browser measurements confirm an 80.8 px miniature and 96 px editor composer with a 44 px input. The existing multiline auto-growth code is unchanged; live typing was not exercised because the editor chat is disabled in the current local configuration. Desktop visual checks and the production build pass.

## Universe name transitions

Initial entry briefly shows Lovable; switching workspaces shows Lovable, Partners or Community, all in the same responsive Camera Plain Bold size, centered horizontally at the bottom with the same 16 px inset as the header at the top. Only the word fades; the fixed, pointer-transparent container has no background, blur or dimming. Text is white in dark appearance and #1b1b1b in light appearance. Native opacity animation lasts 320 ms with a 112 ms accelerated fade-out, cancels on subsequent switches, and is omitted for reduced motion. The default entry and workspace controls lead to Gallery, while explicit deep links remain intact.

Browser verification: initial label, all three names, rapid switching, no replay between Gallery and Guidelines, transparent background, correct colors in both appearances, and eventual hidden state after initial and subsequent transitions. The shared CSS specimen fits Community at 320 and 390 px (214 and 251 px text widths); desktop type is 192 px. No console errors. Reduced motion is implemented in both CSS and the controller; OS-level emulation was not available for this check.

## Community clear space

The original diagram incorrectly treated the complete 46.1959-unit lockup height as a heart height. The revised pair derives x from the source heart’s visible bounds (48.0209 − 12.3906 = 35.6303 units), uses that same distance on all four sides, and measures the full logo through the right edge and bottom of Community’s y. The standalone heart is cropped from the same vector artwork. Thin solid guides keep a one-pixel optical weight and HTML x labels remain 12 px at every size. The presentation reuses Partners’ paired specimens and caption placement.

Verified in light and dark appearance on desktop and at 320/390 px: original artwork preserved, heart crop clean, four equal margins, labels visible, no section overflow. Build passes; no browser console errors.

## Bottom workspace labels and glyph favicons

Workspace labels now sit at the bottom with the header’s shared 16 px vertical inset. The brand link remains centered, reduced to clamp(56px, 10vw, 208px), Bold (700), with −0.025em tracking. Browser checks at 2560 and 480 CSS pixels confirm the shared inset, complete text and no horizontal overflow. The three favicon vectors use black glyphs on transparency, verified at 16, 32 and 96 px; active favicon URLs update across all three workspaces. The production build passes.
