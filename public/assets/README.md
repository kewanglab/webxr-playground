# Static assets

What ships in the repo, where it came from, and what has to be fetched.

## Shipped in the repo

| Path | Size | Source | License | Used by |
|---|---|---|---|---|
| `fonts/DMSans-Regular.ttf` | 78 KB | [DM Sans](https://github.com/googlefonts/dm-fonts) | SIL OFL 1.1 (`fonts/OFL.txt`) | all in-scene text via `src/xr/visual/XRText.tsx` — self-hosted so no CDN fetch happens at runtime (see `docs/pitfalls.md`) |
| `models/xr-kit/*.glb` | ~2 MB total | derived — built from the MegaKit + Molten packs below by `npm run build:xr-kit` | inherits the source packs' terms | `KitInstance` (`src/xr/visual/useKitModel.tsx`) |

The `xr-kit` GLBs are texture-optimized (1024 px max, WebP) — originally ~67 MB
for the same nine models, essentially all of it 2048² PNG trim sheets on
sub-500-vertex meshes. Mesh compression is deliberately *not* used: these meshes
are tiny, and Draco would add a runtime decoder fetch for no benefit.

Regenerate after changing the source packs:

```sh
npm run build:xr-kit
# then re-optimize:
npx gltf-transform resize <in> <tmp> --width 1024 --height 1024
npx gltf-transform webp <tmp> <out> --quality 82
```

## Not in the repo — fetch locally to rebuild the kit

These are **build-time inputs only**; nothing loads them at runtime. They were
removed from the repo because they added ~68 MB to every clone while never being
served, and because commercial asset packs should not be redistributed through a
public repository without checking their terms.

| Pack | Approx. size | Needed for |
|---|---|---|
| `models/Modular SciFi MegaKit[Standard]/` | 33 MB | `scripts/build-xr-kit-glb.mjs` (primary source meshes + shared textures) |
| `models/Molten Maps SciFi Asset Pack/` | 27 MB | `scripts/build-xr-kit-glb.mjs` (optional `briefing_screen`) |

To rebuild the kit, drop your licensed copies back at those paths and run
`npm run build:xr-kit`. Both paths are git-ignored, so a local copy will not be
committed.

> **Licensing — unresolved.** Confirm the redistribution terms of the MegaKit and
> Molten packs before publishing any derived `xr-kit` GLB. If their licenses do
> not permit redistribution of derivatives, the shipped `xr-kit` models must be
> replaced with CC0 equivalents (e.g. [Kenney](https://kenney.nl) kits, which are
> CC0 and were previously vendored here but unreferenced by any code).
