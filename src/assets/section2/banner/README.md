# banner/ — PENDING (blocked)

The 6 `Bobi Level_banner` variants (theme1..theme6, set `1:5140`, each 390x240)
are RASTER photo composites and must be exported as PNG@2x via
`framelink download_figma_images`.

**Blocked:** framelink hit a hard Figma `429` (account/seat-level rate limit,
retry-after ~4.6 days — "Viewer/starter plan limited API access"). The 6 variant
node IDs and their `imageRef`s could not be fetched.

To finish once the limit resets (or with a higher Figma seat):
1. `get_node 1:5140` depth 1 → grab the 6 `theme{n}` COMPONENT node IDs + imageRefs.
2. `download_figma_images` each → `theme1.png` … `theme6.png` at `pngScale: 2`.
