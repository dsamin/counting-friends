# Contributing

Counting Friends is a proprietary product (see [`LICENSE`](LICENSE)) — the source is
public for reference, not for outside contribution. This guide is for anyone working on
the project directly.

## Run and test locally

```bash
npm install

npm run dev        # dev server (Vite)
npm run build      # typecheck + production build → dist/
npm run preview    # preview the production build

npm run test       # unit/component suite (Vitest) — keep it green (148 tests)
npm run e2e        # Playwright end-to-end + screenshot flows
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## How we work

- **Test-driven.** The game logic in `src/game/` is TDD'd, including invariant fuzz tests
  (e.g. every round always contains the correct answer; distractors are unique and in
  range; choices are sorted so position never leaks the answer). Write the test first, and
  keep the full suite passing before you commit.

- **Fidelity to the prototype.** The working prototype (`Counting Friends.dc.html`) and
  [`HANDOFF.md`](HANDOFF.md) are the behavioral source of truth. Timings, tier rules,
  confetti counts, and the no-fail guarantees in [`src/game/constants.ts`](src/game/constants.ts)
  are copied verbatim from the prototype — **do not let them drift.** When in doubt, match
  the prototype exactly rather than improvising.

- **The design system is the styling source of truth.** All color, type, shape, elevation,
  and motion values live in [`src/styles/tokens.css`](src/styles/tokens.css) and the
  component classes in [`src/styles/app.css`](src/styles/app.css). Style from those tokens;
  don't hardcode brand colors or one-off values in components.

- **Protect the four promises.** No ads, no in-app purchases, no data collected, no way to
  fail. Never add analytics, a third-party SDK, a network call, a score, a timer, or a
  failure state. Every dependency added to a Kids app is review risk and a privacy risk.

## Before you commit

- `npm run test`, `npm run lint`, and `npm run typecheck` all pass.
- New behavior has a test.
- Nothing reaches out to the network at runtime.
