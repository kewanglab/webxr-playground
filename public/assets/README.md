# Static assets

What ships in the repo, where it came from, and what has to be fetched.

## Shipped in the repo

| Path | Size | Source | License | Used by |
|---|---|---|---|---|
| `fonts/DMSans-Regular.ttf` | 78 KB | [DM Sans](https://github.com/googlefonts/dm-fonts) | SIL OFL 1.1 (`fonts/OFL.txt`) | all in-scene text via `src/xr/visual/XRText.tsx` — self-hosted so no CDN fetch happens at runtime (see `docs/pitfalls.md`) |

The font is the only asset shipped in the repo. Nothing else is fetched at
runtime — every lab draws from primitives.

## The xr-kit models are gone — and why

The nine `models/xr-kit/*.glb` files were removed before the site went public.
They were derivatives of the two commercial packs below, whose redistribution
terms were never confirmed, and publishing to GitHub Pages would have
redistributed them to every visitor.

Eight of the nine were already referenced by no code at all. The ninth,
`platform_simple.glb`, was one flat slab on the Manipulation Lab's docking desk
in the Warm Night theme; it is now `DeckPlate` in
`src/labs/cross-xr/manipulation/DockingMode.tsx`, built from two boxes.

The loader (`src/xr/visual/useKitModel.tsx`) and the native-size table
(`src/xr/visual/kitNative.ts`) are kept but unused, so a local rebuild still
has something to call. `models/xr-kit/` is git-ignored: regenerating the kit
on your machine will not put it back in the repo.

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

Regenerate with:

```sh
npm run build:xr-kit
# then re-optimize (the kit was ~67 MB of 2048² PNG trim sheets before this):
npx gltf-transform resize <in> <tmp> --width 1024 --height 1024
npx gltf-transform webp <tmp> <out> --quality 82
```

Mesh compression is deliberately *not* used: these meshes are sub-500-vertex,
and Draco would add a runtime decoder fetch for no benefit.

> **Licensing — still unresolved, but no longer blocking.** Nothing derived
> from these packs ships any more, so the public site is clear either way.
> Confirm their terms before committing or deploying any derived GLB. If they
> do not permit redistributing derivatives, use CC0 equivalents instead —
> e.g. [Kenney](https://kenney.nl) kits.
