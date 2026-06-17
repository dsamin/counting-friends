# Counting Friends — Build-to-Launch Plan

> Goal: take the designed prototype to a **runnable, tested, deployed, launch-ready** product,
> using all existing assets, via subagent-driven development with GitHub repo + PRs + CI.

## Target & rationale
- **Build target:** Installable **PWA** (React + TS + Vite + vite-plugin-pwa).
- **Why:** Only path completable end-to-end here — testable on a real iPad, offline + zero-data
  (matches the privacy thesis), deployable to GitHub Pages (genuinely "launched"), real CI/tests
  gating real PRs. Faithful runtime sibling of the `.dc.html` prototype.
- **Native SwiftUI port:** documented as the next step (Xcode 26.3 available), not built here
  because App Store launch needs an Apple Developer account.

## Source of truth
- `10-counting-friends.md` — product/launch spec
- `HANDOFF.md` — exhaustive behavioral + design-system spec
- `Counting Friends.dc.html` — playable prototype (exact logic extracted)
- `Counting Friends - Brand & Assets.dc.html` — brand/asset sheet
- `assets/` — full production asset library (icons, characters, ui-icons, logo, launch, marketing)
- `css/tokens.css`, `css/app.css` — design tokens + component classes

## Fidelity rules (must match prototype exactly)
- Tiers: easy(1–5, 3 choices), medium(1–10, 4), hard(1–20, 4). Distractors unique, in-range, sorted asc.
- Adaptive animal size: `round(clamp(58, 560/sqrt(count), 160))` px.
- Timing: idle 6000 · advance 1950 (rm 1400) · wrong-revert 640 · re-ask 760 · gate-hold 3000 · pop stagger 55 · popIn 520 · bob 2400+(i%3)*350.
- No-fail: wrong tap keeps `status:'asking'`; rapid-tap guard returns unless asking.
- Confetti: 74 full / 34 calm / 5 sparkles (reduce-motion); gravity 0.17, drag 0.99.
- Audio: TTS rate 0.92 pitch 1.18; praise pool + number words; SFX pop/whoops/chirp arpeggios.
- Persistence: `cf_tier`, `cf_name`, `cf_rm`, `cf_voice` in localStorage.
- Characters: Dot/duck/Quack, Pip/cat/Meow, Hopper/frog/Ribbit, Momo/bunny/Boing.

## Tasks
- [x] **T1 — Scaffold + design system + assets.** Vite+React+TS, vitest, playwright, eslint/prettier,
      vite-plugin-pwa. Copy `assets/`→`public/`, adapt `tokens.css`/`app.css`, fonts, index.html.
      `npm run build` + `npm test` green.
- [x] **T2 — Pure game core (TDD).** types, characters, constants, round.ts (gen+tiers+size, seedable RNG),
      persistence.ts. Full unit tests.
- [x] **T3 — Game state machine (TDD).** `useGame` reducer: pick / handleChoice(correct|wrong) /
      tapAnimal / replay / back / gate / settings; timers via fake timers in tests.
- [x] **T4 — Audio.** speech.ts (TTS+voice pick), sfx.ts (WebAudio). jsdom-safe no-ops.
- [x] **T5 — Components + confetti + integration.** StartScreen, PlayScreen, Scene, NumberButton,
      AnimalField/Animal, ReplayPill, ChromeBar/Back, ParentalGate, SettingsSheet, Confetti canvas,
      CharacterSprite (inline SVG). Full playable app + component tests.
- [x] **T6 — PWA + a11y + reduce-motion.** manifest, SW/offline, prefers-reduced-motion default,
      aria labels, apple-touch-icons, theme-color.
- [ ] **T7 — E2E (Playwright) + screenshots.** tier→correct→celebration→wrong→gate→settings; capture
      marketing screenshots.
- [ ] **T8 — Marketing landing page.** One-pager: "No ads. No data. No fail." using marketing frames.
- [ ] **T9 — Launch collateral & docs.** README, PRIVACY (hosted page), STORE_LISTING.md, LICENSE,
      SWIFTUI-PORT.md, screenshot/preview guidance.
- [ ] **T10 — CI/CD.** GitHub Actions: lint+test+build on PR; Pages deploy on main.

## Ship workflow
- git init → seed commit on `main` → `gh repo create dsamin/counting-friends --public`.
- Feature branches → PRs (grouped by milestone) → CI green → merge.
- Enable GitHub Pages → app + privacy + marketing live.

## PR grouping (target)
- PR1: foundation (T1+T2+T3 core + tests)
- PR2: full playable app (T4+T5+T6) + component/e2e
- PR3: marketing + launch collateral + docs + CI/CD (T7+T8+T9+T10)

## Review section
_(filled in as work completes)_
