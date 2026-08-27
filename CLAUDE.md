# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`PHASE-2.md` records a design discussion about where the app could go, and — in
its appendix — which directions have already been declined and why. Read it
before proposing a change of direction. It describes nothing that exists yet;
this file remains the description of the code as built.

## Commands

```bash
npm run dev                        # Vite dev server
npm test                           # vitest run (single pass)
npm run test:watch                 # vitest in watch mode
npx vitest run test/storage.test.js        # one test file
npx vitest run -t "wrapping at the end"    # one describe/it by name
npx vitest run --coverage                  # v8 coverage into coverage/

npm run test:e2e                   # playwright, 5 browser projects
npm run test:e2e:report            # open the last HTML report
npx playwright test --project=Chrome       # one browser while iterating
```

There is no vite or vitest config file and no lint step — both tools run on defaults. Playwright does have one: `playwright.config.js` starts the dev server itself, and matches `e2e/*.e2e.js` rather than `*.test.js` so vitest and playwright never claim the same files.

## Architecture

A framework-free, build-step-free line trainer for memorizing Sonnet 18. Four ES modules loaded directly by `index.html` via `<script type="module">`; Vite is only a dev server, not a bundler in the shipped path. The page is intended to work when opened over `file://` as well as over http.

The split exists so the logic is testable without a DOM:

- **`lineTrainer.js`** — pure line navigation. Owns the current index, the two-line history (`far` = older, `near` = newer), 1-based `position`, and the two ends. `next()` and `prev()` clamp rather than wrap: at the last or first line they leave the index alone and return it unchanged, and `atStart`/`atEnd` let the UI say so. Knows nothing about the DOM or storage. `createLineTrainer(lines, startIndex)` treats an untrusted `startIndex` as a suggestion: anything failing `isValidIndex` silently falls back to 0.
- **`storage.js`** — persistence of the reader's place. Every localStorage path is defensive: `browserBackend()` returns `null` where the browser refuses access (Safari on `file://`, private mode, blocked site data — the property access itself can throw), and `load()`/`save()` swallow failures so resuming degrades to "start at the top" rather than breaking the app. Stored values carry an FNV-1a `fingerprint` of the poem text; `load()` rejects a saved index whose signature doesn't match, so swapping the poem cannot resume mid-way through a different text. Bounds checking is deliberately *not* done here — that's the trainer's job.
- **`poem.js`** — the text itself, plus the `title` and the versioned `storageKey` that names it. The trainer core and the FNV-1a signature are both poem-agnostic, so this is the only file a swapped poem should touch: `main.js` writes `title` into the empty `#title` heading and `document.title` on load.
- **`main.js`** — DOM glue only: wires the other three modules together, handles the Next/Previous buttons and the Space/Enter/→ (forward) and ← (back) keys, disables the spent direction at each end, and owns the fade transition. Deliberately thin; behavior worth testing belongs in the other modules.

Data flow on each move: `trainer.next()`/`trainer.prev()` → fade out → `commit()` (`render()`, then `store.save(trainer.index)`) → fade in. Both directions go through the single `move(step)` helper, which compares the index before and after the step and returns early when nothing moved, so pressing into a wall costs no save and no fade. The fade is skipped entirely under `prefers-reduced-motion`.

Two orderings in `move()` are load-bearing and neither is arbitrary:

- **A press landing mid-fade commits immediately and leaves the pending timer alone.** Rescheduling it instead — `clearTimeout`, then a fresh `FADE_MS` — lets a reader faster than the fade defer the draw indefinitely: the card stays blank, the lines in between go undrawn, and `#counter` sits outside `#stack` where nothing fades it, so it stays perfectly legible on a line the reader left several presses ago. Locked down by the second test in `e2e/navigation.e2e.js`, which reads `#counter` with a plain non-retrying `expect` — a web-first assertion polls for five seconds and so passes on the broken version too.
- **The save follows the render, never precedes it.** Saving first leaves a `FADE_MS` window in which a closed tab resumes one line ahead of what the page was last told to show.

## Conventions

- `storageKey` in `poem.js` is versioned (`line-trainer:sonnet-18:v1`). Bump the suffix if the shape of the stored value changes.
- `FADE_MS` in `main.js` must stay in sync with the `#stack` `transition: opacity` duration in `index.html`.
- `#edge` and `h1` in `index.html` both reserve their line height while empty, so nothing below them jumps: the end note appears and disappears, and the heading is blank until `poem.js` has loaded.
- Comments explain *why* a defense exists (which browser, which failure), not what the code does. Match that register.
- Tests use a hand-rolled `fakeBackend()` stand-in that can be told to throw, rather than mocking localStorage — failure modes are covered as first-class cases, including the exact boundary values an off-by-one would let through.
