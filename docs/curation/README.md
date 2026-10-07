# Diga um Nome — curated content package

This package is intended to be handed to Claude Code as input for the existing Diga um Nome repository.

## Contents
- `featured.json` — 20 featured scientists with curated facts, three discovery layers, reveal copy, factual sources, experience motifs and image metadata.
- `image-manifest.json` — one image route/candidate per scientist plus rights status, attribution and reuse notes.
- `IMAGE-CREDITS.md` — readable rights ledger.
- `CLAUDE-INTEGRATION.md` — exact integration constraints.

## Important
The content dataset is fact-checked at the research/curation level, but public institutional publication should still receive final ÍRIS editorial approval.

Image status is intentionally stricter:
- `approved`: open/public-domain license verified.
- `approved-with-credit`: source explicitly permits reproduction with required attribution.
- `rights-review`: candidate identified, but publication rights were not established. Do not ship that image yet.

A package can be complete without pretending all rights are cleared: pending portraits should use the existing topographic/person fallback until permission or a verified open asset is obtained.
