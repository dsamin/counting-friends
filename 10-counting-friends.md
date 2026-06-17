# 10 🐱 Counting Friends  (ipad-app)

## TL;DR

**Counting Friends** is a tap-to-count early-learner iPad game for Jayden: a few big friendly animals wander onto a calm scene, a warm mascot voice asks *"How many cats?"*, and the child taps the matching big number — celebrated with confetti and a squash-and-sparkle, never punished. **Who it's for:** Jayden specifically (~3–5, pre-reader) and the broad pre-K market of parents hunting for calm, ad-free, zero-data educational apps. **Why now:** it's the stated "build 1 iPad app for Jayden" goal at exactly his verified level — the natural next rung above *balloon-pop-numbers* (pure digit ID) by adding one-to-one counting, in a market that rewards a single polished no-fail concept. **Build estimate:** ~2 days of SwiftUI build (art + a half-day of voice recording is the real time sink; code is small). **Note: build time ≠ launch time** — this is a Kids Category app, so after a 2-day build, budget for submission plus ~1–3 days of stricter Kids review and a possible rejection round before it's live.

---

## Problem & Opportunity

**The problem.** Pre-readers (ages 3–5) are in the one-to-one correspondence stage: they can recite "1, 2, 3" by rote long before they understand that *three cats* means tapping the numeral **3**. The apps that teach this are either (a) clean but locked inside busy multi-game bundles, or (b) free and crawling with the ads, IAP prompts, and data collection that parents are actively fleeing in 2025–2026. There is whitespace for one beautiful, calm, single-concept counting toy.

**Target persona.** *Jayden, age ~4* — taps before he reads, loves animals, gives up the second something feels like a test. And behind him, *his parent* — searching the App Store for "ad-free counting app," distrustful of free apps after one too many surprise IAP screens, willing to pay a few dollars once for something safe. Devan is literally both the developer and the parent here; the persona is in the house.

**Market validation (from research).** Demand is real and proven: RV AppStudios' **123 Numbers – Count & Tracing** holds roughly **4.5★ across ~2.3k App Store ratings**, and its App Store listing leads with verbatim *"no third party ads or in-app purchases."* (The publisher's *"Trusted by 30+ million users"* line is an RV AppStudios ecosystem figure across its ~14-app catalog — a marketing claim, not a per-app metric for 123 Numbers — so treat it as publisher framing, not validation of this one title. The often-quoted 4.43★ / ~14k figure is the Google Play number; the App Store standing is the ~4.5★ / ~2.3k above.) That trust framing — not the content — is what converts. **Khan Academy Kids** leans on the same "no ads, no IAP" line as its #1 trust signal. The no-fail design philosophy is now baseline: Endless Alphabet ("no high scores or failures"), Sago Mini ("digital toys, not games — no Game Over, zero stress"), and Toca Boca ("no win/lose") all define the bar. Direct counting competitors exist — tap-the-objects counting apps (e.g. GiggleUp's *Toddler Counting 123*, where a voice says "How many?" and the child taps objects to count them), **Tiny Human Counting** (1:1 correspondence), **Endless Numbers** — but they're either visually dated, bundled and busy, or buried in minigames. None is the calm, single-screen, name-baked-in toy this is.

**Why the build is fast (and how it actually ships).** The build is genuinely small: no backend, no accounts, no sync, no scoring logic (no-fail means there is nothing to score). It reskins *balloon-pop-numbers'* proven number-recognition loop into native SwiftUI — Devan's *JayColor* path. Going fully offline + zero-data makes COPPA/GDPR-K compliance near-automatic and removes the single biggest review-risk surface. The only real work is art and recording a friendly voice. Realistic framing: **~2-day build, submit this week, then plan for App Store review** — Kids Category apps get extra scrutiny (privacy-policy review, parental-gate verification, age-band/data checks) and rejections in this category are common, so budget for a roughly **1–3 day review plus the possibility of one rejection round**. Do a pre-submission self-audit against Guideline 1.3 (parental gate placement, no outbound links anywhere child-facing, privacy URL live before submit) to cut the odds of a round-trip. "Live in the store within a week" is plausible but not guaranteed; treat it as build-this-week, ship-shortly-after.

---

## Competitive Landscape

| Competitor | What it does | The gap we exploit |
|---|---|---|
| **123 Numbers – Count & Tracing** (RV AppStudios) | Number ID, tracing, counting across many minigames; free, no ads/IAP; ~4.5★ / ~2.3k App Store ratings (publisher markets "30M+ users" across its ~14-app catalog) | Proves "no ads/IAP" sells — but it's a crowded multi-activity grid. We win on *calm focus*: one concept, one screen, one warm voice, zero menu maze. |
| **Tap-to-count "how many?" apps** (e.g. GiggleUp's *Toddler Counting 123*) | Voice asks "How many?", child taps objects to count them up | Counts by tapping objects (cardinality-by-tapping), not by *matching the numeral*. We teach the harder, higher-value skill: set → digit. And we look contemporary, not dated. |
| **Tiny Human Counting / Number Match** | Solid 1:1 correspondence via ten-frames, dice, tally marks | Pedagogically rich but visually clinical and worksheet-flavored. We win on *delight*: animal characters, exaggerated squash/sparkle, a toy not a drill. |
| **Endless Numbers** (Originator) | Monster characters, number puzzles, charming animations; freemium with IAP unlocks | Beloved but gated behind IAP and broader in scope. We're a single honest one-time price, fully offline, and tuned to one band so nothing feels "babyish" or "too hard." |

---

## Feature Spec

### MVP (v1, buildable in ~2 days)

- **One screen, one loop.** A soft scene (meadow/pond). 1–5 big friendly animal characters of one type appear with a gentle entrance bounce. Mascot voice: *"How many cats?"* Three to four oversized number buttons sit along the bottom. Tap the matching number → celebration → next round.
- **HERO VISUAL — the celebration burst.** On a correct tap, the chosen number button squashes-then-grows, sparkles fly off it, a short confetti shower falls, and the mascot cheers *"Three! You got it, Jayden!"* This is the single signature moment the whole app is built around (the equivalent of Brimful's amber fill).
- **Positive-only feedback.** A wrong tap makes that number gently shrink-and-bounce back with a soft "whoops" chime — no red X, no buzzer, no Game Over, no score, no timer. The prompt then re-speaks. Every animal on screen is also tappable and says its sound (a cat "meow") for free exploration.
- **Three difficulty tiers** (grows with Jayden): **Easy 1–5**, **Medium 1–10**, **Hard 1–20**. Selected on a wordless start screen via three sizes of the same animal icon (no reading required).
- **Mascot voice & optional name.** A friendly recorded voice (Devan's, or a clean royalty-free child-friendly VO) delivers all prompts and praise. **Celebration audio is composed at runtime, not pre-recorded combinatorially:** play a number clip ("Three!") + a praise stem ("You got it!") so the recording sheet stays small (see Data model). For the broad market, praise defaults to the generic name-free stem. A **one-time optional child-name field lives behind the parental gate**; if set, the app appends a recorded/synthesized name clip after the praise stem ("…You got it, Jayden!"). For Devan's personal build this can simply be pre-set to "Jayden"; for the public release it is opt-in and falls back gracefully to name-free praise when unset. Auto-repeats the prompt after ~5 seconds of idle.
- **3–4 animal sets** bundled (cats, ducks, frogs, bunnies) so rounds feel fresh; the animal type rotates each round.
- **Fully offline, zero data.** No network calls, no analytics, no accounts, no IAP, no ads. All art/audio bundled.
- **Orientation:** support both landscape and portrait, but design landscape-first (kids hold iPads sideways).
- **Parental gate** in front of the only "grown-up" affordance (a tiny settings/about corner): a "hold the dot for 3 seconds" cognitive gate, never a one-tap "Are you a grown-up?" dialog.
- **Accessibility:** number buttons ≥88pt (target 100pt); all interactive targets ≥70pt; generous edge margins, ARIA-equivalent VoiceOver labels on number buttons, non-color-dependent feedback (motion + sound, not just color), honors Reduce Motion (confetti downgrades to a single calm sparkle).

### Fast-follow (v2)

- **More animal worlds** shipped as free updates (farm, ocean, jungle) — builds the "world" model Sago Mini uses to scale.
- **Counting-up mode:** tap each animal in turn, it bobs and the running count is spoken — teaches cardinality alongside numeral matching.
- **Second audio language** (Spanish first): pre-readers have ~no on-screen text, so a second VO track widens the market cheaply.
- **"Number of the day" gentle streak** (visual sticker album behind the parental gate, no pressure, no loss state).
- **Subtle haptics** on correct taps (Core Haptics) for extra tactile delight.
- **Mascot character** with a name and a tiny idle animation, to anchor a recognizable brand.

### Core user flow

1. App launches straight into the wordless start screen (no splash gate, no login).
2. Child taps one of three animal-size icons to pick a tier (or it defaults to last-used / Easy).
3. The scene loads; 1–5 animals bounce in; mascot asks *"How many ducks?"*
4. Child taps a big number button at the bottom.
5. **Correct →** squash + sparkle + confetti + spoken praise with name → brief beat → next round auto-loads.
6. **Wrong →** that button bounces back with a soft chime, nothing else changes, prompt re-speaks. Child tries again. No penalty, ever.
7. Idle ~5s → prompt auto-repeats. The loop continues indefinitely; the child (or parent) just closes the app to stop.

### Data model / state

- **All local, all ephemeral.** No persistent user data of any kind beyond a few trivial preferences in `UserDefaults`: `lastTier` (Easy/Medium/Hard), `reduceMotionOverride` (optional), and an optional `childName` string (set only via the parental-gate name field; stays on-device, never transmitted, so App Privacy remains "Data Not Collected"). That's it.
- **In-memory round state** (a SwiftUI `@Observable` model): `currentAnimal`, `currentCount`, `numberChoices: [Int]`, `tier`, `idleTimerStart`. Regenerated every round, never saved.
- **Audio asset sheet (deliberately small — keeps VO to ~half a day):** 20 number-word clips (1–20) + a small set of praise stems (e.g. "You got it!", "Yes!", "Nice counting!") + prompt lines per animal + whoops chime + confetti pop + animal sounds. Celebration audio is **composed at runtime** (number clip + praise stem, optionally + one name clip) rather than recording every number×praise combination. If a custom name is set in the public build, that single name clip is generated by on-device speech synthesis (`AVSpeechSynthesizer`) so no extra recording session is needed.
- **Bundled assets only:** animal art (PNG/PDF vector or SF Symbols-style) plus the audio sheet above.
- **No database, no files written, no Keychain, no iCloud, no network.**

### Permissions & APIs (iOS capabilities)

- **None requested.** No network entitlement needed (and none used). No microphone, no camera, no photos, no location, no notifications, no Game Center, no IAP, no Sign in with Apple.
- **App Store Connect config:** Kids Category, age band **5 and under**; Privacy "Data Not Collected" (all categories); a **hosted privacy-policy URL** is still required for any Kids app even when you collect nothing — state plainly "this app collects, stores, and transmits no data."
- **Frameworks used:** SwiftUI, AVFoundation (audio playback), Core Haptics (v2). No third-party SDKs.

---

## Tech Stack & Build Sequence

**Recommended stack:** **Swift + SwiftUI**, iPad target, iOS 17+ (for `@Observable` and the modern `Canvas`/`TimelineView` particle path). Skip SpriteKit — research confirms pure SwiftUI **`Canvas` + `TimelineView`** handles a confetti/sparkle burst at 60fps for the modest particle counts (40–80) this needs, and staying in one framework is the faster build. Audio via **AVFoundation** (`AVAudioPlayer`) with pre-loaded clips. No packages, no backend, no analytics — every dependency you add to a Kids app is review risk.

**Reuse-from-prior-work map:**
- **balloon-pop-numbers** → the number-recognition loop, choice-generation logic, and "tap the right numeral" interaction port almost directly.
- **JayColor** → the native-SwiftUI-for-Jayden path, candy UI kit (fat buttons, rounded shapes, playful palette), and the wordless start-screen pattern.
- **WaterFlow / Brimful** → the *philosophy*: one HERO visual (here, the celebration burst), accessibility-first (Reduce Motion, non-color cues, VoiceOver), and the marketing-site + demo-video-pipeline muscle memory for the App Store listing.

**2-day build sequence:**

- **Day 1 AM — Core loop.** New SwiftUI iPad project. Build the `RoundModel` (`@Observable`): generate a random count for the tier, render N animal views, generate 3–4 number choices including the correct one. Wire tap → correct/incorrect branch (no scoring). Get the loop cycling with placeholder shapes and `print` "audio."
- **Day 1 PM — HERO celebration + feedback.** Build the `Canvas`/`TimelineView` confetti+sparkle burst and the squash-grow button animation. Add the gentle wrong-tap bounce-back. Add the idle-repeat timer. Make it *feel* delightful with placeholder art — this is the make-or-break polish pass.
- **Day 2 AM — Assets in.** Drop in real animal art (4 sets), wire `AVAudioPlayer` for animal sounds, number words 1–20, prompts, and praise stems. **Record the voice** (Devan's or clean VO) per the small audio sheet (numbers + a handful of praise stems, composed at runtime — not every number×praise combo). This is the time sink — protect it, but the runtime-composition approach keeps it to about a half day.
- **Day 2 PM — Tiers, start screen, gate, ship-prep.** Wordless three-tier start screen; parental-gate corner (hold-3-seconds) housing the optional one-time child-name field (name clip via on-device speech synthesis, generic praise fallback when unset); Reduce-Motion downgrade; VoiceOver labels; landscape+portrait layout. Then App Store Connect: Kids Category, age band, "Data Not Collected," privacy-policy URL, screenshots, app preview video. **Run the Guideline 1.3 self-audit before submitting** (gate placement, zero child-facing outbound links, privacy URL live). Note this is the submit step — live-in-store follows after review (budget ~1–3 days plus a possible rejection round).

---

## Design Statement

> Imagine the quietest corner of a sunlit nursery, where the wallpaper is soft and the toys are round and there is nothing sharp or loud anywhere. A small boy sits cross-legged with the iPad on his knees, and three plump cartoon ducklings waddle onto a meadow the color of fresh butter. A kind, unhurried voice — the voice of someone who has all the time in the world — asks him, gently, *"How many ducks?"* He reaches out and presses the big friendly **3**, and the world rewards him the way a grandparent would: the number squashes like a marshmallow, bursts into a shower of confetti and golden sparkles, and the voice laughs *"Three! You did it, Jayden!"* Nothing here can punish him, nothing here can be lost, there is no clock and no score and no way to fail — only the warm, endless invitation to count again. It feels less like a lesson and more like being told, over and over, *yes, you're so clever, do it again.*

---

## Design Recommendations (for design agents)

- **Style direction:** *Soft Storybook Play* — rounded, hand-illustrated, gouache-and-felt warmth. Chunky shapes, thick soft outlines, generous whitespace, zero clutter. Think Sago Mini's calm meets Khan Academy Kids' friendliness. Explicitly **not** glossy-skeuomorphic and **not** flat-corporate.
- **Color palette (warm, low-stimulation, high-contrast where it counts):**
  - Meadow Cream (background) `#FBF3DC`
  - Soft Sky `#A8D8E8`
  - Duckling Yellow (hero/celebration) `#FFC94D`
  - Frog Mint `#9FD9A3`
  - Berry Coral (accents, sparkles) `#FF8A7A`
  - Cocoa Outline (text/strokes) `#5A4633`
- **Typography:** Headings & number glyphs in **Baloo 2** (rounded, friendly, unmistakable digits — critical that 6/9 and 3/8 read clearly to a 4-year-old). Any incidental body/parental-gate text in **Quicksand** (soft, geometric, calm). Number buttons use Baloo 2 at very large weight.
- **Layout & spacing system:** 8pt base grid. Number buttons ≥88pt (target 100pt); all interactive targets ≥70pt; spaced ≥24pt apart, kept ≥40pt off all screen edges (resting-thumb safe zone). Animals occupy the top two-thirds; number row anchored along the bottom. Landscape-first; portrait reflows the number row into a 2×2 cluster.
- **Key screens to design (explicit list):**
  1. **Start / tier-select** — wordless, three sizes of the same animal icon = three difficulty levels.
  2. **Counting scene (Easy, 1–5)** — the core loop, animals + number row.
  3. **Celebration state** — the HERO confetti/sparkle/squash moment.
  4. **Wrong-tap state** — number bouncing back, soft whoops (show the micro-state).
  5. **Parental gate** — "hold the dot" overlay, slightly more grown-up styling; houses the optional one-time child-name field and the settings/about affordance.
  6. **App Store screenshots** — 3–5 marketing frames leading with "No ads. No data. No fail."
- **Component inventory:** big number button (idle/pressed/correct/wrong states), animal sprite (idle-bob / entrance-bounce / tapped-wiggle), mascot character, confetti+sparkle particle layer, tier-select icon, parental-gate dot, prompt-speaker idle indicator.
- **Motion / micro-interactions:** entrance bounce on animals; idle bob loop; **squash→overshoot→settle** on correct number (the signature beat); gentle shrink-bounce on wrong; particle burst (confetti + radial sparkles) keyed to the correct tap; everything springy, nothing snappy or harsh.
- **Iconography & imagery:** literal, representational icons only (a door = exit, never an abstract arrow). No text labels anywhere in the child-facing UI. Animals are characters with eyes and personality, not clip-art.
- **Accessibility notes:** honor **Reduce Motion** (confetti → one calm sparkle, no shake); never rely on color alone for correct/wrong (motion + distinct sounds carry it); VoiceOver labels on number buttons ("number three"); 4.5:1+ contrast on the Cocoa outline against all backgrounds; large targets; no flashing.
- **Dos & Don'ts:**
  - **Do** keep one concept per screen, voice-first, every element tappable-and-reactive.
  - **Do** make the celebration feel disproportionately generous.
  - **Don't** add a score, a timer, a streak-with-loss, a red X, or any "try again!" that reads as failure.
  - **Don't** use primary-color "babyish" garishness — keep it warm and muted; this also future-proofs toward a 6–8 band.
  - **Don't** put any link, buy button, or settings-with-data outside the parental gate.

---

## Launch & Monetization

- **Distribution channel:** Apple App Store, **Kids Category**, age band **5 and under**, iPad-first (iPhone universal is a cheap bonus).
- **Timeline (honest).** Build is ~2 days. **Submission can happen this week; going live cannot be guaranteed within the week.** Kids Category review is stricter than the general queue (privacy-policy and parental-gate verification, age-band/data checks) and rejections are common, so plan for **~1–3 days of review plus the possibility of one rejection round** after submit. Frame any launch comms as "submitting this week, live shortly after."
- **Free vs. paid — recommend PAID UPFRONT (paymium), one-time ~$3.99.** This is the cleanest fit: no servers, no IAP plumbing, no ad networks, no parental-gate purchase flow to get rejected. Parents who buy paid kids apps are the loyal, "set-and-forget, no surprises" segment, and "$3.99 once, then nothing" is itself the pitch. (If Devan wants reach over revenue, the fallback is free with a single honest "unlock all animal worlds" IAP behind the parental gate — but defer that; it adds review surface for little day-one upside.)
- **Launch checklist:**
  - [ ] App icon + 3–5 App Store screenshots leading with **"No ads. No IAP. No data. No fail."**
  - [ ] 15–30s app preview video (reuse the Playwright/ffmpeg-style demo muscle: screen-record the celebration loop).
  - [ ] Hosted privacy-policy URL stating "collects/stores/transmits no data" (required even at zero collection).
  - [ ] App Privacy "Data Not Collected" across all categories in App Store Connect.
  - [ ] Confirm Kids Category compliance: no third-party SDKs, no analytics, no outbound links, parental gate on the one grown-up corner.
  - [ ] Test on a real iPad with a real 4-year-old (Jayden) before submitting — watch where his thumbs land.
  - [ ] Landscape + portrait both verified; Reduce Motion verified; VoiceOver verified.
  - [ ] Pre-submission Guideline 1.3 self-audit: parental gate correctly placed in front of every grown-up affordance (settings/about + name field), no outbound links anywhere child-facing, privacy-policy URL live and reachable before you hit submit.
  - [ ] Verify the competitor facts you cite are current and store-correct (App Store vs. Google Play ratings, publisher names) before any public marketing copy reuses them.
- **Growth / virality angle:** Lead the entire listing and a one-page marketing site with the **"Zero data. Zero ads. Zero fail."** trust posture — the exact thing parents are searching for in the 2025–2026 regulatory climate, and the thing big publishers *can't* credibly claim. Pair it with the genuine hook ("set your child's name once behind the parental gate and the celebrations cheer them on by name") and seed it in a few parenting/early-learning subreddits and Facebook groups where "ad-free counting app" is a recurring ask. The "world grows for free" roadmap (new animal worlds as updates) gives reviewers and parents a reason to keep it installed.

---

## Design-Agent Prompt (copy-paste)

```
Design a calm, polished iPad app called "Counting Friends" — a tap-to-count game for
pre-readers aged 3–5. It must feel like a warm, no-fail digital toy (Sago Mini meets
Khan Academy Kids), NOT a test. No on-screen text in the child-facing UI; everything is
voice-driven and icon-driven.

AESTHETIC: "Soft Storybook Play" — rounded, hand-illustrated gouache-and-felt warmth.
Chunky shapes, thick soft outlines, generous whitespace, zero clutter, low-stimulation.
Springy, generous motion. Avoid glossy skeuomorphism and flat-corporate looks; avoid
garish primary-color "babyish" styling.

PALETTE (use these hex exactly):
- Meadow Cream background #FBF3DC
- Soft Sky #A8D8E8
- Duckling Yellow (hero/celebration) #FFC94D
- Frog Mint #9FD9A3
- Berry Coral (accents/sparkles) #FF8A7A
- Cocoa Outline (strokes) #5A4633

TYPOGRAPHY: Number glyphs and headings in Baloo 2 (rounded, very large weight; digits
6/9 and 3/8 must read unambiguously to a 4-year-old). Incidental/parental-gate text in
Quicksand.

LAYOUT: 8pt grid. Landscape-first (portrait reflows). Number buttons ≥88pt (target 100pt),
spaced ≥24pt apart, kept ≥40pt from all screen edges (resting-thumb safe zone). Animals
fill the top two-thirds; a row of big number buttons anchors the bottom.

DESIGN THESE SCREENS / STATES:
1. Start / tier-select — wordless, three sizes of the same animal icon = Easy(1–5) /
   Medium(1–10) / Hard(1–20).
2. Counting scene (Easy) — a soft meadow/pond with 1–5 friendly animal characters
   (ducks/cats/frogs/bunnies) and a bottom row of 3–4 huge number buttons; a small
   speaker/mascot indicator showing the voice is asking "How many ducks?"
3. Celebration (HERO) state — the correct number button squashing then overshooting,
   surrounded by a confetti shower + radial golden sparkles; show this as the signature
   moment.
4. Wrong-tap micro-state — a number gently shrinking and bouncing back (NO red X, NO
   buzzer, nothing harsh).
5. Parental gate — a slightly more grown-up "hold the dot for 3 seconds" overlay.
6. App Store marketing frames (3–5) leading with "No ads. No IAP. No data. No fail."

COMPONENTS: big number button (idle / pressed / correct / wrong states), animal sprite
(idle-bob / entrance-bounce / tapped-wiggle), mascot character, confetti+sparkle particle
layer, tier-select icon, parental-gate dot.

MOTION: entrance bounce on animals, gentle idle bob, squash→overshoot→settle on correct
number (the signature beat), shrink-bounce on wrong, springy confetti+sparkle burst on
the correct tap. Everything soft and springy, never snappy or harsh.

ACCESSIBILITY (required): honor Reduce Motion (confetti downgrades to one calm sparkle);
never rely on color alone for correct/wrong (carry it with motion + sound); number buttons
≥88pt (target 100pt) and all interactive targets ≥70pt; high contrast on the Cocoa
outline; no flashing. Deliver as clean, production-ready SwiftUI-friendly layouts.
```

---

## Verification Notes

**Original grade:** B (verdict: minor-fixes). This section records the adversarial-review corrections applied so the spec is auditable.

**What was corrected:**
- **Market-validation stat (was false).** The headline "4.43★ across ~14,000 ratings" was the competitor's *Google Play* number presented as its App Store standing. Replaced with the verified App Store figure (~4.5★ / ~2.3k ratings) in both the Problem & Opportunity section and the Competitive Landscape table, with an explicit note that the 4.43★/~14k figure is the Android number.
- **"30M+ users" (was confirmed but misleading).** Reframed as an RV AppStudios publisher/ecosystem marketing line across its ~14-app catalog (the listing literally says "Trusted by 30+ million users"), not a per-app metric for 123 Numbers, in both places it appeared.
- **Competitor attribution (was unconfirmed).** "Toddler Counting (PrestoLearn)" could not be verified — no app by that publisher surfaced. Genericized to "tap-to-count 'how many?' apps (e.g. GiggleUp's *Toddler Counting 123*)" in both the prose and the table; dropped the unverifiable "PrestoLearn" name and the fabricated-feeling "2014" specificity.
- **Launch-this-week framing (store-rejection risk).** Distinguished BUILD time (~2 days) from STORE/LAUNCH time everywhere it was conflated (TL;DR, the former "Why it can launch this week" subhead, Tech Stack build sequence, and Launch & Monetization). Added the Kids Category review reality: stricter scrutiny, common rejections, budget ~1–3 days review + a possible rejection round; "submit this week, live shortly after."
- **Guideline 1.3 self-audit added.** Pre-submission checklist now verifies parental-gate placement, zero child-facing outbound links, and a live privacy URL before submit, to reduce round-trip odds.
- **Touch-target inconsistency (med).** Unified to one rule used everywhere — number buttons ≥88pt (target 100pt), all interactive targets ≥70pt — replacing the three prior conflicting statements (70–80pt / 80×80pt min / 80–100pt) in the Feature Spec, Design Recommendations, and both lines of the Design-Agent Prompt.
- **Name-baking scope (low).** Replaced the implicitly hardcoded "Jayden" hook with an explicit optional one-time child-name field behind the parental gate, with graceful generic-praise fallback when unset (and a "pre-set to Jayden" note for the personal build). Toned down the "baked in by name" marketing line accordingly. Added it to the Data model, build sequence, key screens, and growth angle.
- **Audio combinatorics (low).** Specified the audio sheet explicitly — 20 number clips + a small set of praise stems + one optional name clip, **composed at runtime** rather than recording every number×praise combination — so the half-day VO estimate holds. The optional custom name uses on-device speech synthesis to avoid an extra recording session.

**Confirmed facts left intact (re-verified against the package):** Kids Category requires a hosted privacy-policy URL even at zero data collection; App Privacy "Data Not Collected"; parental gate required before links/permissions/purchases; age bands 5-and-under / 6–8 / 9–11; the "hold the dot 3 seconds" cognitive gate is on-policy. The local-only optional child-name field does not change "Data Not Collected" (it never leaves the device).

**Residual risks to watch at launch:**
- Kids Category review is the main schedule risk — a single rejection round can slip the launch past a week even though the build is ~2 days.
- Competitor figures (ratings counts, store-specific numbers, publisher names) drift over time and differ between App Store and Google Play; re-verify on the live App Store listing before reusing any of them in public marketing copy.
- The optional name field adds a small text-input surface behind the parental gate; keep it strictly behind the gate and confirm it triggers no data-collection disclosure obligations (it should not, as the value stays on-device).
- On-device speech synthesis for the name clip will sound different in timbre from the recorded VO; verify it blends acceptably or fall back to name-free praise.
