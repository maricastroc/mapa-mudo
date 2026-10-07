# Claude integration brief — Diga um Nome / Ciência Delas

Use this package as curated content. Do not research, invent, rewrite factual claims, or silently substitute images.

## Files
- `featured.json`: 20 curated featured scientists. Facts, hints, reveal copy, sources and photo metadata.
- `image-manifest.json`: image candidate, rights status, attribution and license notes per scientist.
- `IMAGE-CREDITS.md`: human-readable rights/credits ledger.

## Integration rules
1. Replace the fictional Helena featured fixture with the real `featured.json` dataset while preserving the existing generic architecture and all terrain/camera/contour behavior.
2. `featured` is NOT the universe of valid answers. Do not collapse it into `known`.
3. Do not alter hint/reveal wording during integration. If a schema mismatch requires editorial change, stop and report it.
4. Do not make an LLM decide whether a submitted name is a scientist.
5. Do not hardcode scientist names in components or the map engine.
6. Preserve sourceRefs/facts even if the visitor UI does not display them.
7. Image rule:
   - `approved` / `approved-with-credit`: may be used after downloading the exact asset from the manifest source and preserving attribution.
   - `rights-review`: MUST NOT be scraped, downloaded into the public bundle, or published. Render the existing topographic/person fallback until rights are cleared.
   - Do not replace a pending portrait with a random Google image.
8. For CC BY-SA assets, preserve the ShareAlike obligations for the transformed/cropped image. Record transformations in the credit ledger.
9. Add a discreet credits/about surface accessible from the installation UI with image credits and factual-source credits; do not clutter the main experience.
10. Do not use external image hotlinks in production. Once an asset is cleared, store it locally under `public/scientists/<fileName>`.
11. Preserve the current visual language: Bai Jamjuree; ÍRIS blue #1001e3; ÍRIS orange #ee704c; neutral ink; cartographic/topographic direction.
12. Do not change composition, engine, interaction flow, or color hierarchy as part of content integration.

## Required validation
- Validate JSON schema and unique IDs.
- Every featured scientist has exactly 3 discovery hints.
- Every hint/reveal claim references fact/source IDs.
- Every `photo.src` either resolves to a locally bundled cleared asset or is null.
- No `rights-review` image is bundled.
- Exact/alias matching still works for all featured scientists.
- “Não sei” can select across all 20 featured scientists.
- Return flow recognizes the newly learned scientist and produces +1.
- Collective map accepts all featured entries without literal-name conditionals.
- Run tests, typecheck, lint and build.
- Browser-walk at least 3 very different featured scientists (one historical, one contemporary, one field with different visual motifs).

Do not commit. Report schema adaptations, missing assets, rights-review items, test results and any factual/editorial mismatch instead of fixing content silently.
