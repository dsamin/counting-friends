# Counting Friends — Native iPad App (Capacitor) Design Spec

**Date:** 2026-06-17
**Author:** Devan
**Status:** Reviewed (3 independent agents, all GO-WITH-FIXES) → corrections folded in §13 → approved for implementation
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
| R6 | **Rubber‑band scroll / overscroll** in WKWebView breaks the fixed full‑screen feel. | CSS only: lock body scroll (`overflow:hidden`, `overscroll-behavior:none`, `position:fixed`). NOTE: `ios.scrollEnabled` is **not** a valid Capacitor 7 config key — do not use it. | 3 |
| R7 | **Node 25 / npm 11 very new** — possible Capacitor engine warnings. | Pin Capacitor 7.x; treat warnings as non‑fatal; confirm `cap` CLI runs. | 2 |
| R8 | **Audio autoplay policy** — no sound before first gesture. | Existing design already gates audio behind taps; confirm in simulator. | 5 |
| R9 | **`ios/` artifacts bloat git** (Pods, build/). | `.gitignore` Pods/, build/, DerivedData; commit the project + Podfile. | 2 |

## 8. Phased implementation plan

Each phase ends with explicit, checkable **acceptance criteria** and a commit.

### Phase 0 — Toolchain & decisions
- Install CocoaPods via Homebrew (`brew install cocoapods` — bottled 1.16.x, brings its own Ruby, does **not** touch system Ruby 2.6.10, no source compile). Ensure `/opt/homebrew/bin` is on PATH (`which pod`).
- Confirm a target iPad simulator UDID (e.g., *iPad Pro 11" (M4)*).
- Record bundle id (`app.countingfriends.game`) / app name. Deployment target: Capacitor 7 floor is **iOS 14**; we pin Podfile `platform :ios, '16.0'` explicitly (don't assert 16 is "the floor").
- **Acceptance:** `pod --version` prints **≥ 1.16** (older 1.15.x mis-parses Xcode 16+/26 `.pbxproj`); `which pod` resolves; chosen simulator boots (`simctl boot` + `simctl list | grep Booted`).

### Phase 1 — Native‑safe dual build
- `vite.config.ts`: gate `VitePWA(...)` behind `process.env.CAP_BUILD !== '1'`; base already env‑driven.
- Add `cross-env` devDep; `package.json`: `"build:native": "cross-env CAP_BUILD=1 VITE_BASE=/ npm run build"` (reuses `build`, can't drift, cross-shell safe).
- **Acceptance:** `npm run build` → `dist/index.html` references `/counting-friends/…` and emits a service worker. `npm run build:native` → `dist/index.html` references root‑relative `/…` assets and emits **no** `sw.js`/`registerSW.js`. Plus two grep gates on the native `dist/`: `grep -rn "counting-friends" dist/` returns nothing, and `grep -rn "serviceWorker.register\|registerSW\|workbox" dist/` returns nothing. Existing `npm run test`, `npm run typecheck`, `npm run lint` still green.

### Phase 2 — Capacitor scaffolding
- Install (all `@capacitor/*` pinned to one 7.x minor; `@capacitor/cli` is a **devDep**, the rest are deps): `npm i @capacitor/core @capacitor/ios @capacitor/splash-screen @capacitor/status-bar @capacitor/haptics @capacitor/app` and `npm i -D @capacitor/cli`. Expect non-fatal `EBADENGINE` warnings under Node 25 — ignore.
- `capacitor.config.ts` (appId `app.countingfriends.game`, appName, webDir=`dist`, ios `backgroundColor:#FBF3DC`, SplashScreen/StatusBar plugin config). **Leave `server` unset** (default `capacitor://localhost` — correct for an offline bundled app; do NOT set `server.url`).
- `npx cap add ios` (runs `pod install`). Pin Podfile `platform :ios, '16.0'`.
- `.gitignore`: add `ios/App/Pods/`, `ios/App/App/public/`, `ios/App/App/capacitor.config.json` (generated on sync), `ios/App/build/`, `ios/DerivedData/`, `**/xcuserdata/`. Commit `Podfile` **and** `Podfile.lock`.
- **Acceptance:** `ios/App/App.xcworkspace` exists; `npx cap doctor` reports no `@capacitor/*` version skew; `npm run build:native && npx cap sync ios` completes; `ios/App/App/public/` contains the built web app.

### Phase 3 — Native UX integration
- Safe areas (per-element, NOT a single container — `PlayScreen` root is `position:absolute; inset:0` and escapes parent padding): apply `env(safe-area-inset-*)` to each absolutely-positioned chrome element. **Back button** offsets are inline in `BackButton.tsx` (`top:24,left:26`) and **ReplayPill** inline in `ReplayPill.tsx` (`top:22,left:50%`) → edit those inline styles to `max(<n>px, env(safe-area-inset-top))`. **Parental gate** is `.cf-gate` in `app.css` (`bottom:22,right:22`) → edit there. Verify both orientations in simulator.
- Lock scroll/overscroll via CSS only (`index.css` body: `overflow:hidden`, `overscroll-behavior:none`, `position:fixed`). `index.css` already has `overscroll-behavior:none` + `touch-action:manipulation`.
- Status bar: hide for immersive full‑screen kids UX (`StatusBar.hide()` on native at boot) — or style to match cream; decide after first simulator render.
- Splash: configure branded splash from `assets/launch/`; `SplashScreen.hide()` once React mounts.
- App icon + splash assets (OFF the critical path — `@capacitor/assets` shells out to sharp/sips and is the most Node-25-fragile step; nice-to-have, not load-bearing for "builds and runs"): try `npx @capacitor/assets generate --ios` with a `resources/icon.png` (≥1024²) + `resources/splash.png` (2732²) sourced from `assets/app-icon/`+`assets/launch/`. If it chokes, drop in a minimal `AppIcon.appiconset` manually and move on — do not let icon polish gate the phase.
- **Acceptance:** In the iPad simulator, no UI element is clipped by safe areas in portrait or landscape; the app launches to a branded splash that dismisses to the Start screen; the home‑screen icon is the Counting Friends mark (not the Capacitor default).

### Phase 4 — Native capability plugins
- **Haptics:** add `src/native/feedback.ts` exposing `celebrate()` / `tap()` guarded by `Capacitor.isNativePlatform()`. Wire `celebrate()` into the confetti `useEffect` in `PlayScreen.tsx:~69` (keyed on `status==='correct'`, fires once per round, and `reduceMotion` is already in scope → respects reduce-motion for free). Wire `tap()` (light) into `actions.tapAnimal` (`PlayScreen.tsx:~129`). No reducer/round-logic edits. Web = no‑op.
- **Audio probe + native TTS adapter (likely REQUIRED, not optional):** probe after the `voiceschanged` event (with timeout) — `getVoices()` is async and often empty on first synchronous call in WKWebView. Deterministic rule: `isNativePlatform() && getVoices().length === 0` → use native TTS. The adapter `src/native/capacitorTtsEngine.ts` is a **composite**, not a rewrite: native `speak()` wraps `@capacitor-community/text-to-speech` (swallow its Promise; call `onSpeakingChange(true)` before the await and `(false)` after — this drives the visible ReplayPill animation), `cancelSpeech()`→`stop()`, implement `setEnabled()`, and **delegate `ensureAudio/playPop/playWhoops/playChirp` to the existing `createWebAudioEngine()`**. Swap it in at the single instantiation site (`App.tsx:19`) behind the probe. Confirm `AudioContext.resume()` is called from the first touch handler.
- **Acceptance (observable proxies — an agent has no ears):** Correct answer triggers haptics on native. For voice, evidence is: (a) a logged voice-count probe, (b) the **ReplayPill speaking animation (`cf-replay--speaking`) visible in a screenshot** = proxy for "speech started", (c) `AudioContext.state === 'running'` logged after a tap. Final "does it sound right" is an explicit **human spot-check on the owner's machine**, not an agent deliverable. Web build unaffected (vitest green).

### Phase 5 — Build, run & verify (testing)
- Full native pipeline: `npm run build:native && npx cap sync ios`, then **primary** launch `npx cap run ios --target <UDID>` (handles destination + signing friction). **Fallback** (more reliable headless): `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPad Pro 11-inch (M4)' CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO -derivedDataPath ios/DerivedData build` → then `xcrun simctl install booted <App.app>` → `xcrun simctl launch booted app.countingfriends.game`. (Raw `xcodebuild` does NOT install/launch by itself, and WILL try to sign unless `CODE_SIGNING_ALLOWED=NO`.) First build is slow (minutes) + first 26.3 sim boot is cold — use long Bash timeouts, don't read as hang.
- **Functional smoke checklist** — each tagged by what evidence is honestly obtainable. `[SS]`=screenshot-verifiable, `[LOG]`=console/JS-probe-verifiable, `[HUMAN]`=owner spot-check (logic already covered by web e2e):
  1. `[SS]` App boots — no white screen (this is the key proof the base-path/SW fix worked). `[LOG]` no console errors.
  2. `[SS]` Start screen renders all three tiers.
  3. `[SS]` Enter a tier → animals render at correct size/count.
  4. `[HUMAN]` animal sound on tap (no ears); `[LOG]` AudioContext running + chirp invoked.
  5. `[SS]` confetti + `[SS]` ReplayPill speaking-animation + auto-advance; `[HUMAN]` praise audio; haptic verified by capability flag.
  6. `[SS]` wrong number → wobble + reask, count unchanged (no penalty); `[HUMAN]` whoops sound.
  7. `[HUMAN]`/web-e2e parental gate hold-3s (sustained-press not cleanly drivable via simctl); DOM logic already covered by Playwright e2e.
  8. `[SS]` Settings open; toggles persist across relaunch (WKWebView localStorage, NOT UserDefaults).
  9. `[SS]` Rotate portrait↔landscape → reflow, no safe-area clipping (before/after screenshots).
  10. `[SS]` Relaunch → last tier / settings restored.
- Capture simulator screenshots (`xcrun simctl io booted screenshot <file>.png`) for every `[SS]` item as evidence.
- **Regression gate:** `npm run typecheck && npm run lint && npm run test && npm run build && npm run e2e` all green (web untouched).
- **Acceptance:** all `[SS]`/`[LOG]` items verified with evidence; `[HUMAN]` items called out as owner spot-checks (not claimed as agent-verified); full web regression suite green. No overpromise of "audible".

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
not now): (a) status bar — **default to `StatusBar.hide()`** and move on (don't burn a
round-trip deliberating), (b) **Web Speech vs. native TTS** — decided by the boot probe;
native adapter is now treated as *probably required*, not a footnote.

---

## 13. Review feedback incorporated (3 independent agents, 2026-06-17)

All three reviewers (iOS/Capacitor specialist, architecture/codebase-fit, skeptic/risk)
returned **GO-WITH-FIXES** with strongly converging notes. Corrections folded into the
sections above; the substantive deltas:

1. **`build:native` script** → `cross-env CAP_BUILD=1 VITE_BASE=/ npm run build` (reuses
   `build`, portable). Added `cross-env` devDep. (§8 P1)
2. **Native-build verification hardened** → grep `dist/` for leftover `counting-friends`
   base and for any surviving `serviceWorker.register`/`workbox`/`registerSW`. (§8 P1)
3. **`ios.scrollEnabled` is NOT a real Capacitor 7 key** → removed; CSS-only scroll lock. (§7 R6, §8 P3)
4. **CocoaPods de-risked** → `brew install cocoapods` is bottled 1.16.x with its own Ruby
   (no system-Ruby/source-compile risk); verify `pod --version ≥ 1.16` + PATH. SPM rejected
   (more fragile on brand-new Xcode). (§5, §8 P0)
5. **Audio verification honesty (biggest fix)** → an agent has no ears; "audible"
   acceptance replaced with observable proxies (voice-count probe, the visible ReplayPill
   speaking-animation in a screenshot, `AudioContext.state==='running'`). Real sound is an
   explicit human spot-check. (§8 P4/P5)
6. **Native TTS adapter is likely REQUIRED and is a composite**, not a rewrite: native
   `speak`/`stop` + synthesized `onSpeakingChange` (drives ReplayPill) + `setEnabled`, while
   SFX delegate to the existing `createWebAudioEngine()`. Probe waits for `voiceschanged`.
   Lives in `src/native/capacitorTtsEngine.ts`; swapped at `App.tsx:19`. (§6, §8 P4)
7. **Safe-area insets are per-element** — Back button & ReplayPill are inline-positioned
   in their `.tsx`; `.cf-gate` is in `app.css`; `PlayScreen` root is `position:absolute;
   inset:0` and escapes container padding. Each absolute chrome element gets its own
   `env()` offset. (§8 P3)
8. **Haptics hook point pinned** to `PlayScreen.tsx:~69` (confetti effect, reduce-motion in
   scope) + `tap()` on `actions.tapAnimal`. (§8 P4)
9. **Launch sequence corrected** → `npx cap run ios` primary; `xcodebuild`+`simctl
   install`+`simctl launch` with `CODE_SIGNING_ALLOWED=NO` as the explicit fallback
   (raw `xcodebuild` neither installs/launches nor skips signing on its own). Long timeouts
   for first build/sim boot. (§8 P5)
10. **`@capacitor/assets` moved off the critical path** (Node-25-fragile); manual
    `.appiconset` fallback; icon polish must not gate Phase 3. (§8 P3)
11. **Native seams consolidated under `src/native/`** — `feedback.ts`, `bootNative.ts`
    (keeps `main.tsx` pure), `capacitorTtsEngine.ts`. (§6, §8 P3/P4)
12. **Capacitor hygiene** — all `@capacitor/*` same minor; `@capacitor/cli` devDep; `cap
    doctor` in P2 acceptance; leave `server` config default; `.gitignore` the generated
    `capacitor.config.json`, commit `Podfile.lock`. (§8 P2)
