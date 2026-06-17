# Counting Friends — Asset Library

Every shippable asset for the app, organized by type. Vector **SVG** is the source of
truth for each graphic; **PNG** exports are provided where a build pipeline needs raster
(app icon, store art). Pair this with `../HANDOFF.md` (behavior + design system) and the
two reference `.dc.html` files at the project root (the working prototype).

## Folder tree

```
assets/
├── README.md                ← you are here
├── app-icon/
│   ├── app-icon.svg          1024 master (square, NO corner mask — Apple/Google mask at runtime)
│   └── ios/                  rasterized PNG set, all required iOS/iPadOS slots
│       ├── AppIcon-1024.png  App Store / marketing
│       ├── AppIcon-180.png   iPhone @3x
│       ├── AppIcon-167.png   iPad Pro @2x
│       ├── AppIcon-152.png   iPad @2x
│       ├── AppIcon-120.png   iPhone app @2x / spotlight @3x
│       ├── AppIcon-87.png    settings @3x
│       ├── AppIcon-80.png    spotlight @2x
│       ├── AppIcon-76.png    iPad app @1x
│       ├── AppIcon-60.png    notification @3x base
│       ├── AppIcon-58.png    settings @2x
│       ├── AppIcon-40.png    spotlight @1x / notification @2x
│       ├── AppIcon-29.png    settings @1x
│       └── AppIcon-20.png    notification @1x
├── characters/
│   ├── duck.svg  cat.svg  frog.svg  bunny.svg   master line art (viewBox 0 0 100 100)
│   └── png/      duck.png cat.png frog.png bunny.png   512px transparent sprites
├── ui-icons/
│   ├── back.svg replay.svg voice.svg child.svg lock.svg settings.svg heart.svg
│   └── png/      same set @96px transparent
├── logo/
│   ├── wordmark-light.svg / .png    horizontal lockup on light
│   ├── wordmark-dark.svg  / .png    horizontal lockup on dark (rounded brown plate)
│   └── mark.svg                      duck-only badge (avatar / favicon source)
├── launch/
│   ├── launch-screen.svg / .png      splash (iPad landscape 4:3)
└── marketing/
    ├── frame-1.svg / .png   "Tap your friends to count"
    ├── frame-2.svg / .png   "Every answer is a celebration"
    └── frame-3.svg / .png   "No ads. No data. No fail."

css/
├── tokens.css   design tokens (color, type, shape, elevation, motion) + keyframes
└── app.css      component classes mirroring the prototype's inline styles
```

## How each asset is built & how to use it

### App icon (`app-icon/`)
- **Concept:** the duck mascot on the storybook scene (sky gradient, sun, cloud, hills).
  One mascot, no text — legible from 20px to 1024px. Deliberately **not** pre-rounded;
  the platform applies the superellipse mask, so submit the square master.
- **Source:** `app-icon.svg` (1024 viewBox). The duck path is **inlined**, not `<use>`d —
  nested `<use>` of a symbol does not rasterize reliably.
- **Use:** drop the `ios/` PNGs straight into an Xcode asset catalog (`AppIcon.appiconset`).
  Re-export any size from the SVG if you add slots (Android adaptive, web favicon, etc.).

### Characters (`characters/`)
- **Concept:** four friends drawn to one spec — **4px ink stroke, round joins, dot eyes,
  blush cheeks** — so they read as a family. Each is a clean `0 0 100 100` symbol.
- **Use:** inline the SVG for crisp scaling + recolor in-app (this is what the prototype
  does); use the 512px PNGs for press kit, app-store thumbnails, or engines that prefer
  raster sprites. Names + sounds: Dot/Duck "Quack", Pip/Cat "Meow", Hopper/Frog "Ribbit",
  Momo/Bunny "Boing".

### UI icons (`ui-icons/`)
- **Concept:** one stroke weight (2.6px, round caps) on a 24-unit grid — only the icons a
  toddler UI actually needs. `heart` is the single filled (coral) icon.
- **Use:** inline SVG and set `stroke`/`fill` from `--cf-ink`. PNGs for quick mockups.

### Logo (`logo/`)
- **Concept:** Baloo 2 800 wordmark, "Friends" in coral (light) / duck-yellow (dark), with
  the duck mark. `mark.svg` is the duck on a cream badge for avatars/favicons.
- ⚠ **Fonts:** the wordmark SVGs reference Baloo 2 via `font-family`. For a font-independent
  production asset, **convert the text to outlines** (Illustrator/Inkscape "Object to Path")
  or keep the provided PNGs. The PNGs here were rendered with the real font.

### Launch screen (`launch/`)
- **Concept:** wordless splash — logo + mascot on the scene. Renders instantly; no spinner,
  no progress bar (kids don't read "Loading").
- **Use:** as an iOS Launch Screen storyboard background or the SVG behind a splash view.
  Same font caveat as the logo.

### Marketing frames (`marketing/`)
- **Concept:** the three-beat App Store story — *what it is → how it feels → why it's safe*
  — each a headline + a device showing a real app state. Portrait 4:5 (1200×1500 source).
- **Use:** App Store / Play screenshots. Re-export at the store's required pixel sizes from
  the SVG (fonts installed) or scale the PNGs. Same font caveat.

## CSS (`css/`)
- `tokens.css` — **import first.** All color/type/shape/elevation/motion values as custom
  properties, plus every `@keyframes` (`cf-popIn`, `cf-bob`, `cf-squashPop`,
  `cf-wrongWobble`, `cf-soundbar`, `cf-floaty`) and a `prefers-reduced-motion` default.
- `app.css` — component classes (`.cf-tier-card`, `.cf-number`, `.cf-animal`, `.cf-replay`,
  `.cf-gate`, `.cf-switch`, `.cf-sheet`, …) that reproduce the prototype's look from tokens.
- Load fonts in `<head>`:
  `https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Quicksand:wght@400;500;600;700&display=swap`

## Regenerating raster from vector
All PNGs were produced by rasterizing the SVGs (icons/characters/icons: headless canvas;
logo/launch/marketing: rendered with the web fonts loaded, then trimmed). To re-export,
load each SVG at the target pixel size and draw to a canvas — fonts must be available for
the text-bearing assets, or outline the text first.
