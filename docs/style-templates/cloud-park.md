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
- Preserve Quest-friendly rendering: one skydome, one grid, one floor plane, one directional light, one hemisphere light.
- Keep the theme readable in AR by reserving blue for alignment and validity cues.
