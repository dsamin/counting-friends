# Counting Friends — Native iPad App (Capacitor) — 2026-06-17

> Goal: a genuine native iPadOS app (Capacitor wrapper of the existing PWA) that **builds and
> runs on the iPad Simulator**, with the web PWA preserved (zero regression). Store submission
> deferred. Full design spec: `docs/superpowers/specs/2026-06-17-ipad-capacitor-app-design.md`.

- [x] **Phase 0 — Toolchain:** CocoaPods 1.16.2 (brew, own ruby) on PATH; iPad Pro 11" (M4) sim booted.
- [x] **Phase 1 — Native-safe dual build:** vite-plugin-pwa gated behind `CAP_BUILD`; `build:native` (cross-env, base `/`, SW off). Verified: native dist root-relative + no SW + grep gates clean; web dist unchanged; 155 tests + lint green.
- [x] **Phase 2 — Capacitor scaffold:** Capacitor 7.6.6 (core/ios/cli + app/haptics/splash/status-bar) + TTS 6.1.0; `capacitor.config.ts`; `cap add ios` (pod install clean); `.gitignore` native artifacts; `cap doctor` no skew; `cap sync` clean.
- [x] **Phase 3 — Native UX:** status bar hidden + splash dismiss (`src/native/bootNative.ts`); body scroll/overscroll lock; per-element safe-area insets (Back/Replay inline, `.cf-gate` css); branded 1024 icon + 2732 cream splash.
- [x] **Phase 4 — Native capabilities:** `feedback.ts` haptics (celebrate/tap, reduce-motion-gated, web no-op); `capacitorTtsEngine.ts` composite native-TTS engine (SFX reuse WebAudio, speaking events synthesized); engine selected by platform in `App.tsx`.
- [x] **Phase 5 — Build/run/verify:** native app boots + renders on iPad Pro 11" (M4) sim; PlayScreen verified portrait+landscape on native bundle (chrome/safe-areas/confetti/reflow); ReplayPill `--speaking` = voice proxy; e2e 6/6; full web regression green.
- [x] **Phase 6 — Docs + handoff:** `docs/IPAD-APP.md` (build/run + architecture + gotchas + verification); deferred store path noted; memory updated.

### Review

**Outcome:** Counting Friends now runs as a genuine native iPadOS app (Capacitor 7 wrapper)
on the iPad Simulator, with the web PWA fully preserved (zero regression). Spec was reviewed
by 3 independent agents (all GO-WITH-FIXES); corrections folded in before building.

**Key engineering decisions / deviations:**
- Native build disables the PWA service worker + uses base `/` (WKWebView gotchas) via a
  `CAP_BUILD` env gate — web build untouched.
- Native TTS (iOS speech) replaces Web Speech on device (WKWebView `speechSynthesis` is
  flaky); SFX still WebAudio. Reliable voice without losing the synth blips.
- Podfile/app deployment target kept at Capacitor default iOS 14 (consistent app+Pods,
  runs on all installed 18.x/26.3 sims) rather than the spec's tentative 16 — bumping only
  the Podfile would desync from the app target.
- Verification was done autonomously (computer-use sim-control needs human approval, which
  timed out while unattended): native shell proven via simulator screenshot; PlayScreen +
  rotation proven on the identical native bundle via Playwright at iPad size; flows via e2e.

**Pre-existing issue found (NOT caused by this work):** `e2e/flows.spec.ts` "correct tap"
test is RNG/timing-flaky (~1-in-6); passed 5/5 on isolated re-run and 6/6 on suite re-run.
Flagged for a separate hardening task.

**Owner to-do before any App Store step (deferred by design):** real-device audio/haptic
spot-check; Apple Developer enrollment + signing; store listing (draft in STORE_LISTING.md).

---

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
- [x] **T7 — E2E (Playwright) + screenshots.** tier→correct→celebration→wrong→gate→settings; capture
      marketing screenshots.
- [x] **T8 — Marketing landing page.** One-pager: "No ads. No data. No fail." using marketing frames.
- [x] **T9 — Launch collateral & docs.** README, PRIVACY (hosted page), STORE_LISTING.md, LICENSE,
      SWIFTUI-PORT.md, screenshot/preview guidance.
- [x] **T10 — CI/CD.** GitHub Actions: lint+test+build on PR; Pages deploy on main.
- [x] **T11 — Asset polish.** Wire remaining icons (voice/child/settings/lock/heart), iOS splash,
      dark wordmark CTA; `docs/ASSET-USAGE.md` (every asset mapped, no orphans).

## Ship workflow
- git init → seed commit on `main` → `gh repo create dsamin/counting-friends --public`.
- Feature branches → PRs (grouped by milestone) → CI green → merge.
- Enable GitHub Pages → app + privacy + marketing live.

## PR grouping (target)
- PR1: foundation (T1+T2+T3 core + tests)
- PR2: full playable app (T4+T5+T6) + component/e2e
- PR3: marketing + launch collateral + docs + CI/CD (T7+T8+T9+T10)

## Review section — COMPLETE ✅ (2026-06-17)

**Shipped:** a complete, tested, **live** installable PWA of Counting Friends.

- **Live app:** https://dsamin.github.io/counting-friends/
- **Marketing:** https://dsamin.github.io/counting-friends/about.html
- **Privacy:** https://dsamin.github.io/counting-friends/privacy.html
- **Repo:** https://github.com/dsamin/counting-friends (public)

**What was delivered**
- Faithful React+TS+Vite port of the prototype (every timing/constant extracted line-by-line and asserted).
- 155 unit/component tests + 6 Playwright e2e behavioral tests; CI (lint·typecheck·test·build·e2e) + Pages deploy.
- Offline-first PWA (self-hosted fonts, zero runtime network), reduce-motion + a11y (focus trap, aria-live, VoiceOver labels).
- All 49 assets used (audited in `docs/ASSET-USAGE.md`).
- Launch collateral: README, hosted privacy policy, App Store listing + Guideline 1.3 self-audit, proprietary LICENSE, SwiftUI port handoff.
- Verified rendering & playing in production (start → counting → celebration+confetti → auto-advance → no-fail → gate → settings).

**PRs:** #1 foundation · #2 full app · #3 launch · #4 asset polish — all CI-green and merged.

**Follow-ups for Devan before App Store**
- Replace placeholder contact email `hello@countingfriends.app` in `public/privacy.html` + `docs/STORE_LISTING.md`.
- Record real VO (browser TTS is the dev stand-in) per `docs/SWIFTUI-PORT.md` audio sheet.
- (Optional) transparent-background wordmark to avoid the faint white pill on the marketing hero.
- Native SwiftUI iPad build per `docs/SWIFTUI-PORT.md` (Xcode 26.3 available) for the App Store Kids launch.
