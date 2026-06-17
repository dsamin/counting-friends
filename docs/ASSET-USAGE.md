# Asset Usage Map

An auditable map of **every** file under `assets/` to where and how it is used.
The goal: a reviewer can confirm no asset is orphaned.

`assets/` is the source-of-truth design library. The web build serves a mirror
of it from `public/assets/` (so paths like `./assets/...` and
`/counting-friends/assets/...` resolve at runtime); the same library also feeds
the SwiftUI/iOS native port. Files fall into three usage classes:

- **web-rendered** — referenced by the running PWA, its marketing pages, or the
  PWA manifest, and therefore shipped to and loaded by browsers.
- **raster-library** — intentional raster (`.png`) alternates of inlined/vector
  art, kept for press kits, stores, and the native port. Not rendered by the web
  app, documented here so they don't read as orphans.
- **native-port / master** — vector masters and launch art consumed by the
  SwiftUI port and icon-generation tooling (see `docs/SWIFTUI-PORT.md`).

The icon SVGs under `ui-icons/` have React counterparts that are **re-drawn
inline** in components (`BackButton`, `ReplayPill`, `UiIcon`, `ParentalGate`)
rather than `<img>`-loaded, so the SVG files are the design reference and the
raster `png/` siblings are the raster library.

---

## `assets/characters/` — the four mascots

| File | Class | Used by |
| --- | --- | --- |
| `duck.svg` | native-port / master | Vector master for Dot the duck. Re-drawn inline in `src/components/CharacterDefs.tsx`; consumed by the SwiftUI port. |
| `cat.svg` | native-port / master | Vector master for Pip the cat. Inline in `CharacterDefs.tsx`; SwiftUI port. |
| `frog.svg` | native-port / master | Vector master for Hopper the frog. Inline in `CharacterDefs.tsx`; SwiftUI port. |
| `bunny.svg` | native-port / master | Vector master for Momo the bunny. Inline in `CharacterDefs.tsx`; SwiftUI port. |
| `png/duck.png` | web-rendered | "Meet the friends" sprite in `public/about.html`. |
| `png/cat.png` | web-rendered | "Meet the friends" sprite in `public/about.html`. |
| `png/frog.png` | web-rendered | "Meet the friends" sprite in `public/about.html`. |
| `png/bunny.png` | web-rendered | "Meet the friends" sprite in `public/about.html`. |

The in-app characters are drawn as inline SVG (`<defs>` symbols) in
`src/components/CharacterDefs.tsx` and placed via `src/components/CharacterSprite.tsx`,
so the `characters/*.svg` files are the authored masters; `png/*` are the raster
sprites the marketing page renders.

---

## `assets/ui-icons/` — interface glyphs

| File | Class | Used by |
| --- | --- | --- |
| `back.svg` | web-rendered (inlined) | "Back to start" chevron, re-drawn inline in `src/components/BackButton.tsx`. |
| `replay.svg` | web-rendered (inlined) | "Play again" glyph, re-drawn inline in `src/components/ReplayPill.tsx`. |
| `voice.svg` | web-rendered (inlined) | `UiIcon name="voice"` — Mascot-voice row in `src/components/SettingsSheet.tsx`. |
| `child.svg` | web-rendered (inlined) | `UiIcon name="child"` — Child's-name field label in `SettingsSheet.tsx`. |
| `settings.svg` | web-rendered (inlined) | `UiIcon name="settings"` — Reduce-motion row in `SettingsSheet.tsx`. |
| `lock.svg` | web-rendered (inlined) | `UiIcon name="lock"`; also drawn inline inside the parental-gate dot in `src/components/ParentalGate.tsx`. |
| `heart.svg` | web-rendered (inlined) | `UiIcon name="heart"` — reassurance chip in `SettingsSheet.tsx` (coral fill). |
| `png/back.png` | raster-library | Raster alternate of `back.svg`. |
| `png/replay.png` | raster-library | Raster alternate of `replay.svg`. |
| `png/voice.png` | raster-library | Raster alternate of `voice.svg`. |
| `png/child.png` | raster-library | Raster alternate of `child.svg`. |
| `png/settings.png` | raster-library | Raster alternate of `settings.svg`. |
| `png/lock.png` | raster-library | Raster alternate of `lock.svg`. |
| `png/heart.png` | raster-library | Raster alternate of `heart.svg`. |

The five new glyphs (`voice`, `child`, `settings`, `lock`, `heart`) are
transcribed into `src/components/UiIcon.tsx`; the SVG files are the design
reference for those inline paths. All `ui-icons/png/*` are a documented raster
library (press / native), not loaded by the web app.

---

## `assets/app-icon/` — application icon

| File | Class | Used by |
| --- | --- | --- |
| `app-icon.svg` | native-port / master | Icon master. Source for the generated PWA icons in `public/icons/*` (manifest, see `vite.config.ts`) and the iOS app-icon set. |
| `ios/AppIcon-1024.png` | native-port | iOS App Store / Xcode app-icon set. |
| `ios/AppIcon-180.png` | native-port | iOS home-screen @3x (60pt). |
| `ios/AppIcon-167.png` | native-port | iPad Pro app icon (83.5pt @2x). |
| `ios/AppIcon-152.png` | native-port | iPad app icon (76pt @2x). |
| `ios/AppIcon-120.png` | native-port | iPhone app icon (60pt @2x) / spotlight. |
| `ios/AppIcon-87.png` | native-port | Settings @3x (29pt). |
| `ios/AppIcon-80.png` | native-port | Spotlight @2x (40pt). |
| `ios/AppIcon-76.png` | native-port | iPad app icon (76pt @1x). |
| `ios/AppIcon-60.png` | native-port | Notification @3x (20pt). |
| `ios/AppIcon-58.png` | native-port | Settings @2x (29pt). |
| `ios/AppIcon-40.png` | native-port | Spotlight @1x / notification @2x. |
| `ios/AppIcon-29.png` | native-port | Settings @1x (29pt). |
| `ios/AppIcon-20.png` | native-port | Notification @1x (20pt). |

The web PWA's runtime icons are the generated `public/icons/*`
(`icon-192.png`, `icon-512.png`, the two `*-maskable` variants, and
`apple-touch-icon.png`), wired through the `VitePWA` manifest in
`vite.config.ts` and the `apple-touch-icon` link in `index.html`. The
`app-icon/ios/*` set is the native iOS port's `AppIcon.appiconset`, generated
from `app-icon.svg`.

---

## `assets/logo/` — wordmark + badge

| File | Class | Used by |
| --- | --- | --- |
| `mark.svg` | web-rendered | Duck badge in the `public/about.html` footer; also the favicon lineage (`public/favicon.svg`). |
| `wordmark-light.svg` | native-port / master | Light-background wordmark master (vector). SwiftUI port + design source. |
| `wordmark-light.png` | web-rendered | Hero wordmark in `public/about.html` (`.hero .wordmark`). |
| `wordmark-dark.svg` | native-port / master | Dark-background wordmark master (vector). SwiftUI port + design source. |
| `wordmark-dark.png` | web-rendered | Dark closing CTA band in `public/about.html` (`.cta-band .wordmark-dark`), shown on the ink background. |

---

## `assets/launch/` — launch / splash

| File | Class | Used by |
| --- | --- | --- |
| `launch-screen.png` | web-rendered + native-port | iOS PWA splash via `apple-touch-startup-image` in `index.html`; also the native SwiftUI launch screen. |
| `launch-screen.svg` | native-port / master | Vector master for the launch screen (SwiftUI port + raster source). |

---

## `assets/marketing/` — store / promo frames

| File | Class | Used by |
| --- | --- | --- |
| `frame-1.png` | web-rendered | PWA manifest `screenshots[0]` ("Tap your friends to count") in `vite.config.ts`. |
| `frame-2.png` | web-rendered | PWA manifest `screenshots[1]` ("Every answer is a celebration"). |
| `frame-3.png` | web-rendered | PWA manifest `screenshots[2]` ("No ads. No data. No fail.") and the hero device frame in `public/about.html`. |
| `frame-1.svg` | native-port / master | Vector master for `frame-1.png` (design source). |
| `frame-2.svg` | native-port / master | Vector master for `frame-2.png` (design source). |
| `frame-3.svg` | native-port / master | Vector master for `frame-3.png` (design source). |

---

## Docs

| File | Class | Used by |
| --- | --- | --- |
| `README.md` | docs | Human-readable overview of the asset library (not a rendered asset). |

---

## Coverage check

- **Characters:** 4 svg masters (inline in app + native) · 4 png (about.html).
- **UI icons:** 7 svg (all inlined in components) · 7 png (raster library).
- **App icon:** 1 svg master · 13 ios png (native set); web uses generated
  `public/icons/*`.
- **Logo:** `mark.svg` (about.html + favicon) · `wordmark-light.{svg,png}`
  (hero) · `wordmark-dark.{svg,png}` (dark CTA band).
- **Launch:** `launch-screen.png` (iOS PWA splash + native) · `.svg` master.
- **Marketing:** 3 png (manifest screenshots; frame-3 also in about.html) ·
  3 svg masters.
- **Docs:** `README.md`.

No file under `assets/` is orphaned.
