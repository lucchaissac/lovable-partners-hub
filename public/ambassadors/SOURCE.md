# Community kit source

Original artwork, template geometry and globe rendering come from Luc's
[Lovable Ambassador Kit](https://github.com/lucchaissac/lovable-ambassador-kit),
commit `6731f3968825142211c1206897b41dd95d085b75`.

- `scene/` preserves the original Three.js scene, brand vectors and bundled dependencies.
- `assets/` contains the original Community lockup, heart overlay, regular font and offline city index.
- `previews/` contains optimized captures of the six original template renders. These are display previews; customized artwork and PNG exports are rendered from the templates.
- The Montreal gathering photo was supplied by Luc as `lovable-stripe12.jpg` and resized into two WebP derivatives.
- The shared SVG renderer, brand paths and signed QR implementation live in `src/ambassadors/source/`.

Brand artwork and fonts retain their existing license terms. Bundled dependency
license notices remain in their source files. City coordinates come from GeoNames,
licensed under CC BY 4.0; attribution and the retrieval date are preserved in
`assets/cities.json`.
