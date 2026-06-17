# Counting Friends — Native SwiftUI Port Handoff

A concise engineering handoff for porting the Counting Friends PWA to a native SwiftUI
iPad app. Target: Xcode 26.3, iOS/iPadOS 17+, App Store Kids Category.

---

## 1. Context

**Why native.** The PWA is the live, shippable web version and the working reference. The
ultimate target is a native iPad app in the **App Store Kids Category** (age band 5 &
under, paid up front ~$3.99). Native buys us three things the web can't match: a clean
Kids-Category submission path, **Core Haptics** for tactile correct-tap delight, and the
last 10% of polish — instant launch, buttery 60fps particle bursts, reliable
pre-recorded voice instead of variable browser TTS.

**What does NOT change.** The behavior. The PWA, the prototype (`Counting Friends.dc.html`),
and `HANDOFF.md` are the spec. Every timing, every tier rule, every no-fail guarantee must
match exactly. Do not redesign — port.

**The non-negotiables** (from `HANDOFF.md` §2): no way to fail, wordless to play, voice
carries meaning, big forgiving targets, calm by default / joyful on success, adults behind
a gate, private by construction. Preserve all seven.

---

## 2. Codebase Overview — mapping the PWA to SwiftUI

The PWA keeps its game logic pure and platform-free, which makes the port mechanical. Map
each piece directly:

| PWA (TypeScript / React)                                   | Native (SwiftUI)                               | Notes                                                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/game/round.ts`                                        | A `Round` model struct + free functions        | `generateRound`, `tierMax`, `tierChoices`, `animalSize`, `confettiCount`, `praiseLine`, `promptLine` — port the math verbatim. |
| `src/game/gameState.ts` + `src/game/useGame.ts`            | An `@Observable final class RoundModel`        | The reducer + hook collapse into one observable model holding round state, timers, and the audio engine.                       |
| `src/game/constants.ts`                                    | A `Constants` enum / static values             | **Source of truth for all timings.** Copy every value exactly (see §3).                                                        |
| `src/components/Confetti.tsx`                              | `Canvas` + `TimelineView` particle burst       | SwiftUI `Canvas`+`TimelineView` does the 74-particle burst at 60fps; no SpriteKit needed.                                      |
| `src/audio/webAudioEngine.ts`                              | `AVAudioPlayer` with **pre-recorded VO**       | Replace browser speech synthesis with recorded clips. Keep the same trigger logic.                                             |
| `src/game/persistence.ts` (`cf_*` localStorage)            | `UserDefaults` with `cf_*` keys                | Same four keys, same meanings (see §3).                                                                                        |
| `src/components/CharacterSprite.tsx` / `CharacterDefs.tsx` | `Image`/vector views from `assets/characters/` | Use the SVG/PNG sprites; one shared spec keeps the four friends a family.                                                      |
| `src/components/ParentalGate.tsx`                          | A press-and-hold gate view                     | 3-second hold with a filling coral ring; reset on early release.                                                               |
| `src/screens/StartScreen.tsx`                              | `StartView` (wordless tier select)             | Three duck sizes = three tiers.                                                                                                |
| `src/screens/PlayScreen.tsx`                               | `PlayView` (the loop)                          | Animal field + number row + chrome.                                                                                            |
| `src/styles/tokens.css`                                    | A `Theme` of `Color`/font constants            | Palette + type below; tokens.css is the styling source of truth.                                                               |

---

## 3. The values that must not drift

These are copied verbatim from `src/game/constants.ts` and `HANDOFF.md`. They are the
single source of truth — read them from the file, do not retype from memory.

**Timings (ms)** — `src/game/constants.ts` `TIMING`:
`idle 6000` · `advance 1950` · `advanceReduceMotion 1400` · `wrongRevert 640` ·
`reask 760` · `gateHold 3000` · `popStagger 55` · `popInDuration 520` ·
`confettiFull 1450` · `confettiReduceMotion 900`.

**Confetti** — `CONFETTI`: `full 74` · `calm 34` · `sparkles 5` (reduce motion) ·
`gravity 0.17` · `drag 0.99` · palette `['#FFC94D','#FF8A7A','#9FD9A3','#A8D8E8','#FFFFFF','#FFB23E']`.

**Tiers** (from `round.ts`): Easy → max 5, 3 choices · Medium → max 10, 4 choices ·
Hard → max 20, 4 choices. `count = random 1..max`; choices = `{count} ∪ unique distractors`,
sorted ascending. The correct answer is always present.

**Animal sizing**: `size = round(clamp(58, 560 / sqrt(count), 160))` px — so a crowd of 20
still fits. Entrance `popIn` staggered 55ms/index, then idle `bob`.

**Persistence** — `UserDefaults`, keys exactly as the web:
`cf_tier` (easy/medium/hard) · `cf_name` (string) · `cf_rm` ('1'/'0') · `cf_voice` ('1'/'0').
Read on launch, write on change, never transmit.

**Characters**: Dot/Duck "Quack" · Pip/Cat "Meow" · Hopper/Frog "Ribbit" · Momo/Bunny
"Boing". One round-stroke spec (4px ink, dot eyes, blush cheeks).

**Palette**: Duck `#FFC94D` · Coral `#FF8A7A` · Frog `#9FD9A3` · Sky `#A8D8E8` ·
Cream `#FBF3DC` (raised faces `#FFFDF6`) · Ink `#5A4633` (the only outline/text color).
**Type**: Baloo 2 (numbers + display), Quicksand (adult UI).

---

## 4. Tasks

1. **Recreate the core loop.** New SwiftUI iPad project. Build `RoundModel` (`@Observable`):
   generate a count for the tier, render N animal views with the sizing formula, generate
   the choice set, wire tap → correct/wrong branch. **No scoring, no failure state.** Rapid
   taps during `correct` are ignored (early-return unless `asking`).
2. **Port the exact timings and constants** from `src/game/constants.ts` (see §3). Do not
   re-tune. The whole feel depends on these durations.
3. **Build the HERO celebration.** Correct tap → button turns duck-yellow and runs the
   squash-and-stretch, a `Canvas`+`TimelineView` confetti burst fires from the button
   center, recorded praise plays, then the next round auto-deals after `advance`.
4. **Build the no-fail micro-state.** Wrong tap → gentle `wrongWobble` (shrink + shimmy),
   soft "whoops" tone, revert after `wrongRevert`, re-speak prompt at `reask`. Status never
   leaves `asking`. No red, no buzzer, no "try again."
5. **Idle nudge.** Re-speak the prompt after `idle` (6000ms) of no interaction; re-arm each
   time.
6. **Drop in the icon set.** Use `assets/app-icon/ios/` straight into the
   `AppIcon.appiconset` (full slot set already rasterized). Inline the duck for any composed
   art — nested `<use>` was unreliable; not a concern for the PNG slots.
7. **Record the voice per the audio sheet** (`HANDOFF.md` §8). Numbers 1–20, prompt per
   animal, the praise stems (`You got it! / Yes! / Nice counting! / Hooray! / Well done! /
So clever!`), animal sounds, and the whoops/pop SFX. Compose celebration audio at runtime
   (number clip + praise stem + optional name) — do not record every combination. The
   optional custom name can use `AVSpeechSynthesizer` on-device.
8. **Parental gate.** Press-and-hold dot, 3s, filling coral ring, resets on early release.
   Guards the settings/about sheet **and** the optional child-name field. Nothing grown-up
   sits outside it.
9. **Reduce motion.** Default the toggle from the OS setting; when on, confetti → 5 calm
   sparkles, no pop/bob, auto-advance shortens to `advanceReduceMotion`.
10. **VoiceOver.** Labels on number buttons ("number three"); the confetti canvas is
    decorative (`accessibilityHidden`); feedback never relies on color alone.
11. **Both orientations.** Landscape-first; portrait reflows the number row into a 2×2
    cluster.
12. **(v2) Core Haptics** on correct taps for tactile delight.

---

## 5. File locations

| Need                                      | Path                                              |
| ----------------------------------------- | ------------------------------------------------- |
| Game logic to port (source of truth)      | `src/game/round.ts`, `gameState.ts`, `useGame.ts` |
| **Timings / confetti / speech constants** | `src/game/constants.ts`                           |
| Persistence keys + meanings               | `src/game/persistence.ts`                         |
| Characters + sounds                       | `src/game/characters.ts`, `assets/characters/`    |
| Confetti reference implementation         | `src/components/Confetti.tsx`                     |
| Audio trigger logic                       | `src/audio/webAudioEngine.ts`                     |
| Behavior spec (the bible)                 | `HANDOFF.md`                                      |
| Product / launch spec                     | `10-counting-friends.md`                          |
| Design tokens (palette, type, motion)     | `src/styles/tokens.css`, `src/styles/app.css`     |
| iOS app icon slots (ready)                | `assets/app-icon/ios/`                            |
| Full asset inventory                      | `assets/README.md`                                |
| Store copy + Guideline 1.3 audit          | `docs/STORE_LISTING.md`                           |

---

## 6. Acceptance criteria

- **Behavior matches the PWA and `HANDOFF.md` exactly** — same tiers, same round
  generation (correct answer always present, distractors unique and in range, choices
  sorted), same animal sizing, same timings, same celebration and no-fail micro-state.
- **No way to fail** — verified: no score, timer, streak, red X, or buzzer anywhere; a
  wrong tap is fully reversible and the round stays live.
- **Wordless to play** — a non-reader can start and play; no child-facing text.
- **Private by construction** — only the four `cf_*` `UserDefaults` keys are written;
  nothing is transmitted; no third-party SDKs; App Privacy stays "Data Not Collected."
- **Accessibility** — Reduce Motion downgrade works, VoiceOver labels present, large
  targets, color-independent feedback.
- **Passes the Guideline 1.3 self-audit** in `docs/STORE_LISTING.md` (parental gate guards
  every grown-up affordance, zero child-facing outbound links, privacy URL live).
- **Recorded VO** replaces browser TTS; celebration audio composed at runtime.
