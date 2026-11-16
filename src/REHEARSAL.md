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
