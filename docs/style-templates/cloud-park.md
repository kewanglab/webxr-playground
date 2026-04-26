# Theme preset: Cloud Park

**Intent:** A bright, social, Half+Half-inspired daytime preset for the XR Interaction Playground. This is a mood translation, not a recreation of Half+Half branding, avatars, levels, logos, or game assets.

**Preset id:** `cloud-park`  
**UI label:** `Cloud Park`  
**Code:** [`src/config/playgroundTheme.ts`](../../src/config/playgroundTheme.ts)

## Reference

- [Half + Half official site](https://halfandhalf.fun/) frames the game as a place in virtual reality for hanging out with friends.
- [Half + Half press page](https://halfandhalf.fun/press) describes five multiplayer spaces built around connection, voice, body language, and playful mechanics.

## What It Is

Cloud Park is a soft daytime world: open sky, meadow floor, ocean-blue system cues, warm sun-yellow paths, coral social accents, and cream panels that feel like floating picnic signs.

## Why It Matters

The default `Warm Night` theme feels intimate and focused. Cloud Park does the opposite: it makes the playground feel open, approachable, and social. That matters for XR because color is not just surface styling. In-headset, color becomes distance, comfort, wayfinding, and emotional temperature.

Compared with 2D design, this preset has to work as a place around the body:

- **Spatial UI:** cream HUD panels and soft teal structure read as friendly anchors in the air.
- **Interaction:** coral marks "notice me" moments; blue stays reserved for valid placement, routes, and system confidence.
- **Ergonomics:** brighter mid-values reduce eye strain, while far fog keeps the horizon gentle instead of visually busy.

## How To Think About It

Think of the user standing at the edge of a small park in the sky. The scene should feel easy to enter before any interaction begins.

Use this mental model:

- **Sky and fog** create the room.
- **Green floor** gives the body a calm place to stand.
- **Amber paths** suggest motion and invitation.
- **Coral accents** are social signals, like a friend waving.
- **Cream objects and panels** are rest points for the eye.
- **Deep teal** provides contrast without pulling the world back into night mode.

## Scenic Vocabulary

Cloud Park is beauty-first. The world should read as a place before it reads as a testing scaffold.

Use these procedural forms:

- **Cloud mats** as soft ground islands and task bases.
- **Soft arches** as social gateways and lab landmarks.
- **Wind streaks** as motion lines, not decorative noise.
- **Simple cloud cards** for distant atmosphere. Use a few translucent circle or plane meshes so background clouds read as haze without adding texture or particle cost.
- **Atmospheric sunlight** for daytime warmth. Use one soft glow disc plus a small core, not a stack of textured glow cards.
- **Distant park hints** only when they support the active lab. Avoid building a second scene behind the scene.
- **Contact-shadow blobs** under objects so props feel grounded without a full shadow pipeline.

The grid is allowed in Cloud Park, but it should be secondary. It should help spatial review only after the scene already feels like a floating social park.

## Object Shape Grammar

Cloud Park objects should tell the same story as the atmosphere: a soft floating park for social play. Do not just recolor default lab equipment.

Use this shape language:

- **Tangible park objects:** rounded, buoyant, low-poly, soft-edged, and slightly handmade.
- **Movement objects:** ribbons, kites, streamers, stepping clouds, wind trails, and route puffs.
- **System or validity cues:** ocean-blue halos, beacon rings, and clean sky markers.
- **Social or action cues:** coral and amber accents.
- **Grounding:** cloud perches, contact blobs, soft mats, and pale cream bases.

Avoid in Cloud Park:

- hard sci-fi pods, box wings, metal gadget details, and imported platform-kit pedestals
- perfect-circle suns or foreground-like sphere clouds in the far background
- technical markers that dominate the scenic read
- props whose silhouette does not explain why they exist in a sky park

## Lab Set Language

Each lab should feel like a distinct small scene inside the same park:

| Lab | Cloud Park Set Direction |
|-----|--------------------------|
| Selection | Cloud-gate plaza with a kite pointer, landing-pad touch token, handhold charm, and soft cloud perches |
| Placement | Beacon-seed surface marker showcase for desktop captures; passthrough-safe rings and beacon preview in AR |
| Locomotion | Floating ribbon path with stepping-cloud route markers, cloud checkpoints, and a destination gate |
| Manipulation | Sky-workbench with matching beacon object/ghost for docking, cloud-garden basin for zen arrangement |

Interaction behavior is not part of this theme pass. Keep hitboxes, movement math, placement confirmation, grab logic, measurements, and Leva controls unchanged unless a separate interaction task calls for it.

## Performance And Motion Limits

Cloud Park should stay close to the default theme's object complexity. Color, scale, and silhouette should carry the vibe before mesh density does.

- Prefer static decorative atmosphere. If motion returns later, move only one or two distant groups.
- Keep target meshes, hitboxes, trial objects, placement transforms, and measurement-critical objects stable.
- Use simple group transform updates; do not allocate materials or geometry in animation frames.
- Avoid generated alpha textures, dense cloud clusters, high segment counts, and layered decorative stacks in headset-facing scenes.
- Keep movement slow enough that generated screenshots still compose cleanly.

## Token Translation

| Layer | Direction |
|-------|-----------|
| Shell background | mint canvas with cream elevated panels |
| Shell action | accessible coral, with warm peach support |
| XR sky | blue top, sunny horizon, mint lower atmosphere |
| XR floor | meadow green with low emissive lift |
| XR grid | pale mint cells with amber section read |
| HUD | cream translucent panel, teal text, coral border |
| AR overlay | ocean-blue alignment cue with slightly higher opacity |

## Lab Accent Routing

| Lab | Primary | Secondary | Reason |
|-----|---------|-----------|--------|
| Selection | coral | amber | social target plus playful confirmation warmth |
| Placement | ocean blue | coral | blue means "valid in space"; coral keeps the object lively |
| Locomotion | ocean blue | amber | blue route confidence, amber destination invitation |
| Manipulation | coral | soft lime | held objects feel active while trim stays toy-like |

## Guardrails

- Do not use Half+Half logos, avatars, named spaces, screenshots, or branded shapes.
- Keep color playful but purposeful; avoid turning every object into decoration.
- Preserve Quest-friendly rendering: one skydome, one quiet grid, one floor plane, one directional light, one hemisphere light, and lightweight procedural props.
- Avoid required postprocessing, high-density particles, complex shaders, or new asset pipelines.
- Prefer memoized/reused low-poly primitives for repeated clouds, mats, islands, and scenic markers.
- Keep the theme readable in AR by reserving blue for alignment and validity cues.
