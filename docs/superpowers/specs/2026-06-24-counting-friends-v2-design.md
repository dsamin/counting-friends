# Counting Friends v2 — "Counting Friends & Collections" — Design Spec (DRAFT)

**Status:** Draft for review · **Date:** 2026-06-24 · **Author:** Devan
**Supersedes/extends:** the shipped v1 PWA + Capacitor iPad wrapper (`feat/ipad-capacitor`).

> This is the **draft** spec. It will be critiqued by a review crew and replaced by a
> finalized spec (`...-v2-FINAL.md`) before the TDD build crew implements it.

---

## 1. Context & goal

Counting Friends v1 is a calm, no-fail, wordless tap-to-count game for a young child. One
mechanic: *"How many ducks?" → tap the number*, across three number ranges (1–5 / 1–10 / 1–20).
It is live as a PWA and wrapped as a native iPad app via Capacitor 7.

The child (referred to here by his configured name, e.g. **Jayden**, 5) has **outgrown** v1. The
parent wants v2 to:

1. Add **more challenges** (more activity types, not just "how many?").
2. Add **more images to recognize and quiz him on** (more countable variety + number recognition).
3. Add a **reward system**: a **streak / consecutive-correct callout that says his name**,
   encourages him, and **progresses him to the next level**.
4. Add **left↔right matching** sections for *counting* and *recognition*, to test whether he's
   making the connection between quantity and symbol.
5. Be **more engaging** and **age-appropriate for a 5-year-old**, with more activities that build
   real **math knowledge**.

**Decisions already made with the parent (2026-06-24):**

| Decision | Choice |
| --- | --- |
| Math scope | **Full ladder** — number sense first; addition/subtraction unlock as he masters earlier rungs. |
| Reward style | **Collectibles to chase** — stars, unlockable friends, a sticker book. |
| Matching input | **Tap-then-tap** with a ribbon link (no drag — most reliable for little fingers). |
| Progression | **App adapts automatically** — streaks/mastery raise difficulty; struggles ease it back. |

**Interpretation call (flag for review):** "recognition" is read as **number recognition**
(recognizing numerals and connecting them to quantities and number-words), *not* object-naming
("tap the apple"). If object-naming is wanted, it's an easy add later.

---

## 2. Design principles (the v1 DNA we must preserve)

These are **hard constraints**. Every new feature must honor them — the review crew should reject
anything that violates one.

- **No-fail, no pressure.** No score the child can watch tick down, no "you lost," no timers that
  punish. A wrong tap = gentle wobble + soft "whoops" + re-ask. Stars only ever go **up**.
- **Wordless & audio-first.** A 5-year-old can't read. Navigation is pictures + icons + spoken
  prompts. Any new screen must be usable with zero reading.
- **Calm aesthetic.** The existing palette, Baloo 2 / Quicksand fonts, soft storybook scene,
  chunky tap targets. New visuals extend the existing design tokens; no new visual language.
- **iPad-first, big tap targets.** All interactive elements ≥ 88px; safe-area insets respected.
- **Offline, on-device, private.** No accounts, no network, no analytics. All progress in
  `localStorage`. (Critical for a kids' app + App Store.)
- **Reduce-motion aware.** Every animation has a calm/disabled fallback driven by
  `prefersReducedMotion()`.
- **Parental gate.** Anything "for grown-ups" stays behind the existing 3-second press-and-hold gate.
- **Dual build stays green.** Web PWA build and `build:native` (Capacitor) must both keep working.
- **Test discipline.** The existing ~148 unit tests + Playwright E2E stay green; all new logic is
  TDD'd (tests first).

---

## 3. Pedagogical grounding (why these activities, for a 5-year-old)

Kindergarten-age math readiness rests on a known progression. v2's ladder maps to it:

1. **One-to-one correspondence** — touching each object once while counting. → *Count-Along*.
2. **Cardinality** — the last number counted = the total. → *Count It*.
3. **Subitizing** — instantly seeing "3" without counting. → *Quick Look*.
4. **Numeral recognition** — the symbol "7" means seven. → *Find the Number*.
5. **Quantity↔symbol mapping** — connecting a group to its numeral. → *Match Up*.
6. **Comparison** — more / fewer / same. → *More or Fewer*.
7. **Ordering & sequence** — number order, before/after, what comes next. → *Put It in Order*.
8. **Early operations** — one more/one less, then joining and separating sets. → *One More/One Less*, *Add & Take Away*.

Each is concrete and visual (countable friends), never abstract symbol manipulation.

---

## 4. The Activity framework (architecture)

v1 has exactly one game baked into `round.ts` / `PlayScreen.tsx`. v2 introduces an **Activity**
abstraction so each challenge is self-contained and independently testable, while the shared
engine keeps owning the calm loop (audio, confetti, haptics, streak/stars, adaptive level,
persistence, idle re-prompt).

### 4.1 Concepts

```ts
// Discriminated union — each activity has its own round shape.
type Round =
  | CountRound        // "how many?"
  | NumeralRound      // "find the 7"
  | MatchRound        // left↔right matching
  | QuickLookRound    // flash-then-hide subitize
  | CompareRound      // which has more?
  | OrderRound        // put in order / what's next
  | OneMoreRound      // one more / one less
  | AddRound;         // add & take away

interface ActivityModule<R extends Round> {
  id: ActivityId;                                  // 'count' | 'numeral' | 'match' | ...
  /** Pure round generator — deterministic given rng. */
  generate(level: Level, rng: Rng): R;
  /** Pure correctness check for a given answer payload. */
  isCorrect(round: R, answer: AnswerPayload): boolean;
  /** Spoken + visual prompt text for this round. */
  prompt(round: R, childName?: string): SpeechAndCue;
  /** Difficulty knobs this activity reads from Level (documented per activity). */
}
```

- **Generators are pure functions** (rng-injectable) → trivially unit-tested for invariants, the
  same proven pattern as v1's `generateRound`.
- **Rendering**: each activity has a React component (`<CountActivity>`, `<MatchActivity>`, …) that
  receives a `Round` + `onAnswer(payload)` callback. It does **not** own timers, audio, or the
  celebration — those stay in the shared engine, so all activities feel identical and calm.
- **Registry**: `activities/index.ts` exports an `ACTIVITIES: Record<ActivityId, ActivityModule>`
  registry. Adding an activity = add a module + register it (single, well-defined wiring point).

### 4.2 Where it lives

```
src/game/
  activities/
    index.ts            registry + ActivityId union + shared Round union
    count.ts            Count It (+ Count-Along) generator/checker/prompt  (+ count.test.ts)
    numeral.ts          Find the Number                                    (+ numeral.test.ts)
    match.ts            Match Up (left↔right)                              (+ match.test.ts)
    quicklook.ts        Quick Look (subitize)                              (+ quicklook.test.ts)
    compare.ts          More or Fewer                                      (+ compare.test.ts)
    order.ts            Put It in Order                                    (+ order.test.ts)
    onemore.ts          One More / One Less                                (+ onemore.test.ts)
    add.ts              Add & Take Away                                    (+ add.test.ts)
  progression.ts        adaptive level/mastery logic                       (+ progression.test.ts)
  rewards.ts            stars, streak, unlock rules                        (+ rewards.test.ts)
  content.ts            friends + themed packs + unlock thresholds         (+ content.test.ts)
  gameState.ts          extended state + reducer (streak/stars/mastery/activity)
  useGame.ts            engine: timers, audio, adaptive calls, persistence
  persistence.ts        v2 keys + migration
src/screens/
  HomeBoard.tsx         wordless Play Board (activity tiles + star jar + sticker book)
  PlayScreen.tsx        thin host: renders the active activity's component + shared chrome
  StickerBook.tsx       collection gallery
src/components/
  activities/           per-activity presentational components
  RibbonLink.tsx        the connecting ribbon for Match Up
  StarJar.tsx           star count display (home + in-play)
  LevelUpBanner.tsx     celebratory level-up / streak callout overlay
  UnlockReveal.tsx      "you unlocked a new friend!" reveal
```

### 4.3 Non-negotiable: the shared celebration path

`onAnswer(correct)` always routes through the **one** existing celebration sequence (confetti +
pop tone + spoken praise + haptic) so every activity feels the same. Activities never re-implement
feedback.

---

## 5. Activity catalog

Each entry: prompt, interaction, round shape, correctness, difficulty knobs, pedagogy.
Difficulty knobs are all derived from the adaptive `Level` (see §6).

### 5.1 Count It (enhanced) — `count`
- **Prompt (spoken):** "How many {plural}?" (today's behavior, unchanged baseline.)
- **Interaction:** N friends on screen → tap the numeral among 3–4 choice tiles.
- **NEW — Count-Along mode:** at lower levels, before the choices appear, the child can tap each
  friend one-by-one; each tap highlights that friend, plays a soft tick, and the voice counts
  "one… two… three…". After all are tapped (or a "show numbers" pill), the choice tiles appear.
  Teaches one-to-one correspondence. Count-Along is **on** at levels 1–2, optional thereafter.
- **Round:** `{ kind:'count', count, animal, choices:number[] }` (superset of v1's `Round`).
- **Correct:** tapped numeral === `count`.
- **Knobs:** `max` (range ceiling), `choiceCount` (3–5), `countAlong` (bool).
- **Pedagogy:** one-to-one correspondence, cardinality.

### 5.2 Find the Number — `numeral`
- **Prompt:** "Find the **seven**!" (numeral spoken by name; optional: friend holds a sign showing 7.)
- **Interaction:** 3–5 big number tiles; tap the one matching the spoken numeral.
- **Round:** `{ kind:'numeral', target:number, choices:number[] }`.
- **Correct:** tapped === `target`.
- **Knobs:** `max`, `choiceCount`, optional "look-alike" distractors (6/9, 2/5) at higher levels.
- **Pedagogy:** numeral recognition (symbol → name).

### 5.3 Match Up (left↔right) — `match`  *(the headline parent ask)*
- **Prompt:** "Match each group to its number!"
- **Interaction:** **tap-then-tap.** Left column = 2–4 groups of friends (different quantities).
  Right column = the matching numerals, shuffled. Tap a left item → it highlights → tap a right
  item → a **ribbon** links them (success chime if correct pair; gentle un-highlight + soft whoops
  if not, no penalty, try again). Round completes when all pairs are linked. Variants by level:
  - L1–2: group-of-friends ↔ numeral.
  - L3: dot-pattern ↔ numeral.
  - L4+: numeral ↔ number-word card (with the word also spoken).
- **Round:** `{ kind:'match', pairs: {left: GroupOrDots|Numeral, right: Numeral|Word}[] , leftOrder, rightOrder }`.
- **Correct:** all pairs linked correctly. (Per-pair checked on each connect; round-complete on full set.)
- **Knobs:** `pairCount` (2–4), `variant` ('groupNum'|'dotsNum'|'numWord'), `max`.
- **Pedagogy:** quantity↔symbol mapping — directly tests "is he making the connection?"

### 5.4 Quick Look (subitize) — `quicklook`
- **Prompt:** "Quick! How many did you see?"
- **Interaction:** friends/dots appear for a short reveal window, then hide; choice tiles appear.
- **Round:** `{ kind:'quicklook', count, choices:number[], revealMs }`.
- **Correct:** tapped === `count`.
- **Knobs:** `revealMs` (longer at low levels ~1500ms → shorter ~600ms), `max` (small: 1–5 → 1–10),
  `arrangement` ('dice'|'random'). Dice/regular arrangements at low levels (easier to subitize).
- **Pedagogy:** subitizing.
- **Safety:** the reveal is **not** a punishing timer — if missed, "Want to peek again?" replays.

### 5.5 More or Fewer — `compare`
- **Prompt:** "Tap the group with **more**!" (also asks "**fewer**" at higher levels.)
- **Interaction:** two groups side by side; tap the bigger (or smaller) group.
- **Round:** `{ kind:'compare', left:number, right:number, ask:'more'|'fewer' }`.
- **Correct:** tapped side matches the ask. (Equal counts never generated.)
- **Knobs:** `max`, `ask` set, `closeness` (bigger gaps easier; gap of 1 harder, high level).
- **Pedagogy:** magnitude comparison.

### 5.6 Put It in Order — `order`
- **Two sub-modes by level:**
  - **Sequence build:** 3 numerals out of order → tap them in ascending order (each correct tap
    locks into a slot). 
  - **What's next:** "1, 2, 3, …?" → tap the next number. (and "what comes before").
- **Round:** `{ kind:'order', mode:'build'|'next', numbers:number[], answer:number|number[] }`.
- **Correct:** build → tapped in correct ascending order; next → tapped === answer.
- **Knobs:** `span` (length / range), `mode`, gaps (consecutive vs skip-count later).
- **Pedagogy:** ordinality, before/after, sequence.

### 5.7 One More / One Less — `onemore`  *(arithmetic rung — unlocks later)*
- **Prompt:** "Here are 4. What is **one more**?" (and "one less".)
- **Interaction:** a group shown; tap the numeral that is one more/less. Optional: a friend hops in
  (one more) or hops away (one less) to make it concrete.
- **Round:** `{ kind:'onemore', base:number, delta:+1|-1, choices:number[] }`.
- **Correct:** tapped === base+delta.
- **Knobs:** `max`, `delta` set, animated-demo on/off.
- **Pedagogy:** successor/predecessor → foundation of addition.

### 5.8 Add & Take Away — `add`  *(arithmetic rung — unlocks later)*
- **Prompt:** "2 and 3 more — how many altogether?" / "5 take away 2 — how many left?"
- **Interaction:** groups visibly combine (or some hop away), then tap the total.
- **Round:** `{ kind:'add', a:number, b:number, op:'+'|'-', choices:number[] }`.
- **Correct:** tapped === result.
- **Knobs:** `max` (sums/minuends within 5 → within 10), `op` set.
- **Pedagogy:** joining/separating sets within 10.

---

## 6. Adaptive progression engine

### 6.1 Model
- Each activity has an independent **mastery** record per child: a small rolling window (e.g. last
  6 attempts) of correct/incorrect, plus the current **Level** (integer ≥ 1).
- **Level up:** sustained success — e.g. ≥5 of the last 6 correct **and** current streak ≥ a
  threshold → level += 1, fire the celebratory **level-up callout** (see §7.2).
- **Ease back:** struggling — e.g. ≤2 of last 6 correct → level = max(1, level − 1), **silently**
  (no "you went down" messaging — just gentler rounds).
- Levels map to the per-activity **knobs** in §5 via a `levelParams(activityId, level)` table.
  Example for `count`: L1 → max 5, 3 choices, count-along; L2 → max 5, 4 choices; L3 → max 10,
  4 choices; L4 → max 10, 5 choices; L5 → max 20, 5 choices; …
- **Rung gating:** arithmetic activities (`onemore`, `add`) only appear on the Home Board once the
  child reaches a mastery bar in the number-sense rung (e.g. `count` L4 + `numeral` L3). Until then
  their tiles are "locked" (shown as a wrapped present, openable later — ties into collectibles).

### 6.2 Determinism & testability
- All transitions are pure functions: `nextLevel(mastery, streak) → {level, leveledUp}`,
  `applyAttempt(mastery, correct) → mastery`. Fully unit-tested with crafted histories.
- Thresholds live in one `PROGRESSION` constant block (tunable without touching logic).

### 6.3 Parent override
- Grown-up settings gains an optional **"Set challenge level"** (per rung or global): pin a level
  and pause auto-adaptation, or "Let the app decide" (default).

---

## 7. Reward & collectibles system

### 7.1 Stars
- Earned: +1 per correct answer; **bonus burst** at streak milestones and level-ups.
- **Monotonic** — never decrease. Stored in `cf_stars`.
- Displayed as a friendly **Star Jar** on the Home Board (and a small count in-play). Tapping the
  jar shows the total with a gentle shimmer (no pressure framing).

### 7.2 Streak + name callout *(the exact parent ask)*
- A `streak` counter (consecutive correct, resets to 0 on a wrong tap — silently, no negative
  messaging).
- **Milestone callouts** at 3 / 5 / 8 / 12 …: a `<LevelUpBanner>` overlay + extra confetti + a
  happy friend cameo, and a spoken line **using the child's name**:
  - 3: "Three in a row, {name}! Great counting!"
  - 5: "Five in a row, {name} — you're amazing!"
  - 8: "Wow, {name}! Eight in a row! You're a counting star!"
- A streak milestone may also trigger a **level-up** (§6.1) — "Let's try something a little bigger!"
- `cf_streakBest` tracks the personal best (shown subtly in the sticker book as a badge).

### 7.3 Unlockable friends & themed packs *(the "more images" + the carrot)*
- New countable content unlocks as stars accumulate / milestones hit:
  - **More animal friends** (beyond the 4): e.g. dog, bird, bear, fish, owl, hedgehog… (same SVG
    style, recolorable, drawn to the existing 100×100 / 4px-stroke spec).
  - **Themed packs**: Sea (fish, crab, octopus), Fruit (apple, banana, grapes), Vehicles (car, bus,
    rocket), Shapes (star, heart, circle) — each pack is a set of countable sprites.
- **Unlock reveal:** when a threshold is crossed, a celebratory `<UnlockReveal>` — "You unlocked a
  new friend!" — the friend waves and says its sound. Unlocked content then appears in rotation in
  the counting activities (more variety = fresher quizzing).
- Unlock thresholds + the content catalog live in `content.ts` (`cf_unlocks` records owned ids).

### 7.4 Sticker Book (the trophy case)
- A calm, **child-accessible** gallery screen (Home Board tile): every unlocked friend/pack shown
  as a sticker; locked ones are soft silhouettes ("keep playing to find me!").
- Tap a sticker → it animates and plays its sound. Shows the star total and best-streak badge.
- No pressure, no leaderboard — just "look what I collected."

---

## 8. Content: friends & countable packs

- **Base (always unlocked):** Dot (duck), Pip (cat), Hopper (frog), Momo (bunny) — unchanged.
- **Unlockable friends:** add ~6–10 new SVG friends following `assets/characters/` conventions
  (100×100 viewBox, 4px ink stroke, dot eyes, blush, recolorable via `--cf-ink`). Each registered
  in `characters.ts` with `{ key, name, plural, sound, href }` + a `<symbol>` in `CharacterDefs.tsx`.
- **Themed packs:** non-animal countables (fruit/vehicles/shapes/sea) drawn to the same spec; these
  broaden "more images to recognize and quiz him on." Packs are data in `content.ts`, art in
  `assets/`.
- **Build-phase scoping:** the build crew should ship a **first wave** (e.g. +4 friends + 1 pack)
  that proves the unlock pipeline; the full catalog can grow over time without code changes.

---

## 9. Navigation & screens

### 9.1 Home Board (replaces the v1 tier-pick StartScreen)
Because difficulty is now adaptive, the explicit easy/medium/hard pick is gone. Instead a wordless
**Play Board**:
- A grid of large **illustrated activity tiles** (icon + a friend, no required text). Locked
  activities show a wrapped-present tile.
- A **Star Jar** tile (→ shows stars) and a **Sticker Book** tile (→ collection).
- A **"Surprise Me!"** tile that mixes unlocked activities into one varied session.
- Grown-up gate entry (existing 3s hold) in a corner.

### 9.2 PlayScreen (host)
- Becomes a **thin host**: renders the active activity's component + the shared chrome (back,
  replay pill, star count, parental gate, confetti canvas, banners). All celebration/feedback stays
  here. Back returns to the Home Board.

### 9.3 Sticker Book
- §7.4. Reachable from the Home Board; back returns to it.

### 9.4 Settings additions (behind existing gate)
- Existing: child name, voice on/off, reduce motion.
- **New:** challenge level (per-rung or global override / "let the app decide"), which activities
  are enabled, reset progress (with confirm), optional "arithmetic on/off."

### 9.5 Navigation model
- Extend the existing simple state machine: `screen: 'home' | 'play' | 'stickers'` (+ overlays:
  settings, gate, level-up banner, unlock reveal). No router library (keeps the v1 simplicity).

---

## 10. Data model & persistence

All `localStorage`, `cf_`-prefixed, defensive read/write (existing pattern). **Add a schema
version + migration** so the child's existing on-device prefs survive the upgrade.

| Key | Shape | Purpose |
| --- | --- | --- |
| `cf_schema` | `"2"` | schema version; migrate from v1 (absent/`"1"`). |
| `cf_name` | string | child's name (existing). |
| `cf_voice` | `'0'\|'1'` | voice on/off (existing). |
| `cf_rm` | `'0'\|'1'` | reduce motion (existing). |
| `cf_tier` | legacy | kept for migration; superseded by per-activity levels. |
| `cf_stars` | number | total stars (monotonic). |
| `cf_streakBest` | number | best streak. |
| `cf_mastery` | JSON | `{ [activityId]: { level:number, window:boolean[] } }`. |
| `cf_unlocks` | JSON | `{ friends:string[], packs:string[], activities:string[] }`. |
| `cf_settings` | JSON | overrides: `{ levelOverride?, enabledActivities?, arithmetic? }`. |

- **Migration:** on load, if `cf_schema` !== "2": seed defaults, map old `cf_tier` → a starting
  `count` level, set base unlocks, write `cf_schema="2"`. Pure, unit-tested function.
- **Reset progress** clears the v2 keys but keeps name/voice/rm.

---

## 11. Audio & voice lines

- Reuse the existing dual engine (Web Speech / native Capacitor TTS) and WebAudio SFX — **no new
  audio tech**. New work is **scripts + when to speak**.
- New spoken content (all parameterized by `{name}` where relevant), kept in `constants.ts`:
  - Per-activity prompts (§5).
  - Streak/level-up callouts (§7.2).
  - Unlock lines: "You found a new friend — say hi to {friendName}!"
  - Count-Along counting: "one… two… three…".
- New SFX as needed (link chime for Match Up, soft tick for Count-Along) via the existing tone
  synth (`playPop`/`playWhoops` style) — no audio files.
- Voice remains fully optional (existing `cf_voice` toggle); SFX still play when voice is off.

---

## 12. Visual / UX details

- Extend `tokens.css` only (no new design language): tokens for ribbon color, star gold, sticker
  frame, locked-tile treatment.
- New animations (all with reduce-motion fallbacks): ribbon draw, star fly-into-jar, unlock reveal
  pop, level-up banner slide. Reuse existing spring curves/timings.
- Confetti reused; level-up uses a denser/longer burst (still within existing `CONFETTI` config).
- Layout: Home Board grid + activity components must fit iPad portrait & landscape, safe areas,
  ≥88px targets. Match Up's two columns sized for chunky tap-then-tap.

---

## 13. Accessibility & safety

- No-fail everywhere; no negative audio/visual messaging; stars never decrease.
- Reduce-motion honored for every new animation.
- Parental gate guards all settings; reset-progress double-confirms.
- Fully offline; no new network, storage of PII (only the name, on-device), or analytics.
- aria-live announcements for prompts/results continue (existing pattern) for assistive tech.

---

## 14. Testing strategy (TDD)

Every spec item ships **tests first**. Layers:

1. **Pure unit tests (Vitest)** — the bulk:
   - Each activity generator: invariants (answer always present; choices unique & in range;
     distractors valid; no equal-count compares; reveal windows positive; pair sets consistent).
   - `isCorrect` for each activity (truth table).
   - `progression.ts`: crafted attempt histories → expected level transitions, ease-back, rung
     gating. `rewards.ts`: star accrual, streak milestones, unlock thresholds. `content.ts`:
     catalog integrity (every unlock id resolvable). `persistence.ts`: v1→v2 migration round-trips.
2. **Component tests (Testing Library)** — each activity component: renders a given round, fires
   `onAnswer` with the right payload on tap-then-tap / tile tap; Match Up ribbon link flow;
   Home Board renders unlocked vs locked tiles; Sticker Book locked/unlocked states;
   LevelUpBanner/UnlockReveal show & dismiss.
3. **Engine tests** — `useGame` extended: streak increment/reset, star award, level-up trigger
   speaks the name line, adaptive level feeds next round, persistence writes.
4. **E2E (Playwright)** — new flows + keep the existing 6 green: play each activity to a correct
   answer; trigger a streak callout; trigger an unlock; open Sticker Book; parent override level.
5. **Build verification** — `npm run typecheck && npm run test && npm run build && npm run build:native`
   all pass; a Playwright smoke run renders the Home Board and one round of each activity.

Coverage target: new logic modules ≥ the existing project standard; no merged code with red tests.

---

## 15. Build phasing & milestones

The TDD build crew implements in dependency order. Each phase is independently shippable & testable
on the iPad.

- **Phase 1 — Foundation (no visible new activities yet):**
  Activity framework + registry; `Round` union; `gameState`/`useGame` extension; persistence v2 +
  migration; `progression.ts`; `rewards.ts`; `content.ts` scaffolding; Home Board + Sticker Book
  shells; refactor existing "how many?" into the `count` activity behind the framework **without
  changing its behavior** (all v1 tests still green). *Exit:* app behaves like v1 but on the new
  architecture, with stars/streak/Home Board live.
- **Phase 2 — Number-sense activities + collectibles (the headline value):**
  Count-Along; Find the Number; **Match Up**; Quick Look; streak name-callouts; first wave of
  unlockable friends + 1 themed pack; Unlock reveal; adaptive level-up wired end-to-end.
  *Exit:* the parent's headline asks are all live and tested.
- **Phase 3 — Compare & order:** More or Fewer; Put It in Order.
- **Phase 4 — Arithmetic rung:** One More/One Less; Add & Take Away; rung gating.

**Recommended minimum for "ready to test on iPad":** Phases 1–2 complete, fully tested, both builds
green. Phases 3–4 follow the same TDD pattern.

---

## 16. Non-goals (YAGNI)

- No accounts, cloud sync, multi-child profiles, or parent dashboards/analytics.
- No object-naming/vocabulary game (unless the parent asks — see §1 interpretation call).
- No leaderboards, social, or competitive framing.
- No new audio/asset *pipeline* (reuse SVG + tone synth + TTS).
- No router library, no state-management library — keep v1's lightweight approach.
- No timed/score-pressure modes.

---

## 17. Open questions for the review crew

1. **Scope vs. ship:** is Phases 1–2 the right "v2 release," with 3–4 as fast-follow? Or push all
   four in one go?
2. **Count-Along** — worth the extra interaction complexity at L1–2, or keep Count It tap-only?
3. **Match Up correctness UX** — on a wrong pair, un-highlight silently vs. a tiny "not quite" cue?
   (Must stay no-fail.)
4. **Locked activity/present tiles** — motivating, or confusing for a 5-year-old? Alternative: just
   hide locked activities until unlocked.
5. **How many new friends/packs** in the first wave to prove the pipeline without over-scoping art?
6. **Adaptive thresholds** — are the suggested windows (5/6 up, 2/6 down) right for a 5-year-old's
   patience, or too fast/slow?
7. **Replacing the tier-pick StartScreen** entirely — any reason to keep an explicit difficulty
   pick for the parent, beyond the settings override?
8. **Numeral look-alike distractors** (6/9, 2/5) — helpful challenge or frustrating at age 5?
