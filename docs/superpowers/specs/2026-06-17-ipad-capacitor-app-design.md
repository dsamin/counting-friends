# Counting Friends — Native iPad App (Capacitor) Design Spec

**Date:** 2026-06-17
**Author:** Devan
**Status:** Draft → under agent review
**Branch:** `feat/ipad-capacitor`

---

## 1. Context

Counting Friends is a live, installable **React 18 + TypeScript + Vite PWA** (GitHub
Pages, `https://dsamin.github.io/counting-friends/`). It is a wordless, no‑fail
tap‑to‑count game for pre‑readers (ages 2–5). The codebase is clean and well‑tested:
pure game logic in `src/game/`, an `AudioEngine` interface, 148 unit/component tests
(Vitest) + 6 Playwright e2e tests, CI + Pages deploy via GitHub Actions.

The owner loves the PWA and wants to **keep it working on the web**, but also wants a
**genuine native iPad app** that can eventually be published to the App Store.

## 2. Goal (this build)

Produce a **native iPadOS application that builds and runs on the iPad Simulator**,
wrapping the existing PWA via **Capacitor**, with native polish (safe areas, splash,
status bar, haptics) — while the web PWA continues to build, test, and deploy with **zero
regression**. The native project must be architected so a future App Store submission is
a small, well‑documented step.

## 3. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | **Capacitor wrapper** | One codebase ships both the live web PWA and a real native `.app`. Reuses 100% of tested game code. Lowest risk, honors "works on the internet" + "publishable iPad app". |
| Publish endpoint (this build) | **Runs on iPad Simulator; store work deferred** | Simulator needs no Apple Developer account or code signing. Architecture stays submission‑ready. |
| Target device | **iPad (universal layout)** | Game is iPad‑first; layout is flexbox‑responsive. Build the iOS project as iPad‑capable; do not invest in iPhone‑specific tuning now. |
| Bundle identifier | `app.countingfriends.game` | Reverse‑DNS, stable, store‑ready. |
| App display name | `Counting Friends` | Matches PWA. |

## 4. Non‑negotiables / constraints

1. **No web regression.** `npm run build` (web, base `/counting-friends/`, service
   worker ON) and all existing tests (vitest, e2e, typecheck, lint) keep passing
   unchanged. The GitHub Pages deploy path is untouched.
2. **Game logic untouched.** `src/game/` stays platform‑free and fully tested. Native
   capabilities attach through existing seams (the `AudioEngine` interface; a small
   feedback hook), never by editing core reducers/round logic.
3. **Graceful degradation.** Every native plugin call is guarded so the web build is a
   no‑op (or uses the existing web implementation). The same React tree runs in browser
   and WKWebView.
4. **Offline + zero‑data preserved.** No new network calls. The app remains fully
   offline and collects no data.
5. **Minimal surface area.** Capacitor config + the generated `ios/` project are additive.
   No churn to unrelated files.

## 5. Environment preflight (verified 2026-06-17)

- macOS 26.5 (arm64); **Xcode 26.3** (build 17C529); `xcode-select` → full Xcode. ✅
- Node v25.4.0 / npm 11.7.0. ✅
- iOS Simulator runtimes: 18.3, 18.4, **26.3**; full iPad simulator set (iPad Pro 11"/13" M4/M5, iPad Air M2/M3, iPad A16, iPad mini A17 Pro). ✅
- **CocoaPods: NOT installed** (`pod` not found); system Ruby 2.6.10 too old for a clean `gem install`. **Mitigation:** `brew install cocoapods` (Homebrew present at `/opt/homebrew/bin/brew`). ⚠️→resolved in Phase 0.
- `vite.config.ts` reads `process.env.VITE_BASE ?? '/counting-friends/'` → base path is overridable for native. ✅
- `index.html` viewport already has `viewport-fit=cover`. ✅

## 6. Architecture overview

```
                         ┌────────────────────────────────────┐
                         │        src/ (React + game logic)     │  ← single source of truth, unchanged
                         └───────────────┬──────────────────────┘
                                         │ vite build
              VITE_BASE=/counting-friends/         VITE_BASE=/  +  CAP_BUILD=1
              PWA service worker ON                PWA service worker OFF
                         │                                   │
                ┌────────▼─────────┐               ┌──────────▼──────────┐
                │ dist/ (web)      │               │ dist/ (native)      │
                │ → GitHub Pages   │               │ → npx cap sync ios  │
                └──────────────────┘               └──────────┬──────────┘
                                                              │
                                                   ┌──────────▼──────────┐
                                                   │ ios/App (Xcode proj) │
                                                   │  WKWebView + plugins │
                                                   │  → iPad Simulator    │
                                                   └─────────────────────┘
```

**Dual‑target build.** A single `dist/` is produced by two build modes selected by env:
- **Web:** existing `npm run build` → base `/counting-friends/`, vite‑plugin‑pwa ON.
- **Native:** new `npm run build:native` → `CAP_BUILD=1 VITE_BASE=/ vite build` → base
  `/` (required because Capacitor serves from `capacitor://localhost`), vite‑plugin‑pwa
  **OFF** (a service worker inside WKWebView causes stale‑cache white‑screens and is
  redundant — the native app already bundles assets locally).

`capacitor.config.ts`: `appId: app.countingfriends.game`, `appName: Counting Friends`,
`webDir: dist`, iOS `backgroundColor: #FBF3DC`, splash + status‑bar config.

**Native capability seams (no core‑logic edits):**
- **Haptics** → a `feedback` module called where the win celebration already fires; web = no‑op via `Capacitor.isNativePlatform()` guard (or `@capacitor/haptics` web fallback).
- **Audio/TTS** → if WKWebView `speechSynthesis` proves unreliable, add a native TTS adapter that satisfies the existing `AudioEngine` interface (`@capacitor-community/text-to-speech`). Chosen by runtime probe; web keeps Web Speech.
- **Splash / status bar** → `@capacitor/splash-screen`, `@capacitor/status-bar`, invoked once at app boot from `main.tsx` behind a native guard.

## 7. Key technical risks & mitigations

| # | Risk | Mitigation | Phase |
|---|---|---|---|
| R1 | **Base path** — assets 404 in WKWebView if built with `/counting-friends/`. | `build:native` sets `VITE_BASE=/`. Verify built `index.html` references root‑relative assets. | 1 |
| R2 | **Service worker** in WKWebView → stale white‑screen, navigation interception. | Disable vite‑plugin‑pwa when `CAP_BUILD=1`. | 1 |
| R3 | **CocoaPods missing.** | `brew install cocoapods`; verify `pod --version`. | 0 |
| R4 | **WKWebView `speechSynthesis`** historically flaky on iOS web views. | Runtime probe; fall back to `@capacitor-community/text-to-speech` behind `AudioEngine`. SFX (WebAudio) verified to resume after first touch gesture. | 4/5 |
| R5 | **Safe areas** — top‑left Back button / bottom‑right parental gate clipped by rounded corners / home indicator. | `env(safe-area-inset-*)` padding on app chrome; `viewport-fit=cover` already present. | 3 |
| R6 | **Rubber‑band scroll / overscroll** in WKWebView breaks the fixed full‑screen feel. | Lock body scroll (`overflow:hidden`, `overscroll-behavior:none`), Capacitor `ios.scrollEnabled:false`. | 3 |
| R7 | **Node 25 / npm 11 very new** — possible Capacitor engine warnings. | Pin Capacitor 7.x; treat warnings as non‑fatal; confirm `cap` CLI runs. | 2 |
| R8 | **Audio autoplay policy** — no sound before first gesture. | Existing design already gates audio behind taps; confirm in simulator. | 5 |
| R9 | **`ios/` artifacts bloat git** (Pods, build/). | `.gitignore` Pods/, build/, DerivedData; commit the project + Podfile. | 2 |

## 8. Phased implementation plan

Each phase ends with explicit, checkable **acceptance criteria** and a commit.

### Phase 0 — Toolchain & decisions
- Install CocoaPods via Homebrew; verify `pod --version`.
- Confirm a target iPad simulator UDID (e.g., *iPad Pro 11" (M4)*).
- Record bundle id / app name / min iOS (target **iOS 16+**, matching Capacitor 7 floor).
- **Acceptance:** `pod --version` prints a version; chosen simulator boots (`simctl boot` + `simctl list | grep Booted`).

### Phase 1 — Native‑safe dual build
- `vite.config.ts`: gate `VitePWA(...)` behind `process.env.CAP_BUILD !== '1'`; base already env‑driven.
- `package.json`: add `"build:native": "CAP_BUILD=1 VITE_BASE=/ tsc --noEmit && CAP_BUILD=1 VITE_BASE=/ vite build"` (mirror the typecheck+build of `build`).
- **Acceptance:** `npm run build` → `dist/index.html` references `/counting-friends/…` and emits a service worker. `npm run build:native` → `dist/index.html` references root‑relative `/…` assets and emits **no** `sw.js`/`registerSW.js`. Existing `npm run test`, `npm run typecheck`, `npm run lint` still green.

### Phase 2 — Capacitor scaffolding
- Install `@capacitor/core @capacitor/cli @capacitor/ios` (v7.x) + plugins `@capacitor/splash-screen @capacitor/status-bar @capacitor/haptics @capacitor/app`.
- `capacitor.config.ts` (appId, appName, webDir=dist, ios backgroundColor, server hostname defaults, SplashScreen/StatusBar plugin config).
- `npx cap add ios` (runs `pod install`).
- `.gitignore`: add `ios/App/Pods/`, `ios/App/App/public/`, `ios/App/build/`, `ios/DerivedData/`, `*.xcworkspace/xcuserdata/`.
- **Acceptance:** `ios/App/App.xcworkspace` exists; `npm run build:native && npx cap sync ios` completes without error; `ios/App/App/public/` contains the built web app.

### Phase 3 — Native UX integration
- Safe areas: add `env(safe-area-inset-*)` padding to the app chrome containers (Back button cluster top‑left; parental gate dot bottom‑right) in `app.css`; verify via simulator both orientations.
- Lock scroll/overscroll (`index.css` body rules; `capacitor.config.ts` `ios.scrollEnabled:false`).
- Status bar: hide for immersive full‑screen kids UX (`StatusBar.hide()` on native at boot) — or style to match cream; decide after first simulator render.
- Splash: configure branded splash from `assets/launch/`; `SplashScreen.hide()` once React mounts.
- App icon + splash asset generation: `@capacitor/assets generate --ios` from `assets/app-icon/` master (+ a splash source). Falls back to manual `AppIcon.appiconset` if the tool misbehaves.
- **Acceptance:** In the iPad simulator, no UI element is clipped by safe areas in portrait or landscape; the app launches to a branded splash that dismisses to the Start screen; the home‑screen icon is the Counting Friends mark (not the Capacitor default).

### Phase 4 — Native capability plugins
- **Haptics:** add `src/native/feedback.ts` exposing `celebrate()` / `tap()` guarded by `Capacitor.isNativePlatform()`; wire `celebrate()` to the existing correct‑answer celebration path (alongside confetti) and `tap()` (light) to a correct selection. Respect the existing reduce‑motion / settings posture (no haptics if motion reduced). Web = no‑op.
- **Audio probe:** at boot, probe `speechSynthesis` voice availability in WKWebView. If empty/unreliable, route TTS through a `CapacitorTtsEngine` adapter implementing `AudioEngine`. SFX stay on WebAudio; confirm `AudioContext` resumes on first touch.
- **Acceptance:** Correct answer triggers a haptic on device/simulator‑reported capability; voice prompt and praise are audible in the simulator (via Web Speech or native TTS fallback); SFX play after first tap. Web build unaffected (vitest green).

### Phase 5 — Build, run & verify (testing)
- Full native pipeline: `npm run build:native && npx cap sync ios && xcodebuild` (or `npx cap run ios --target <UDID>`) → install + launch on the iPad simulator.
- **Functional smoke checklist** (manual‑equivalent, evidence captured):
  1. App boots — no white screen, no console errors.
  2. Start screen renders all three tiers.
  3. Enter a tier → animals render at correct size/count.
  4. Tap an animal → animal sound + chirp.
  5. Tap correct number → confetti + praise + haptic + auto‑advance.
  6. Tap wrong number → wobble + whoops + reask (no penalty).
  7. Parental gate: hold 3s → settings open; release early resets.
  8. Settings: name, voice toggle, reduce‑motion toggle persist (UserDefaults via WKWebView localStorage).
  9. Rotate portrait↔landscape → layout reflows, no clipping.
  10. Relaunch → last tier / settings restored.
- Capture simulator screenshots (`simctl io … screenshot`) as evidence.
- **Regression gate:** `npm run typecheck && npm run lint && npm run test && npm run build && npm run e2e` all green (web untouched).
- **Acceptance:** All 10 checklist items pass with screenshot evidence; full web regression suite green.

### Phase 6 — Docs & publish‑readiness handoff
- `docs/IPAD-APP.md`: how to build/run native (`build:native` → `cap sync` → run), architecture, the base‑path/SW/safe‑area gotchas, plugin inventory, simulator UDIDs.
- Note the **deferred** App Store path (existing `docs/STORE_LISTING.md` + signing/account) as the documented next step — not executed.
- Update `tasks/todo.md` review section and the project memory file.
- **Acceptance:** A new engineer can `git clone`, run two commands, and launch the app in the simulator using only `docs/IPAD-APP.md`.

## 9. Testing strategy

- **Existing automated suites are the regression net** — they must stay green at every phase (game logic is unchanged, so they should).
- **Native build smoke** is added to the verification routine (`build:native` + `cap sync` must succeed).
- **Simulator functional verification** is the new acceptance evidence for native behavior (screenshots + the 10‑point checklist). XCUITest is out of scope for this milestone (manual‑equivalent simulator run is sufficient and far cheaper).
- No changes to test framework, thresholds, or CI required for this milestone (native CI is a future item).

## 10. Out of scope (explicitly deferred)

- Apple Developer Program enrollment, code signing, provisioning, notarization.
- App Store Connect listing, screenshots upload, privacy nutrition labels, review submission.
- Physical‑device deployment (needs at least a free personal signing team).
- iPhone‑specific layout tuning.
- Native CI/CD (building the `.ipa` in GitHub Actions).
- Replacing browser‑TTS with professionally recorded VO (tracked separately).

## 11. Git / rollback strategy

- All work on `feat/ipad-capacitor`; one commit per phase with clear messages.
- The web build/deploy path is never modified destructively; if any native change risks
  the web app, it is gated by `CAP_BUILD`/`isNativePlatform()` so reverting is trivial.
- Rollback = abandon branch; `main` (the live PWA) is unaffected throughout.

## 12. Open questions

None blocking. Two judgment calls are deferred to first simulator render (decided then,
not now): (a) **hide vs. style** the status bar, (b) **Web Speech vs. native TTS** —
both have working fallbacks specified above.
