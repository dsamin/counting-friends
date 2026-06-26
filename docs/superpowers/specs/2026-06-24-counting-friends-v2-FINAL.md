# Counting Friends v2 — "Counting Friends & Collections" — Design Spec (FINAL)

**Status:** FINAL — ready for TDD build crew · **Date:** 2026-06-24 · **Author:** Devan
**Supersedes/extends:** the shipped v1 PWA + Capacitor iPad wrapper (`feat/ipad-capacitor`).
**Replaces:** `2026-06-24-counting-friends-v2-design.md` (DRAFT).

> This is the finalized, build-ready spec. A build agent reading **only this file** has everything
> needed. The DRAFT's open-questions section has been resolved and folded into the body. Where the
> five review lenses (pedagogy, architecture, UX/no-fail, scope, testability) conflicted, the
> tie-breakers were, in order: **(1)** preserve the v1 no-fail DNA (§2), **(2)** Simplicity-First /
> YAGNI, **(3)** deliver the parent's headline asks. Those calls are stated inline.

---

## Changelog from draft

Headline changes the build crew must note (rationale lives in the referenced sections):

1. **Phase 1 split into 1a + 1b** to make "148 tests stay green" honest. 1a introduces the Activity
   framework behind the *existing* `Tier` engine (zero behavior change, all v1 tests untouched). 1b
   does the `Tier → Level` swap + Home Board and **explicitly replaces** the StartScreen/`PICK_TIER`
   tests. (§15, resolves architecture+testability blockers.)
2. **Phase 2 split into 2a (reward spine) + 2b (new activities)**, with Match Up built **last** as its
   own sub-milestone with a dedicated E2E written first. (§15, resolves scope blocker.)
3. **All four undefined types pinned** — `AnswerPayload`, `SpeechAndCue`, `Level`, `ActivityId`,
   plus the `Round` union members, `ActivityModule`, and the `evaluate()` correctness contract that
   replaces the single-boolean `isCorrect`. (§4, resolves architecture blocker.)
4. **`evaluate()` replaces `isCorrect()`** for every activity — returns
   `{ correct, roundComplete }` so multi-step activities (Match Up) fit the same seam. (§4.1.)
5. **Frozen `PROGRESSION` and `REWARDS` constant blocks** with exact values; the window records
   **one outcome per round (first attempt only)**. Tests import the constants. (§6, §7, resolves
   testability blocker.)
6. **Per-activity invariant table** added so layer-1 generator tests are writable directly from the
   spec; **all choice sets are shuffled, never sorted** (so position can't leak the answer). (§5.9.)
7. **GameState v1→v2 field-fate table** added: animation/feedback fields stay **flat**; a `round`
   field is added alongside. (§4.4, resolves architecture major.)
8. **Persistence v2 hardened**: concrete `cf_settings` shape, `tier→level` map, a defensive
   `loadV2State()` that try/catches each key, and a **malformed-JSON** test requirement. (§10.)
9. **Count-Along is NOT forced on**; it is optional remediation that auto-offers only after a wrong
   Count It answer, and is **cut from the release** (fast-follow). Count It ships tap-only. (§5.1,
   resolves pedagogy major + scope.)
10. **Subitizing (Quick Look) promoted** to a first-wave activity available from the start, not
    gated behind numeral drills; reveal windows recalibrated and **capped at ≤5 for sub-second
    reveals**. (§5.4, §6.4.)
11. **Match Up wrong-pair is a silent non-event** — no whoops, no "not quite", positive audio only;
    a soft link-chime on a correct connect, full celebration on round-complete. (§5.3, §7.5,
    resolves no-fail major.)
12. **Celebration arbiter** rule added: at most ONE big overlay per answer (unlock > level-up >
    streak), the rest queue to the next round boundary. (§7.6, resolves no-fail major.)
13. **Per-animation reduce-motion table** added (ribbon, star-fly, unlock pop, level-up). (§12.1.)
14. **Home Board**: locked activities are **hidden until unlocked** (no wrapped-present tiles);
    tiles are **audio-previewed on tap**; only 3–4 recommended tiles shown at once. "Surprise Me!"
    **cut**. (§9.1, resolves no-fail major + scope.)
15. **Look-alike distractors**: keep **6/9** (gated to numeral L3+), **drop 2/5**; **cut from the
    release**, fast-follow. (§5.2.)
16. **Praise/callout copy made activity-aware** (no hard-coded "counting" after a match). (§7.3.)
17. **First art wave pinned**: 3 new friends + 1 themed pack of 3 sprites (6 SVGs) behind exactly 2
    unlock thresholds. (§8.)
18. **First-run starting-level seed** added so a child who has outgrown v1 doesn't start at L1. (§6.5.)
19. **Test seams enumerated** as concrete `data-*` attributes + `role="status"` aria-live regions;
    `revealMs`/Count-Along ticks routed through the fake-timer-able `TIMING` block; an
    rng-injectable `pickActivity`; explicit no-fail guard test. (§5.9, §13, §14.)
20. **Arithmetic gate** expanded to require Match Up mastery, and gated by a **simple settings
    toggle for the release** (mastery-based rung-gating deferred to Phase 4). (§6.6.)

---

## 1. Context & goal

Counting Friends v1 is a calm, no-fail, wordless tap-to-count game for a young child. One mechanic:
*"How many ducks?" → tap the number*, across three number ranges (1–5 / 1–10 / 1–20). It is live as a
PWA and wrapped as a native iPad app via Capacitor 7.

The child (referred to by his configured name, e.g. **Jayden**, 5) has **outgrown** v1. The parent
wants v2 to:

1. Add **more challenges** (more activity types, not just "how many?").
2. Add **more images to recognize and quiz him on** (more countable variety + number recognition).
3. Add a **reward system**: a **streak / consecutive-correct callout that says his name**, encourages
   him, and **progresses him to the next level**.
4. Add **left↔right matching** sections for *counting* and *recognition*, to test whether he's making
   the connection between quantity and symbol.
5. Be **more engaging** and **age-appropriate for a 5-year-old**, with more activities that build real
   **math knowledge**.

**Decisions already made with the parent (2026-06-24):**

| Decision | Choice |
| --- | --- |
| Math scope | **Full ladder** — number sense first; arithmetic unlocks as he masters earlier rungs. |
| Reward style | **Collectibles to chase** — stars, unlockable friends, a sticker book. |
| Matching input | **Tap-then-tap** with a ribbon link (no drag — most reliable for little fingers). |
| Progression | **App adapts automatically** — streaks/mastery raise difficulty; struggles ease it back. |

**Interpretation call (RESOLVED):** "recognition" means **number recognition** (numerals → quantities
→ number-words), *not* object-naming ("tap the apple"). Object-naming is a non-goal (§16) unless the
parent later asks.

---

## 2. Design principles (the v1 DNA — HARD CONSTRAINTS)

Every new feature must honor these. They win every tie.

- **No-fail, no pressure.** No score the child can watch tick down, no "you lost," no punishing
  timers. A wrong tap = gentle wobble + soft "whoops" + re-ask. **Stars only ever go up.**
- **Wordless & audio-first.** A 5-year-old can't read. Navigation is pictures + icons + spoken
  prompts. Any new screen must be usable with zero reading.
- **Calm aesthetic.** Existing palette, Baloo 2 / Quicksand fonts, soft storybook scene, chunky tap
  targets. New visuals extend existing design tokens; no new visual language.
- **iPad-first, big tap targets.** All interactive elements ≥ 88px; safe-area insets respected.
- **Offline, on-device, private.** No accounts, no network, no analytics. All progress in
  `localStorage`.
- **Reduce-motion aware.** Every animation has a calm/disabled fallback driven by
  `prefersReducedMotion()` (in-app toggle OR OS preference — existing merge logic in PlayScreen).
- **Parental gate.** Anything "for grown-ups" stays behind the existing 3-second press-and-hold gate.
- **Dual build stays green.** Web PWA build and `build:native` (Capacitor) both keep working.
- **Test discipline.** The existing v1 unit + Playwright tests stay green except where this spec
  *explicitly* schedules their replacement (StartScreen/tier tests, §15 Phase 1b). All new logic is
  TDD'd (tests first).

---

## 3. Pedagogical grounding & ladder

Kindergarten-age math readiness rests on a known progression. v2's ladder maps to it. The number in
brackets is the **introduction/unlock order** for this specific child, who has already mastered rote
counting 1–20 — note subitizing is introduced **alongside** count/numeral, not after.

1. **One-to-one correspondence** — touch each object once while counting. → *Count-Along* (optional
   remediation only; see §5.1). [fast-follow]
2. **Cardinality** — last number counted = the total. → *Count It*. [release, from start]
3. **Subitizing** — instantly seeing "3" without counting. → *Quick Look*. [release, from start —
   highest-value novel skill for this child]
4. **Numeral recognition** — the symbol "7" means seven. → *Find the Number*. [release, from start]
5. **Quantity↔symbol mapping** — connecting a group to its numeral. → *Match Up*. [release —
   directly answers the parent's "is he connecting quantity to symbol?" question]
6. **Comparison** — more / fewer / same. → *More or Fewer*. [Phase 3 fast-follow]
7. **Ordering & sequence** — order, before/after, what's next. → *Put It in Order*. [Phase 3]
8. **Early operations** — one more/one less, then joining/separating. → *One More/One Less*,
   *Add & Take Away*. [Phase 4, gated]

Each is concrete and visual (countable friends), never abstract symbol manipulation.

---

## 4. The Activity framework (architecture)

v1 has exactly one game baked into `round.ts` / `PlayScreen.tsx`. v2 introduces an **Activity**
abstraction so each challenge is self-contained and independently testable, while the shared engine
keeps owning the calm loop (audio, confetti, haptics, streak/stars, adaptive level, persistence, idle
re-prompt).

### 4.1 Concrete types (PIN THESE — do not invent variants)

```ts
// ---- src/game/activities/types.ts ----
import type { Character, Rng } from '../types';

export type ActivityId =
  | 'count' | 'numeral' | 'match' | 'quicklook'
  | 'compare' | 'order' | 'onemore' | 'add';

/** Adaptive difficulty level. Integer ≥ 1. Plain alias (no brand). */
export type Level = number;

/** What an activity component sends back to the engine on a tap/connect. */
export type AnswerPayload =
  | { kind: 'tile'; value: number }                       // count, numeral, quicklook, compare, onemore, add
  | { kind: 'pair'; leftId: string; rightId: string }     // match (one connect)
  | { kind: 'sequence'; values: number[] };               // order (build mode, running sequence)

/** Spoken + visual/assistive prompt for a round. */
export interface SpeechAndCue {
  /** Spoken via TTS (and the on-screen cue if any). */
  speech: string;
  /** aria-live text for assistive tech (usually === speech). */
  aria: string;
}

/** Result of evaluating ONE answer payload against a round. */
export interface EvalResult {
  /** Was THIS payload correct? (a correct single connect; a correct tile.) */
  correct: boolean;
  /** Is the whole round now finished? (single-tap activities: === correct.) */
  roundComplete: boolean;
}

/** Discriminated union — each activity has its own round shape (§5). */
export type Round =
  | CountRound | NumeralRound | MatchRound | QuickLookRound
  | CompareRound | OrderRound | OneMoreRound | AddRound;

export interface ActivityModule<R extends Round = Round> {
  id: ActivityId;
  /** Pure round generator — deterministic given rng. */
  generate(level: Level, rng: Rng): R;
  /**
   * Pure evaluation of one answer payload. Replaces the v1 single-boolean
   * `isCorrect`. Single-tap activities return `roundComplete === correct`.
   * Multi-step activities (match, order) track completion internally via the
   * round + the payload; see each activity's contract in §5.
   */
  evaluate(round: R, answer: AnswerPayload): EvalResult;
  /** Spoken + assistive prompt for this round. */
  prompt(round: R, childName?: string): SpeechAndCue;
}
```

**Why `evaluate()` and not `isCorrect()`:** Match Up and Order are multi-step — a single connect can
be correct while the round is not yet done. A single boolean cannot express that, which would force
activity-specific state into `useGame`. `EvalResult` makes the seam uniform: the engine always calls
`activity.evaluate(round, payload)`, reads `.correct` to drive the (silent for Match Up — §5.3)
feedback and star accrual, and `.roundComplete` to fire the shared celebration and deal the next
round.

- **Generators are pure, rng-injectable** → unit-tested for invariants exactly like v1's
  `generateRound`. Document a **stable rng draw-order** per generator (§5.9) and prefer 500× fuzz
  tests over crafted-`stubRng` tests (which couple to draw order).
- **Rendering:** each activity has a presentational React component (`<CountActivity>`,
  `<MatchActivity>`, …) receiving a `Round` + `onAnswer(payload: AnswerPayload)` callback. It does
  **not** own timers, audio, or the celebration — those stay in the shared engine.
- **Registry:** typed as `Record<ActivityId, ActivityModule<Round>>`. The engine only ever holds
  `ActivityModule<Round>`; each module's `generate`/`evaluate` narrows internally on `round.kind`.
  **Do not reach for `as` casts** — narrow on the discriminant.

### 4.2 Correctness moves OUT of useGame

Today `useGame.ts:167` computes `const correct = value === s.count` inline and the reducer's `CHOOSE`
carries a `correct` boolean. In v2 the engine computes correctness via `activity.evaluate(...)`. The
reducer keeps receiving a computed `correct` boolean (and now also `roundComplete`); the **activity
component never decides correctness**.

Worked example proving `count` reproduces v1 exactly:

```ts
// ---- src/game/activities/count.ts ----
export const count: ActivityModule<CountRound> = {
  id: 'count',
  generate(level, rng) {
    const { max, choiceCount } = countParams(level);   // §6.3 table
    const n = 1 + Math.floor(rng() * max);              // draw 1: count
    const animal = CHARACTERS[Math.floor(rng() * CHARACTERS.length)]; // draw 2: animal
    const choices = buildChoices(n, choiceCount, max, rng); // draws 3+: distractors, then SHUFFLE
    return { kind: 'count', count: n, animal, choices };
  },
  evaluate(round, answer) {
    const correct = answer.kind === 'tile' && answer.value === round.count;
    return { correct, roundComplete: correct };          // single-tap: complete === correct
  },
  prompt(round) {
    const line = 'How many ' + round.animal.plural + '?'; // === v1 promptLine
    return { speech: line, aria: line };
  },
};
```

> **1a parity note:** during Phase 1a the `count` module is driven by knobs derived from the existing
> `Tier` (easy→max5/3choices, medium→max10/4, hard→max20/4) and choices are **kept sorted** to match
> v1 byte-for-byte. The shuffle (§5.9) is introduced in 1b together with the Level swap. The 148 v1
> tests therefore stay green through 1a.

### 4.3 Non-negotiable: the shared celebration path

A `roundComplete` correct answer always routes through the **one** existing celebration sequence
(confetti + pop tone + spoken praise + haptic) so every activity feels the same. Activities never
re-implement feedback. The **celebration arbiter** (§7.6) guarantees at most one *big* overlay per
answer.

### 4.4 GameState v1 → v2 field fate (de-risking the migration)

Animation/feedback fields are activity-agnostic and **stay flat** on `GameState`. A `round: Round`
field is **added alongside**. During 1a, `count`/`choices`/`animal` are kept as derived duplicates so
`NumberButton`/`PlayScreen` and their tests are untouched; in 1b the count component reads from
`round`.

| v1 field | Fate in v2 | Notes |
| --- | --- | --- |
| `screen: 'start'\|'play'` | **changes** → `'home'\|'play'\|'stickers'` (1b) | replaces start with Home Board |
| `tier: Tier` | **removed** (1b) | superseded by per-activity `Level`; kept in storage for migration only |
| `count: number` | stays flat (1a) → derived from `round` (1b) | count activity convenience |
| `choices: number[]` | stays flat (1a) → derived from `round` (1b) | count activity convenience |
| `animal: Character` | stays flat (1a) → derived from `round` (1b) | count activity convenience |
| `status` | stays flat | now `'asking'\|'correct'` per round, activity-agnostic |
| `animatingValue` | stays flat | feedback animation |
| `animType` | stays flat | feedback animation |
| `animKey` | stays flat | CSS retrigger |
| `roundId` | stays flat | keys slots; still bumps per round |
| `gateProgress`/`settingsOpen` | stays flat | parental gate |
| `childName`/`reduceMotion`/`voiceOn`/`speaking` | stays flat | prefs |
| — | **new:** `round: Round` | the active activity's round |
| — | **new:** `activityId: ActivityId` | which activity is in play |
| — | **new:** `streak: number` | consecutive correct (§7.2) |
| — | **new:** `stars: number` | monotonic (§7.1) |
| — | **new:** `mastery: Record<ActivityId,{level:Level;window:boolean[]}>` | adaptive (§6) |
| — | **new:** `matchProgress?: { linked: {leftId,rightId}[] }` | Match Up only (§5.3) |

### 4.5 Reducer actions (v1 → v2)

```ts
export type Action =
  // --- removed in 1b (their tests are replaced, §15): 'PICK_TIER' ---
  | { type: 'GO_HOME' }                                  // replaces hardcoded BACK→'start'
  | { type: 'ENTER_ACTIVITY'; activityId: ActivityId }   // home tile → play
  | { type: 'DEAL_ROUND'; round: Round; activityId: ActivityId }
  | { type: 'CHOOSE'; payload: AnswerPayload; correct: boolean; roundComplete: boolean }
  | { type: 'LINK_PAIR'; leftId: string; rightId: string; correct: boolean }  // match: record a connect
  | { type: 'AWARD_STARS'; n: number }
  | { type: 'SET_STREAK'; streak: number }
  | { type: 'SET_MASTERY'; activityId: ActivityId; level: Level; window: boolean[] }
  | { type: 'OPEN_STICKERS' } | { type: 'CLOSE_OVERLAY' }
  // --- unchanged from v1 ---
  | { type: 'CLEAR_ANIM' }
  | { type: 'GATE_PROGRESS'; p: number } | { type: 'GATE_OPEN' } | { type: 'GATE_RESET' }
  | { type: 'CLOSE_SETTINGS' }
  | { type: 'SET_NAME'; name: string }
  | { type: 'TOGGLE_RM' } | { type: 'TOGGLE_VOICE' }
  | { type: 'SET_SPEAKING'; speaking: boolean };
```

> `BACK`'s v1 hardcoding (`gameState.ts:104` → `screen:'start'`) is replaced by `GO_HOME`
> (→ `screen:'home'`). The existing useGame BACK test is rewritten against `GO_HOME` in 1b.

### 4.6 Where it lives

```
src/game/
  activities/
    types.ts            ActivityId, Level, AnswerPayload, SpeechAndCue, EvalResult, Round union, ActivityModule
    index.ts            registry: Record<ActivityId, ActivityModule<Round>> + pickActivity(unlocked, rng)
    count.ts            Count It            (+ count.test.ts)        [release]
    numeral.ts          Find the Number     (+ numeral.test.ts)      [release]
    match.ts            Match Up            (+ match.test.ts)        [release — built last]
    quicklook.ts        Quick Look          (+ quicklook.test.ts)    [release]
    compare.ts          More or Fewer       (+ compare.test.ts)      [Phase 3]
    order.ts            Put It in Order     (+ order.test.ts)        [Phase 3]
    onemore.ts          One More / One Less (+ onemore.test.ts)      [Phase 4]
    add.ts              Add & Take Away     (+ add.test.ts)          [Phase 4]
  progression.ts        adaptive level/mastery (pure)               (+ progression.test.ts)
  rewards.ts            stars, streak, unlock rules (pure)          (+ rewards.test.ts)
  content.ts            friends + packs + unlock thresholds (data)  (+ content.test.ts)
  gameState.ts          extended state + reducer
  useGame.ts            engine: timers, audio, evaluate(), adaptive, persistence
  persistence.ts        v2 keys + migration + loadV2State()
src/screens/
  HomeBoard.tsx         wordless Play Board
  PlayScreen.tsx        thin host: active activity component + shared chrome
  StickerBook.tsx       collection gallery
src/components/
  activities/           per-activity presentational components
  RibbonLink.tsx        connecting ribbon for Match Up
  StarJar.tsx           star count display
  LevelUpBanner.tsx     level-up / streak callout overlay
  UnlockReveal.tsx      "you unlocked a new friend!" reveal
```

---

## 5. Activity catalog

Each entry: prompt, interaction, round shape, correctness, knobs (from adaptive `Level`, §6),
pedagogy. **Release activities:** `count`, `numeral`, `quicklook`, `match`. The rest are fast-follow.

### 5.1 Count It — `count` *(release)*
- **Prompt (spoken):** "How many {plural}?" (v1 behavior, unchanged baseline.)
- **Interaction:** N friends on screen → tap the numeral among 3–5 choice tiles. **Tap-only.**
- **Round:**
  ```ts
  interface CountRound { kind: 'count'; count: number; animal: Character; choices: number[]; }
  ```
- **Correct:** tapped tile value === `count`. `roundComplete === correct`.
- **Knobs (from Level):** `max`, `choiceCount`.
- **Pedagogy:** cardinality.
- **Count-Along — DEFERRED to fast-follow, OFF by default.** *Resolution of draft Q2:* the child has
  outgrown rote counting 1–20, so forcing tap-each-friend counting is the exact friction the parent
  is escaping. Count-Along is **cut from the release**. When built (Phase 3), it is **off by default**
  and **auto-offered only as remediation after a wrong Count It answer** (or for counts ≥ 8 where
  one-to-one tracking still helps a strong counter) — never a forced default. Its multi-step
  tap→tick→count flow (its own `data-counted` per-friend attribute + a tick on the `TIMING` block)
  reuses the same multi-step machinery proven by Match Up, so it is cheaper to add after Match Up
  exists.

### 5.2 Find the Number — `numeral` *(release)*
- **Prompt:** "Find the **seven**!" (numeral spoken by name; optionally a friend holds a sign showing 7.)
- **Interaction:** 3–5 big number tiles; tap the one matching the spoken numeral.
- **Round:**
  ```ts
  interface NumeralRound { kind: 'numeral'; target: number; choices: number[]; lookAlike: boolean; }
  ```
- **Correct:** tapped tile value === `target`. `roundComplete === correct`.
- **Knobs:** `max`, `choiceCount`, `lookAlike` (off below numeral L3).
- **Pedagogy:** numeral recognition (symbol → name).
- **Look-alike distractors — DEFERRED to fast-follow.** *Resolution of draft Q8:* split the pair —
  **keep 6/9** (a real orientation discrimination 5-year-olds genuinely confuse), **drop 2/5**
  (arbitrary, low payoff). Even 6/9 is **cut from the release**: it is extra generator logic for
  marginal value and risks penalizing a normal perceptual stage. When added (Phase 3) it is gated
  behind numeral **L3+** only, drawn from a `CONFUSABLE_PAIRS = [[6,9]]` data table, and 6/9 is never
  shown without an orientation anchor (a baseline/ground line under each numeral or an upright sign).
  Release ships plain distractors only (`lookAlike` always `false`).

### 5.3 Match Up — `match` *(release — the headline parent ask; BUILD LAST, §15)*
- **Prompt:** "Match each group to its number!"
- **Interaction:** **tap-then-tap** (no drag). Left column = 2–4 groups of friends (different
  quantities). Right column = the matching numerals, shuffled. Tap a left item → it highlights
  (`data-selected`) → tap a right item:
  - **Correct connect:** a **ribbon** draws between them (`RibbonLink`, keyed by pair), a soft
    **link-chime** plays, both tiles lock as linked, the left selection clears.
  - **Wrong connect — SILENT NON-EVENT (no-fail tie-breaker, resolves draft Q3):** the ribbon does
    **not** form, the right tile gives a gentle neutral wobble (reuse `cf-wrongWobble` at reduced
    amplitude) and de-selects, the left selection clears, **no whoops, no "not quite", no negative
    aria-live, and the streak is NOT reset by an in-round mis-connect.** The child simply tries again.
    The child hears **only success and silence** within a round.
  - **Round-complete:** when all pairs are linked, fire the shared celebration once.
- **Variants:** **release ships ONLY `groupNum`** (group-of-friends ↔ numeral — the exact parent ask).
  `dotsNum` and `numWord` are **cut to fast-follow** (the word-card variant adds a whole word-asset +
  audio surface — YAGNI for the release).
- **Round:**
  ```ts
  interface MatchItem { id: string; kind: 'group' | 'numeral'; value: number; }
  interface MatchRound {
    kind: 'match';
    variant: 'groupNum';                 // release; 'dotsNum'|'numWord' later
    left: MatchItem[];                   // groups (rendered as N friends), shuffled
    right: MatchItem[];                  // numerals, shuffled
    /** correct pairing: leftId → rightId */
    solution: Record<string, string>;
  }
  ```
- **Correctness contract:** `evaluate(round, { kind:'pair', leftId, rightId })` →
  `{ correct: round.solution[leftId] === rightId, roundComplete: <all solution pairs linked> }`.
  The engine tracks linked pairs in `state.matchProgress.linked`; the activity component is stateless
  about completion. (`roundComplete` is computed by comparing linked set size to `Object.keys(solution).length`,
  counting only correct links.)
- **Knobs:** `pairCount` (2–4, orientation-aware: **max 3 in iPad portrait**, 4 allowed in landscape —
  see §12.2), `max`.
- **Pedagogy:** quantity↔symbol mapping — directly tests "is he making the connection?"
- **Star accrual:** stars are awarded **per round-complete** (not per correct pair), keeping the
  economy uniform across single-tap and multi-step activities (§7.1).

### 5.4 Quick Look (subitize) — `quicklook` *(release)*
- **Prompt:** "Quick! How many did you see?"
- **Interaction:** friends/dots appear for a reveal window (`revealMs`), then hide; choice tiles appear.
- **Round:**
  ```ts
  interface QuickLookRound {
    kind: 'quicklook'; count: number; choices: number[];
    revealMs: number; arrangement: 'dice' | 'random';
  }
  ```
- **Correct:** tapped tile value === `count`. `roundComplete === correct`.
- **Knobs (recalibrated for a 5-year-old — resolves pedagogy minor):**
  | Level band | count range | arrangement | revealMs |
  | --- | --- | --- | --- |
  | low (L1–2) | 1–4 | dice | 800–1000 |
  | mid (L3–4) | up to 5 | dice/random | 1000–1200 |
  | high (L5+) | 6–10 | grouped/random | 1500+ |
  **Hard rule:** never pair a sub-second (`revealMs < 1000`) reveal with `count > 5`. `revealMs` is
  always > 0 and is **data on the round** (unit-asserted); the reveal→hide transition runs on an
  engine timer in the `TIMING` block (fake-timer-able), **not** a component real-timer.
- **Pedagogy:** subitizing. (Promoted to a from-start release activity — highest-value novel skill for
  this child; §3, §6.4.)
- **Safety:** not a punishing timer — a **"Want to peek again?"** affordance deterministically replays
  the reveal. No fail state.

### 5.5 More or Fewer — `compare` *(Phase 3 fast-follow)*
- **Prompt:** "Tap the group with **more**!" (also "**fewer**" at higher levels.)
- **Round:** `interface CompareRound { kind:'compare'; left:number; right:number; ask:'more'|'fewer'; }`
- **Correct:** tapped side matches the ask. **Equal counts never generated.** `roundComplete === correct`.
- **Knobs:** `max`, `ask` set, `closeness` (gap of 1 = hardest, high level).
- **Pedagogy:** magnitude comparison.

### 5.6 Put It in Order — `order` *(Phase 3 fast-follow)*
- **Two sub-modes by level:** `build` (tap 3 numerals into ascending slots) and `next`
  ("1, 2, 3, …?" tap the next; also "what comes before").
- **Round:** `interface OrderRound { kind:'order'; mode:'build'|'next'; numbers:number[]; answer:number[]; }`
  (for `next`, `answer` has length 1).
- **Correct (`build`):** `evaluate(round, { kind:'sequence', values })` →
  `correct = values` is a correct ascending prefix of `answer`; `roundComplete = values.length === answer.length`.
- **Correct (`next`):** `{ kind:'tile', value }`, `roundComplete === correct`.
- **Knobs:** `span`, `mode`, gap type (consecutive vs skip-count later).
- **Pedagogy:** ordinality, before/after, sequence.

### 5.7 One More / One Less — `onemore` *(Phase 4 — arithmetic, gated)*
- **Prompt:** "Here are 4. What is **one more**?" (and "one less".)
- **Round:** `interface OneMoreRound { kind:'onemore'; base:number; delta:1|-1; choices:number[]; }`
- **Correct:** tapped === `base + delta`. `roundComplete === correct`.
- **Knobs:** `max`, `delta` set, animated-demo on/off (a friend hops in/away).
- **Pedagogy:** successor/predecessor → foundation of addition. **Must be mastered before `add` unlocks** (§6.6).

### 5.8 Add & Take Away — `add` *(Phase 4 — arithmetic, gated)*
- **Prompt:** "2 and 3 more — how many altogether?" / "5 take away 2 — how many left?"
- **Round:** `interface AddRound { kind:'add'; a:number; b:number; op:'+'|'-'; choices:number[]; }`
- **Correct:** tapped === result. `roundComplete === correct`.
- **Knobs:** `max` — **within-5 floor uses result ≤ 5 with addends ≤ 4** (1+1 … 4+1), then within-10.
- **Pedagogy:** joining/separating sets within 10.

### 5.9 Per-activity generator invariants (layer-1 test contract)

Every generator must satisfy these, asserted via **500× `Math.random` fuzz** (order-independent) plus
2–3 pinned `stubRng` examples. `buildChoices(answer, choiceCount, max, rng)` is a shared helper.

| Activity | answer in `choices`? | ordering | distractor predicate | choiceCount source | extra invariants |
| --- | --- | --- | --- | --- | --- |
| `count` | **yes** | **shuffled** (1b; sorted in 1a parity) | distinct, in `[1..max]`, ≠ answer | `countParams(level)` | `count ∈ [1..max]` |
| `numeral` | **yes** | shuffled | distinct numerals in `[1..max]`, ≠ target; if `lookAlike`, from `CONFUSABLE_PAIRS` | `numeralParams(level)` | `lookAlike ⇒ level ≥ 3` |
| `quicklook` | **yes** | shuffled | distinct, in `[1..max]`, ≠ count | `quicklookParams(level)` | `revealMs > 0`; `revealMs < 1000 ⇒ count ≤ 5`; arrangement ∈ {dice,random} |
| `match` | n/a (pairs) | both columns shuffled | left/right values distinct within column; `solution` is a bijection | `matchParams(level)` | `|left| === |right| === pairCount`; every `solution[leftId]` resolves to a right id; portrait ⇒ `pairCount ≤ 3` |
| `compare` | n/a | n/a | — | — | `left !== right` (never equal) |
| `order` | n/a | shuffled presentation | numbers distinct | `orderParams(level)` | `answer` strictly ascending; `build` answer === sorted(numbers) |
| `onemore` | **yes** | shuffled | distinct, in `[1..max]`, ≠ base+delta | `onemoreParams(level)` | `base+delta ∈ [1..max]` |
| `add` | **yes** | shuffled | distinct, in `[0..max]`, ≠ result | `addParams(level)` | within-5: result ≤ 5, addends ≤ 4 |

**Shuffle rule (all activities):** choice/column order is **shuffled, never sorted**, so tile
position can never leak the answer. Shared assertions for every choice-based generator:
`choices.includes(answer)`, `new Set(choices).size === choices.length`, all in range, and
`choices.length === choiceCount(level)`. **rng draw-order is documented per generator** (e.g. count =
"answer, then animal, then distractors loop, then shuffle"); changing draw order is allowed only with
the fuzz tests as the primary guard.

---

## 6. Adaptive progression engine

### 6.1 Model
- Each activity has an independent **mastery** record per child: a rolling window of the last
  `PROGRESSION.window` **round outcomes** plus the current **Level** (integer ≥ 1).
- **The window records ONE outcome per round — the first attempt only.** Retries within a no-fail
  round do **not** pollute the window (otherwise level-up is unreachable in a game built to let the
  child retry). For Match Up, the round outcome is "did the child complete it" (always true) — Match
  Up does not drive level-up via wrong-connect counting; its level rises on round-completes (treated
  as correct first attempts).
- **Level up:** `≥ PROGRESSION.levelUp.minCorrect` of the last `PROGRESSION.levelUp.ofLast`
  **OR** a clean streak `≥ PROGRESSION.levelUp.cleanStreak` → `level += 1`, fire the level-up callout
  (§7.4). *Loosened from the draft's AND-gate (resolves pedagogy + scope Q6):* for this
  already-outgrown child, **boredom is the bigger risk than over-promotion**, and over-promotion is
  harmless because ease-back is silent.
- **Ease back:** `≤ PROGRESSION.easeBack.maxCorrect` of the **most-recent** `PROGRESSION.easeBack.ofLast`
  → `level = max(1, level − 1)`, **silently** (no "you went down" messaging). A **cooldown** prevents
  oscillation: no level change within `PROGRESSION.cooldownRounds` rounds of a previous change.
- Levels map to per-activity knobs via `levelParams(activityId, level)` (§6.3).

### 6.2 Frozen constants (tests import these — tuning never breaks tests)

```ts
// ---- src/game/progression.ts ----
export const PROGRESSION = {
  window: 6,                                  // rolling outcomes per activity
  levelUp:  { minCorrect: 5, ofLast: 6, cleanStreak: 4 },  // 5/6 OR a clean run of 4
  easeBack: { maxCorrect: 2, ofLast: 6 },     // ≤2 of most-recent 6
  cooldownRounds: 2,                          // no up/down within 2 rounds of a change
  fastFirstClimb: 3,                          // first level-up out of L1 after just 3 correct
  maxLevel: 8,
} as const;

// Pure, fully unit-testable transitions:
export function applyAttempt(window: boolean[], correct: boolean): boolean[];      // push, cap at PROGRESSION.window
export function nextLevel(
  current: Level, window: boolean[], streak: number, roundsSinceChange: number,
): { level: Level; leveledUp: boolean };
```

> The exact numbers are **non-load-bearing** — pick these sane defaults, ship, then hand-tune after
> watching the real child. Tests assert transitions *relative to the constant* (e.g.
> `PROGRESSION.levelUp.minCorrect`), so re-tuning 5/6 → 4/5 never edits a test.

### 6.3 Level → knobs tables (per activity)

```ts
function countParams(level: Level):  { max: number; choiceCount: number }
function numeralParams(level: Level):{ max: number; choiceCount: number; lookAlike: boolean }
function quicklookParams(level: Level):{ max: number; arrangement: 'dice'|'random'; revealMs: number }
function matchParams(level: Level):  { pairCount: number; max: number }
```

| Level | count (max/choices) | numeral (max/choices/lookAlike) | quicklook (max/arr/revealMs) | match (pairCount/max) |
| --- | --- | --- | --- | --- |
| 1 | 5 / 3 | 5 / 3 / false | 4 / dice / 1000 | 2 / 5 |
| 2 | 5 / 4 | 5 / 4 / false | 4 / dice / 900 | 2 / 5 |
| 3 | 10 / 4 | 10 / 4 / false* | 5 / dice / 1100 | 3 / 10 |
| 4 | 10 / 5 | 10 / 4 / false* | 5 / random / 1000 | 3 / 10 |
| 5 | 20 / 5 | 20 / 5 / false* | 8 / random / 1500 | 4** / 10 |
| 6+ | 20 / 5 | 20 / 5 / false* | 10 / random / 1500 | 4** / 20 |

\* `lookAlike` stays `false` for the release (the look-alike feature is fast-follow, §5.2; the L3+
gate is enforced when it ships). \*\* `pairCount` is capped to **3 in iPad portrait** regardless of
level (§12.2).

### 6.4 Activity availability (introduction order)
For the release, `count`, `numeral`, `quicklook`, and `match` are **all available from the start** on
the Home Board (subject to the recommended-tile rotation in §9.1). Subitizing is **not** buried behind
numeral drills. There is no mastery-gating among the release activities.

### 6.5 First-run starting-level seed (resolves draft Q7)
Because this child has *outgrown* v1, the app must not start every rung at L1. On first run (or after
a reset), the parental-gated setup offers a one-tap **"Where is he roughly?"** seed:
*Just starting / Knows numbers / Counts past 10* → seeds the initial `count`/`numeral` level (e.g.
1 / 3 / 5). If skipped, the `cf_tier` migration (§10) maps the old tier to a starting level
(easy→1, medium→3, hard→5). The child-facing flow stays wordless; this is a grown-up setup nudge, not
a child difficulty pick.

### 6.6 Arithmetic gating (Phase 4)
*Resolution of draft arithmetic-gate critique:* the true precursors to "how many altogether?" are
quantity↔symbol **mapping** (Match Up) and successor/predecessor (One More/One Less), not just
numeral recognition. **For the release, arithmetic does not exist.** When Phase 4 ships:
- `add` unlocks only after `count` L4 **and** `numeral` L3 **and** a Match Up mastery baseline **and**
  `onemore` mastered (successor/predecessor is the bridge).
- **Release/Phase-3 simplification:** arithmetic visibility is gated by a **simple settings toggle**
  ("arithmetic on/off", §9.4), *not* a mastery bar, until Phase 4 wires the full mastery gate.

### 6.7 Parent override
Grown-up settings gains **"Set challenge level"**: a **single global override** (pin a level + pause
auto-adaptation) or "Let the app decide" (default). Read at round-generation time. Per-rung pinning is
**cut** (YAGNI for one child).

---

## 7. Reward & collectibles system

### 7.1 Stars
- Earned: **+`REWARDS.starsPerRound`** per round-complete; **bonus** at streak milestones and
  level-ups. (Per-round, not per-correct-pair, so the economy is uniform.)
- **Monotonic — never decrease.** Stored in `cf_stars`.
- Displayed as a friendly **Star Jar** on the Home Board (and a small count in-play). Tapping shows
  the total with a gentle shimmer — no pressure framing.

### 7.2 Streak
- `streak` = consecutive round-completes, **resets to 0 silently on a wrong first-attempt** (no
  negative messaging). A Match Up in-round mis-connect does **NOT** reset the streak (§5.3).

### 7.3 Frozen reward constants + activity-aware copy

```ts
// ---- src/game/rewards.ts ----
export const REWARDS = {
  starsPerRound: 1,
  streakMilestones: [3, 5, 8, 12, 20] as const,
  milestoneBonus: 3,      // bonus stars at each streak milestone
  levelUpBonus: 2,        // bonus stars on level-up
} as const;

/** Activity-aware, name-bearing streak callout. Exported so engine tests assert speak() content. */
export function streakCallout(milestone: number, activityId: ActivityId, name?: string): string;
```

*Resolution of draft §7.2 hard-coded "counting" critique:* callouts are **activity-aware/neutral and
effort-oriented**, never ability-labeling, and never say "counting" after a non-counting activity:
- 3: "Three in a row, {name}! Great job!"
- 5: "Five in a row, {name} — you're amazing!"
- 8: "Wow, {name}! Eight in a row! You're a math star!"
- (With no name set, drop the `, {name}` clause — mirror v1 `praiseLine` behavior.)

`cf_streakBest` tracks the personal best (shown subtly in the Sticker Book as a badge).

### 7.4 Level-up callout
A streak milestone may also trigger a level-up (§6.1) — "Let's try something a little bigger!" —
rendered via `<LevelUpBanner>` (subject to the arbiter, §7.6).

### 7.5 Match Up audio (no-fail)
Positive-only: **soft link-chime on a correct connect**, full shared celebration on round-complete.
**No sound on a wrong connect** (§5.3).

### 7.6 Celebration arbiter (resolves no-fail major — reward pile-up)
On any single answer, **at most ONE big overlay** plays. Priority:
**unlock reveal > level-up > streak milestone.** The highest-priority overlay plays; lower-priority
ones **queue to the next round boundary** (a level-up coinciding with a streak milestone uses **one
combined banner**, not two). Per-answer confetti/star is visibly *quieter* than the milestone burst
(the gradient reads calm → special, never loud → louder). The denser level-up confetti burst is the
**only** confetti firing on that frame — it is not stacked on top of the per-answer burst.

### 7.7 Unlockable friends & themed packs
- New countable content unlocks as stars accumulate. **Unlock reveal:** `<UnlockReveal>` — "You
  unlocked a new friend!" — the friend waves and says its sound. Unlocked content then appears in
  rotation in the counting/quick-look/match activities (more variety = fresher quizzing).
- Thresholds + catalog live in `content.ts`; `cf_unlocks` records owned ids.

### 7.8 Sticker Book (the trophy case)
- A calm, child-accessible gallery (Home Board tile): every unlocked friend/pack as a sticker; locked
  ones are **soft silhouettes** ("keep playing to find me!") — silhouettes are appropriate **here**
  (collecting is the explicit point), unlike the Home Board activity tiles (§9.1).
- Tap a sticker → it animates and plays its sound. Shows star total + best-streak badge.
- No pressure, no leaderboard.

---

## 8. Content: friends & countable packs

- **Base (always unlocked):** Dot (duck), Pip (cat), Hopper (frog), Momo (bunny) — unchanged.
- **First wave — PINNED (resolves draft Q5 + scope):** **3 new friends + 1 themed pack of 3 sprites
  = 6 new SVGs**, behind **exactly 2 unlock thresholds** (one to unlock a friend, one to unlock the
  pack) so **both** unlock code paths and the Sticker Book locked/unlocked states are exercised. Do
  not over-invest in art before the pipeline is proven.
- **SVG conventions:** 100×100 viewBox, 4px ink stroke, dot eyes, blush, recolorable via `--cf-ink`.
  Each friend registered in `characters.ts` with `{ key, name, plural, sound, href }` + a `<symbol>`
  in `CharacterDefs.tsx`.
- **Growth:** the full catalog grows later as **pure data in `content.ts`** — no code change.

### 8.1 content.ts integrity invariants (test contract)
A single data-driven test asserts: ids unique; **base set is always in initial unlocks**; every
referenced sprite `href` resolves to a registered `<symbol>`; every friend has non-empty
`{key,name,plural,sound,href}`; unlock thresholds are **sorted and reachable** by the star economy
(`REWARDS.starsPerRound` + bonuses); every unlock id resolves to a catalog entry.

---

## 9. Navigation & screens

### 9.1 Home Board (replaces the v1 tier-pick StartScreen)
Difficulty is adaptive, so the explicit easy/medium/hard pick is gone. A wordless **Play Board**:
- **3–4 "recommended right now" activity tiles** (icon + a friend, no required text), driven by the
  adaptive engine — **not all activities at once** (resolves choice-overload + near-identical-tile
  critique). The remaining unlocked activities live behind a gentle "more" affordance.
- **Audio-on-tap preview (resolves wordless-board critique):** tapping a tile **speaks its
  name/invitation** ("Match Up! Let's match numbers!") via the existing TTS path before/at entry, so
  selection is audio-mediated like the rest of the app.
- **Locked activities are HIDDEN until unlocked (resolves draft Q4).** No wrapped-present tiles — a
  present a child can't open is a built-in tiny failure and is anti-no-fail. When a rung opens, the
  new activity is introduced with its own positive `<UnlockReveal>` ("A new game! Let's play
  Match Up!"). (For the release, all four release activities are available, so this matters for the
  Phase-3/4 fast-follows.)
- A **Star Jar** tile (→ stars) and a **Sticker Book** tile (→ collection).
- Grown-up gate entry (existing 3s hold) in a corner.
- **"Surprise Me!" — CUT** (the recommended-tile grid already provides variety; removing it drops an
  rng-selection seam and a tile state — YAGNI).
- **Preserve v1 warmth:** fold the StartScreen's floating-duck mascot + "Counting Friends" lockup into
  the Home Board (or a brief splash) so the upgrade doesn't feel colder than v1.

### 9.2 PlayScreen (host)
A **thin host**: renders the active activity's component + shared chrome (back, replay pill, star
count, parental gate, confetti canvas, banners). All celebration/feedback stays here. `GO_HOME`
returns to the Home Board.

### 9.3 Sticker Book — §7.8. Reachable from Home Board; back → Home Board.

### 9.4 Settings additions (behind existing gate)
- Existing: child name, voice on/off, reduce motion.
- **New:** challenge level (single global override / "let the app decide"), which activities are
  enabled, reset progress (double-confirm), **arithmetic on/off** (gates Phase-4 activities until the
  mastery gate ships, §6.6).

### 9.5 Navigation model
Extend the existing simple state machine: `screen: 'home' | 'play' | 'stickers'` (+ overlays:
settings, gate, level-up banner, unlock reveal). `GO_HOME` replaces v1's hardcoded `BACK→'start'`.
**No router library** (keeps v1 simplicity).

---

## 10. Data model & persistence

All `localStorage`, `cf_`-prefixed, defensive read/write (existing pattern, `persistence.ts`). A
**schema version + migration** preserves the child's existing on-device prefs.

| Key | Shape | Purpose |
| --- | --- | --- |
| `cf_schema` | `"2"` | schema version; migrate from absent/`"1"`. |
| `cf_name` | string | child's name (existing). |
| `cf_voice` | `'0'\|'1'` | voice on/off (existing). |
| `cf_rm` | `'0'\|'1'` | reduce motion (existing). |
| `cf_tier` | legacy | kept for migration only; superseded by per-activity levels. |
| `cf_stars` | number | total stars (monotonic). |
| `cf_streakBest` | number | best streak. |
| `cf_mastery` | JSON | `{ [activityId]: { level: number; window: boolean[] } }`. |
| `cf_unlocks` | JSON | `{ friends: string[]; packs: string[]; activities: string[] }`. |
| `cf_settings` | JSON | see shape below. |

```ts
interface CfSettings {
  levelOverride?: { global: number };          // single global pin; absent = "let the app decide"
  enabledActivities?: ActivityId[];             // absent = all unlocked
  arithmetic?: boolean;                          // absent/false = arithmetic hidden
}
```

### 10.1 Defensive load + migration (hardening — resolves architecture major)
- `loadV2State()` **JSON.parses each key inside its own try/catch**, returning typed defaults on any
  failure (mirrors `loadPrefs`). A corrupt `cf_mastery` must **never throw** and wipe progress — it
  falls back to defaults.
- **Migration:** on load, if `cf_schema !== "2"`: seed defaults, map old `cf_tier → starting level`
  (**easy→1, medium→3, hard→5**, matching §6.3), set base unlocks, write `cf_schema="2"`. Pure,
  unit-tested.
- **Reset progress** clears the v2 keys but keeps `cf_name`/`cf_voice`/`cf_rm`.
- **Required tests:** migration round-trip (old keys → migrate → assert new shape + name/voice/rm
  preserved) **AND a malformed-JSON test** (corrupt `cf_mastery`/`cf_settings`/`cf_unlocks` → defaults,
  no throw).

---

## 11. Audio & voice lines

- Reuse the existing dual engine (Web Speech / native Capacitor TTS) + WebAudio SFX — **no new audio
  tech**. New work is **scripts + when to speak**.
- New spoken content (parameterized by `{name}` where relevant) in `constants.ts`: per-activity
  prompts (§5), streak/level-up callouts (§7.3), unlock lines ("You found a new friend — say hi to
  {friendName}!"), Home-Board tile audio previews (§9.1).
- **New SFX seam:** Match Up's link-chime is a **new** WebAudio tone. The `AudioEngine` interface
  gains an **optional** method `playChime?()` (optional like the existing `setEnabled?`), so
  `silentAudio`, the web engine, and the native composite engine are not all forced to change and
  existing audio tests stay green. (Reusing `playChirp` for the chime is acceptable if preferred —
  state which in the PR; default is `playChime?`.) **No audio files.**
- Voice remains fully optional (existing `cf_voice` toggle); SFX still play when voice is off.

---

## 12. Visual / UX details

- Extend `tokens.css` only (no new design language): tokens for ribbon color, star gold, sticker
  frame.
- Confetti reused; level-up uses a denser/longer burst (within existing `CONFETTI` config), and per
  the arbiter (§7.6) it is the **only** burst on that frame.
- Layout: Home Board grid + activity components fit iPad **portrait & landscape**, safe areas, ≥88px
  targets.

### 12.1 Per-animation reduce-motion table (resolves no-fail major)
Every new animation has an explicit RM fallback (mirroring `tokens.css`'s `--cf-advance` /
`--cf-advance-rm` pairing). The RM form must still convey the affordance.

| Animation | Full motion | Reduce-motion fallback |
| --- | --- | --- |
| Ribbon draw (Match Up) | ribbon draws between tiles | ribbon appears **instantly fully-formed** (must still render — it IS the success affordance) |
| Star fly-into-jar | particle flies to jar | jar count increments with a single gentle scale-pulse, no particle |
| Unlock reveal pop | sticker pops/bounces in | sticker **cross-fades** in at full size, no pop |
| Level-up banner | banner slides in | banner **fades in place**, no slide |
| Denser level-up confetti | longer/denser burst | collapses to `CONFETTI.sparkles` (existing RM branch) |

### 12.2 Match Up tap-target & orientation constraints
- Each Match Up tile **≥ 88px** (`--cf-target-min`) on **both** orientations, with **≥ 16px**
  inter-target gap to prevent mis-taps between stacked tiles.
- **Orientation-aware `pairCount`:** if 4 tiles/column cannot fit iPad **portrait** at ≥88px after
  safe-area + ~96px top chrome, cap Match Up at **3 pairs in portrait**; allow 4 only in **landscape**.
  Never shrink targets below the token to fit more pairs.

---

## 13. Accessibility & safety

- No-fail everywhere; no negative audio/visual messaging; stars never decrease.
- Reduce-motion honored for every new animation (§12.1).
- Parental gate guards all settings; reset-progress double-confirms.
- Fully offline; no new network; the only PII is the name, on-device; no analytics.
- **aria-live (`role="status"`, polite)** announcements, using the existing `key={roundId}` remount
  trick so identical consecutive announcements aren't deduped:
  - each activity's spoken prompt (remount on `roundId`);
  - streak/level-up/unlock events ("Five in a row!", "New friend unlocked!");
  - Match Up correct connect ("matched!"); **no announcement on a wrong connect** (silent non-event).

---

## 14. Testing strategy (TDD)

Every spec item ships **tests first**. The existing v1 suites stay green **except** the StartScreen /
tier-card / `PICK_TIER` tests, which are **deliberately replaced** in Phase 1b against the new Home
Board entry point (do not silently delete — rewrite so no-fail/correct-tap/back/gate behaviors stay
continuously covered).

1. **Pure unit (Vitest) — the bulk:**
   - Each generator: the §5.9 invariant table, via 500× fuzz + 2–3 pinned `stubRng` examples.
   - Each `evaluate`: truth table incl. `roundComplete` (single-tap: `=== correct`; Match Up: partial
     vs complete).
   - `progression.ts`: crafted windows → `nextLevel`/`applyAttempt` transitions, ease-back, cooldown,
     fast-first-climb — asserted relative to `PROGRESSION` constants.
   - `rewards.ts`: star accrual (per round), streak milestones, bonus amounts, unlock thresholds —
     relative to `REWARDS`.
   - `content.ts`: §8.1 integrity invariants.
   - `persistence.ts`: v1→v2 migration round-trip **+ malformed-JSON fallback** (§10.1).
2. **Component (Testing Library):** each activity component renders a round, fires `onAnswer` with the
   correct payload; **Match Up** flow: tap left → assert `data-selected` → tap right →
   assert `onAnswer({kind:'pair',…})` + ribbon present (correct) OR no ribbon + de-select (wrong);
   Home Board renders recommended vs hidden tiles + audio-preview on tap; Sticker Book
   locked/unlocked; `LevelUpBanner`/`UnlockReveal` show & dismiss with `role="status"`.
3. **Engine (`useGame`):** `evaluate()` routing; streak increment/reset (and **no** reset on Match Up
   mis-connect); star award; level-up trigger **speaks the name line** (`audio.calls.speak` contains
   the configured name; plus a no-name fallback case); adaptive level feeds next round; `revealMs`
   hide via `vi.advanceTimersByTime`; persistence writes.
4. **No-fail guard (REQUIRED):** an automated test asserting **no whoops / no negative aria-live
   fires on a wrong Match Up connect**, and that **`stars` never decreases** across a scripted
   wrong-then-right sequence. Encode the DNA as a guard, not prose.
5. **E2E (Playwright):** keep the existing flows green (ported to the Home Board entry in 1b); play
   **each release activity** to a correct answer reading counts/numerals **from the DOM** (never
   assume which tile is correct); trigger a streak callout and assert the spoken/banner text contains
   the name; trigger an unlock and assert `cf_unlocks` written + `UnlockReveal` shown; open Sticker
   Book; parent global level override. **Match Up has a dedicated E2E (written before the component)**
   that links all pairs via tap-then-tap and asserts round-complete, at **iPad portrait AND landscape**.
6. **Build verification:** `npm run typecheck && npm run test && npm run build && npm run build:native`
   all pass; a Playwright smoke renders the Home Board and one round of each release activity.

**Coverage:** add `coverage.thresholds` in `vite.config.ts` for `src/game/activities/**`,
`progression.ts`, `rewards.ts`, `content.ts`, `persistence.ts` so "green" is machine-checked, not
prose.

### 14.1 Stable test seams (enumerated)
`data-match-left` / `data-match-right` (Match Up items), `data-selected` (highlighted left item),
`RibbonLink` test id keyed by pair (`data-linked-pair`), `data-phase="revealed|hidden"` (Quick Look),
`data-locked` is **not used** (locked activities are hidden, §9.1), `role="status"` aria-live regions
for streak/level-up/unlock. `pickActivity(unlocked: ActivityId[], rng): ActivityId` is pure and
rng-injectable so tests assert it only ever returns an unlocked id.

---

## 15. Build phasing & milestones

**Definition of "iPad-ready" (the release cut-line):**
**Phase 1a + 1b + 2a + the Find-the-Number, Quick-Look, and Match-Up slice of 2b.** This satisfies
every headline parent ask: more challenge types, more variety, a name-saying progressing streak,
left↔right matching, and collectibles. **Hard floor** (if context/time runs short): Phase 1 + 2a +
**Match Up** — protect this, do not thin test coverage across everything. Compare/Order (Phase 3) and
Arithmetic (Phase 4) are TDD'd fast-follows.

Phases are dependency-ordered; each has a **runnable, binary exit gate**.

### Phase 1a — Activity framework behind the existing Tier engine
Introduce `Round` union + `ActivityModule`/`evaluate` + registry + the `count` module, and route the
**existing** reducer/`useGame`/`PlayScreen` through it while `count`'s knobs are still derived from
`Tier` and choices stay **sorted** (1a parity, §4.2). **No Tier→Level swap, no Home Board yet.**
**Exit gate:** `npm run typecheck && test && build && build:native` all green **with the v1 test files
unchanged and passing**; a Playwright smoke plays one count round to a correct answer.

### Phase 1b — Tier→Level + Home Board
Swap `Tier`→`Level` (§4.4 field-fate), introduce adaptive `progression.ts`, the Home Board (recommended
tiles + audio preview), `GO_HOME`, the first-run starting-level seed (§6.5), persistence v2 +
migration + malformed-JSON guard. **Retire** `PICK_TIER`/tier cards and **replace** the StartScreen
E2E/unit tests against the Home Board (do not delete silently). Introduce the shuffle (§5.9).
**Exit gate:** all tests green (with replaced StartScreen tests); a Playwright smoke renders the Home
Board and enters `count` via its tile; migration round-trip + malformed-JSON tests pass.

### Phase 2a — Reward spine (the headline carrot; low UI risk)
Stars (monotonic), streak counter + **name callouts**, `StarJar`, `LevelUpBanner`, the **celebration
arbiter** (§7.6), first art wave (6 SVGs, §8) + 2 unlock thresholds, `UnlockReveal`, Sticker Book wired
to real unlocks, per-animation RM fallbacks (§12.1).
**Exit gate:** an E2E asserts a 3-in-a-row streak fires a banner whose spoken line contains the
configured name; crossing a star threshold writes `cf_unlocks` and shows `UnlockReveal`; the no-fail
guard test (§14.4) passes; all builds green.

### Phase 2b — New activities (Match Up LAST)
Build **Find the Number**, then **Quick Look**, then **Match Up** as its own sub-milestone with its
dedicated E2E **written first** (TDD). Adaptive level-up rides here.
**Exit gate:** a per-activity E2E plays each new activity to a correct answer; **Match Up's E2E links
all pairs via tap-then-tap and asserts round-complete at iPad portrait AND landscape**; no merged code
with red tests.

### Phase 3 — Compare & order (fast-follow)
More or Fewer; Put It in Order; plus the deferred **Count-Along** (remediation, §5.1) and **look-alike
6/9 distractor** (gated, §5.2). Same TDD pattern + exit gates.

### Phase 4 — Arithmetic rung (fast-follow, gated)
One More/One Less; Add & Take Away; the full mastery-based rung gate (§6.6) replacing the settings
toggle.

> **No merged code with red tests** is a hard gate at every phase, not a target.

---

## 16. Non-goals (YAGNI)

- No accounts, cloud sync, multi-child profiles, or parent dashboards/analytics.
- No object-naming/vocabulary game (unless the parent asks — §1).
- No leaderboards, social, or competitive framing.
- No new audio/asset *pipeline* (reuse SVG + tone synth + TTS).
- No router library, no state-management library — keep v1's lightweight approach.
- No timed/score-pressure modes.
- **Cut from the release (fast-follow or dropped):** Count-Along (Phase 3), Quick Look look-alike
  numeral distractors / 2/5 pair (6/9 Phase 3, 2/5 dropped), Match `dotsNum`/`numWord` variants
  (Phase 3+), "Surprise Me!" tile (dropped), wrapped-present locked tiles (dropped — hide instead),
  per-rung parent level pinning (dropped — single global override), mastery-based arithmetic gating
  (Phase 4 — settings toggle until then).
