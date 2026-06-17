# Counting Friends — Engineering & Design Handoff

> A no-fail counting game for children ages 2–5 (iPad-first). This document is the
> single source of truth for an engineer or agent picking up the project. It explains
> **what** the app is, **why** every decision was made, and **exactly how** each piece
> behaves, with the concrete values needed to reproduce it.

There are two reference files already in this project. Read them alongside this doc — they
are the working prototype, and every number below is drawn from them:

| File | What it is |
|---|---|
| `Counting Friends.dc.html` | The full **playable app** — all states wired (tier select → counting → celebration → no-fail → parental gate → settings). |
| `Counting Friends — Brand & Assets.dc.html` | The **production asset sheet** — app icon, logo lockups, character set, palette/type, launch screen, App Store marketing frames, UI icons. |

Both are Design Components (`.dc.html`). The runtime (`support.js`) is provided by the
platform; if porting to a native/React app, treat the `.dc.html` files as the spec, not
the deliverable.

### Exported asset library

The graphics are also exported as standalone, production-ready files:

| Path | Contents |
|---|---|
| `assets/` | All vector **SVG** sources + **PNG** exports — app icon (full iOS slot set), characters, UI icons, logo lockups, launch screen, App Store marketing frames. See `assets/README.md` for the full tree and per-asset notes. |
| `css/tokens.css` | Design tokens (color, type, shape, elevation, motion) + all `@keyframes`. Import first. |
| `css/app.css` | Component classes (`.cf-number`, `.cf-tier-card`, `.cf-animal`, `.cf-replay`, `.cf-gate`, `.cf-switch`, …) reproducing the prototype's look from the tokens. |

Vector is the source of truth; re-export PNGs from SVG at any size. Text-bearing assets
(logo, launch, marketing) reference Baloo 2 — outline the text or keep the supplied PNGs
for font-independent delivery.

---

## 1. Product in one paragraph

A toddler taps a friendly animal "friend," is asked **"How many?"**, and taps the matching
number. A correct tap explodes into confetti, a squash-and-stretch celebration, and a warm
spoken **"Three! You got it!"** A wrong tap does nothing punishing — the number gently
wobbles back and the prompt repeats. There is **no score, no timer, no losing, no ads, no
data collection, and no reading required to play.** Every session is a string of small wins.

---

## 2. Design principles (the non-negotiables)

These drove every decision. Preserve them.

1. **No way to fail.** No score, lives, stars-earned, timers, or "wrong" red X. A wrong tap
   is a soft, reversible micro-event, not a penalty. The child can tap forever.
2. **Wordless to play.** A pre-reader must be able to start and play with zero literacy.
   All required actions are conveyed by pictures, size, color, and voice — never text.
   Text exists **only** in the grown-up settings area.
3. **Voice carries meaning, not decoration.** The mascot speaks the prompt and the praise,
   so the child always knows what to do and feels celebrated by name.
4. **Big, forgiving targets.** Every tappable element is ≥ 88px (well above the 44pt
   minimum) because the hands are small and imprecise.
5. **Calm by default, joyful on success.** The resting state is soft and quiet; energy is
   spent on the celebration so the win feels earned.
6. **Adults stay behind a gate.** Settings sit behind a 3-second press-and-hold so little
   fingers can't wander out of play. No external links reachable by a child.
7. **Private by construction.** Nothing leaves the device. The only stored values are
   local preferences (tier, name, motion, voice).

---

## 3. Screen / state map

The app is a small state machine. Two top-level **screens** (`start`, `play`) plus overlays.

```
                ┌─────────────────────────────────────────────┐
                │                 START SCREEN                  │
                │   Wordless tier select: 3 ducks, S / M / L    │
                │   (1 dot / 2 dots / 3 dots under each)        │
                └───────────────┬───────────────────────────────┘
                                │ tap a duck → pick(tier)
                                ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                          PLAY SCREEN                                │
   │                                                                      │
   │   ┌──────────── round loop (generateRound) ────────────┐           │
   │   │  status:'asking'                                     │           │
   │   │   • N animals enter (popIn) + idle bob               │           │
   │   │   • mascot speaks "How many <plural>?"               │           │
   │   │   • bottom row shows number choices                  │           │
   │   │                                                       │           │
   │   │   child taps a number ──────────────┐                │           │
   │   │     ├─ correct → status:'correct'    │                │           │
   │   │     │    squashPop + confetti +       │                │           │
   │   │     │    spoken praise → (delay) ─────┼─► next round   │           │
   │   │     └─ wrong → wrongWobble + whoops,  │                │           │
   │   │          revert after 640ms, re-ask   │                │           │
   │   └───────────────────────────────────────┘               │           │
   │                                                            │           │
   │   Chrome: [back ◄] top-left · [mascot replay] top-center   │           │
   │           [parental-gate dot] bottom-right                 │           │
   └──────────────────────────────────────────────────────────────────────┘
                                │ hold gate 3s
                                ▼
                ┌─────────────────────────────────────────────┐
                │           SETTINGS OVERLAY (grown-ups)         │
                │   child name · reduce motion · mascot voice    │
                └─────────────────────────────────────────────┘
```

**State shape (from the prototype):**

```js
{
  screen: 'start' | 'play',
  tier: 'easy' | 'medium' | 'hard',
  count: <int>,                 // the correct answer this round
  animal: {key, plural, sound, href},
  choices: [<int>...],          // number buttons, sorted ascending, includes count
  status: 'asking' | 'correct',
  animatingValue: <int|null>,   // which button is mid-animation
  animType: 'correct' | 'wrong' | null,
  gateProgress: 0..1,           // parental-gate hold ring
  settingsOpen: <bool>,
  childName: <string>,
  reduceMotion: <bool>,
  voiceOn: <bool>,
  speaking: <bool>,             // drives the replay button's sound bars
}
```

---

## 4. Screen-by-screen spec

### 4.1 Start screen (tier select) — wordless

- Background: full-bleed storybook scene (sky gradient → green hills → ground), a sun
  top-left and a soft cloud. Reused on every screen so the world feels continuous.
- Title lockup: **"Counting Friends"** in Baloo 2 800 (60px), "Friends" in coral, with a
  floating duck mascot beside it. Subtitle "Pick a friend to start counting" is for the
  hovering adult; the child reads the **picture cue** instead.
- Three white rounded cards, each a duck at a **different size** = the difficulty metaphor:
  - **Easy** — small duck (96px), **1 coral dot**, range **1–5**, **3** number choices.
  - **Medium** — medium duck (134px), **2 dots**, range **1–10**, **4** choices.
  - **Hard** — large duck (176px), **3 dots**, range **1–20**, **4** choices.
- Cards lift on hover/press (`translateY(-7px)`). Tap → `pick(tier)` → enter play.
- Bigger duck = bigger numbers is an intuitive, languageless mapping a 3-year-old grasps.

### 4.2 Play screen — the counting loop

Layout, top to bottom:

1. **Top chrome** (96px reserved band):
   - **Back button** (top-left, 60px circle): returns to start, cancels timers + speech.
   - **Mascot replay pill** (top-center): a duck + 3 animated "sound bars." Tapping it
     **re-speaks the prompt** ("How many ducks?"). The bars animate (`soundbar`) only while
     `speaking` is true, giving a visible "I'm talking" affordance.
2. **Animal field** (flex-wrap, centered): `count` copies of the round's animal. Sizing is
   adaptive so a crowd of 20 still fits:
   `size = round( clamp(58, 560 / sqrt(count), 160) )` px.
   Each animal enters with a staggered `popIn` (55ms per index) then loops a gentle `bob`.
   **Tapping any animal** plays a chirp + speaks that animal's sound ("Quack!", "Meow!",
   "Ribbit!", "Boing!") — rewarding exploration and reinforcing the count target.
3. **Number choices** (bottom row, ≥130px each, Easy uses 152px): the answer set. Big
   Baloo 2 numerals on cream rounded-square buttons with a hard bottom shadow (chunky,
   pressable). Press depresses (`translateY(5px)`).

### 4.3 Correct answer — the HERO moment

This is where the app spends its delight budget. On a correct tap:

1. Button turns **duck-yellow** and runs `squashPop` (720ms): scale 1 → 1.3×0.76 →
   0.84×1.2 → settle. Classic squash-and-stretch = "alive."
2. **Confetti** bursts from the tapped button's center on a full-screen `<canvas>` overlay
   (see §7). Stars + rects + circles in the brand palette, with gravity.
3. **Voice praise**: number word + random praise + optional name, e.g.
   *"Three! Nice counting, Jayden!"* (name only if set in settings).
4. After **1950ms** (or **1400ms** if reduce-motion), `generateRound()` deals the next
   round automatically. The child never has to press "next."

### 4.4 Wrong answer — the no-fail micro-state

- Button runs `wrongWobble` (600ms): a small shrink + left-right shimmy. **No color change,
  no red, no sound of failure** — just a soft "whoops" two-note descending tone.
- After **640ms** the button reverts to normal; the same round stays on screen.
- At **760ms** the prompt re-speaks so the child is re-oriented, not stranded.
- `status` never leaves `'asking'` on a wrong tap — the round is still live.

### 4.5 Idle nudge

- While on the play screen, asking, and settings closed: if **6000ms** pass with no
  interaction, the mascot re-speaks the prompt. Re-arms each time. Keeps a distracted
  toddler gently on-task without nagging.

### 4.6 Parental gate

- A small, low-contrast dot sits bottom-right. It is **press-and-hold for 3000ms**, not a
  tap — a deliberate adult gesture. A coral progress ring fills around it as you hold
  (`requestAnimationFrame`, `gateProgress` 0→1). Releasing early resets it to 0.
- On completion → `settingsOpen = true`. This satisfies "keep settings away from children"
  without a math question (which excludes non-reading parents) or a dark pattern.

### 4.7 Settings overlay ("For grown-ups")

Text is allowed here — this screen is explicitly for adults. Contents:

- **Child's name** (optional text input). Celebrations use it ("…, Jayden!"). Copy states:
  *"Stays on this device — never sent anywhere."*
- **Reduce motion** toggle — calmer celebration (see §6/§7).
- **Mascot voice** toggle — speech on/off.
- A reassurance chip: **"No ads · No in-app purchases · No data collected · No way to fail."**
- Close (×) returns to play. Dismissing does not interrupt the current round.

---

## 5. Visual design system

### 5.1 Color

| Token | Hex | Use |
|---|---|---|
| Duck (primary) | `#FFC94D` | Duck, correct-button fill, sun, accents |
| Coral | `#FF8A7A` | Cat, brand accent ("Friends"), tier dots, hearts |
| Frog | `#9FD9A3` | Frog, success toggles, "no fail" frame |
| Sky | `#A8D8E8` | Bunny, sky accents |
| Cream | `#FBF3DC` | App background, button faces (`#FFFDF6` for raised faces) |
| Ink | `#5A4633` | **The only outline/text color.** Warm dark brown, never pure black. |

Scene gradients: sky `#BBE5F1 → #DDEFEC`; ground `#C7E8B2`; hills `#A6DCA0` / `#B7E2AE`.
Everything is warm and desaturated except the celebration — pure black is avoided
everywhere to keep the world soft.

### 5.2 Type

- **Baloo 2** (700/800) — display, the wordmark, **all numbers**, character names. Rounded,
  friendly, high-legibility numerals.
- **Quicksand** (500/600/700) — UI labels, settings, adult-facing copy.
- Load via Google Fonts. Number glyphs are the workhorse — test 1–20 at large sizes.

### 5.3 Shape & elevation

- Generous radii everywhere (buttons ~34px, cards 24–28px, pills fully rounded).
- Signature button look: **cream face + 5px ink outline + hard offset bottom shadow**
  (`0 8px 0 rgba(90,70,51,.16)`), pressing reduces the offset. Reads as physical/chunky,
  which toddlers find tappable. No soft blurry drop shadows on interactive elements.
- All animal art shares one spec: **4px ink stroke, round joins/caps, dot eyes, blush
  cheeks.** This is what makes 4 different animals read as one family. Keep it if you add
  more friends.

### 5.4 Characters

| Name | Animal | href | Sound | Card tint |
|---|---|---|---|---|
| Dot | Duck | `#duck` | "Quack!" | `#FFF6E0` |
| Pip | Cat | `#cat` | "Meow!" | `#FFEDE9` |
| Hopper | Frog | `#frog` | "Ribbit!" | `#EAF6E8` |
| Momo | Bunny | `#bunny` | "Boing!" | `#E6F3F8` |

All four are inline `<symbol>` SVGs (viewBox `0 0 100 100`). **Note:** nested
`<use href="#otherSymbol">` inside a `<symbol>` does **not** render reliably (it failed in
the app icon) — inline the paths directly when composing a character into another graphic.

---

## 6. Motion spec

All keyframes from the prototype. Durations matter — they're tuned for "alive but calm."

| Name | What | Spec |
|---|---|---|
| `popIn` | Animal entrance | scale .15→1.14→1, 520ms, `cubic-bezier(.34,1.56,.64,1)`, staggered 55ms/index |
| `bob` | Animal idle float | translateY 0→-9px→0, 2400–3450ms, infinite, starts after entrance |
| `squashPop` | Correct button | scale squash/stretch sequence, 720ms |
| `wrongWobble` | Wrong button | shrink + ±8px shimmy, 600ms |
| `soundbar` | Replay-pill bars | scaleY 0.4↔1, only while `speaking` |
| `floaty` | Start-screen mascot | translateY + slight rotate, 3.2s infinite |

**Reduce motion** (settings toggle): animals appear with `animation:none` (no pop/bob),
confetti collapses to **5 soft sparkle stars** instead of a 74-particle burst, and the
auto-advance shortens to 1400ms. The celebration still *happens* — it's just calmer.

---

## 7. Confetti (canvas) detail

- A full-bleed `<canvas>` overlay (`pointer-events:none`, above content). Sized to its
  client box × devicePixelRatio (capped at 2) and re-sized on resize.
- On correct tap, origin = tapped button's center (falls back to lower-center).
- Particle count: **74** (full) / **34** (`confettiDensity:'calm'` prop) / **5** sparkle
  stars (reduce motion). Shapes: rect, circle, 5-point star. Palette = brand colors + white.
- Physics: initial radial velocity + upward kick, gravity `+0.17`/frame, horizontal drag
  `×0.99`, rotation. Alpha fades over life. Duration **1450ms** (full) / **900ms** (rm).
- Implemented with `requestAnimationFrame`; clears the canvas when done.

---

## 8. Audio

Two independent systems, both gated by user gesture (browser autoplay policy — first tap
resumes the AudioContext / unlocks speech).

### 8.1 Voice (Web Speech / `SpeechSynthesis`)
- Prompt: **"How many `<plural>`?"** spoken on each new round and on replay-pill tap.
- Praise: **`<NumberWord>! <Praise><, name>`** on correct. Words array = zero…twenty;
  praise pool = `You got it! / Yes! / Nice counting! / Hooray! / Well done! / So clever!`.
- Animal tap speaks the animal's `sound`.
- Tuning: `rate 0.92`, `pitch 1.18`, prefers an English female-ish voice
  (Samantha/Karen/Moira/etc.), falls back to any en voice.
- `speaking` state toggles on utterance start/end → drives the sound-bar animation.
- **Production note:** browser TTS voice quality/availability varies by device. For ship
  quality, replace with **pre-recorded VO** (one warm voice actor): numbers 1–20, the
  prompt per animal, the praise lines, and the animal sounds. Keep the same trigger logic.

### 8.2 Sound effects (WebAudio oscillators)
- `playPop` — C–E–G rising arpeggio on correct.
- `playWhoops` — two-note descending on wrong (gentle, not a buzzer).
- `playChirp` — quick two-note on animal tap.
- These are synthesized so the prototype needs no asset files. Production can swap in
  recorded SFX, but the synth versions are intentionally soft and ship-acceptable.

---

## 9. Round generation logic

```
max      = easy:5  | medium:10 | hard:20
nChoices = easy:3  | medium:4  | hard:4
count    = random 1..max
animal   = random of the 4
choices  = {count} ∪ random uniques up to nChoices, sorted ascending
```
The correct answer is always present; distractors are unique and within range; choices are
sorted so position carries no "the answer is always here" pattern.

---

## 10. Persistence

`localStorage`, namespaced `cf_*`. Read on boot, written on change. **Never** store anything
else; never transmit.

| Key | Value | Meaning |
|---|---|---|
| `cf_tier` | `easy`/`medium`/`hard` | last tier (resumes selection) |
| `cf_name` | string | child's name for praise |
| `cf_rm` | `'1'`/`'0'` | reduce motion |
| `cf_voice` | `'1'`/`'0'` | voice on/off |

---

## 11. Accessibility

- **Targets** ≥ 88px (numbers, cards, animals); back button 60px is adult-facing.
- **Reduce motion** honored via the explicit toggle (and should also respect the OS
  `prefers-reduced-motion` media query in production — wire it to default the toggle).
- **No reliance on color alone**: correct = color **and** motion **and** sound **and**
  voice; the win is multi-channel.
- **No reading required** for core play; voice narrates everything.
- Outlines are high-contrast ink on light fills throughout.
- Production: add proper `aria-label`s, an option to slow speech, and ensure the canvas
  celebration is purely decorative (`aria-hidden`).

---

## 12. Tweakable props (already exposed on the app DC)

| Prop | Type | Default | Effect |
|---|---|---|---|
| `defaultTier` | enum easy/medium/hard | easy | starting tier if none saved |
| `voiceEnabled` | boolean | true | initial voice state |
| `confettiDensity` | enum full/calm | full | particle count |

---

## 13. Production assets (in the brand sheet)

Already designed in `Counting Friends — Brand & Assets.dc.html`; export at required sizes:

- **App icon** — 1024 master + iOS rounded (22.4% radius). Export the full iOS/Android size
  set. Duck on sky/hill scene. (Inline the duck — don't nest `<use>`.)
- **Logo lockups** — wordmark light/dark + stacked square.
- **Character sheet** — the 4 named friends with sounds.
- **Palette & type** specimen.
- **Launch screen** — wordless splash (logo + duck on the scene). Must render instantly,
  no spinner.
- **App Store marketing frames** — three: *"Tap your friends to count"*, *"Every answer is
  a celebration"*, *"No ads. No data. No fail."*
- **UI icon set** — back, replay, voice, child, parent-gate, settings, favorite; one 2.6px
  round-stroke weight.

---

## 14. What's done vs. what's left for production

**Done in the prototype (match this behavior exactly):**
- All screens/states, the full game loop, tier system, 4 characters, celebration, no-fail
  flow, idle nudge, parental gate, settings, persistence, motion, synth audio + TTS, and
  the complete asset sheet.

**To take it to a shipped product:**
1. Re-platform from `.dc.html` to your target (native iPad / React-Native / PWA). The DC
   files are the spec; the logic class maps cleanly to a component + state machine.
2. Replace browser TTS with **recorded VO** (§8.1) and optionally recorded SFX.
3. Wire `prefers-reduced-motion` to default the toggle; add full `aria` pass.
4. Export the icon/launch/marketing assets at all platform sizes from the brand sheet.
5. Add the store-required bits: privacy nutrition label (trivially "no data collected"),
   age rating (4+), localized store copy. Keep **zero** third-party SDKs to honor the
   privacy promise.
6. Consider (ask product first, don't add unprompted): more friends, a "count up" mode,
   additional languages for VO, landscape/portrait handling.

---

## 15. Edge cases & gotchas

- **First tap unlocks audio** — nothing speaks/sounds before the first user gesture; the
  start-screen tap covers this. Don't try to speak on load.
- **Cancel speech on navigation** — back button and unmount call `speechSynthesis.cancel()`
  and clear all timers (`idle`, `next`, `revert`, `re-ask`, gate RAF, confetti RAF).
- **Nested `<use>` in `<symbol>` is unreliable** — inline character paths when composing.
- **Canvas must track DPR and resize** or the burst is blurry/misplaced.
- **Rapid taps** during `status:'correct'` are ignored (handler early-returns unless
  `'asking'`), so a child mashing buttons can't desync the round.
- **Large counts (up to 20)** rely on the adaptive sizing formula and flex-wrap — verify
  the field never overflows on the smallest supported screen.
