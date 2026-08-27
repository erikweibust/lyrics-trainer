# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                        # Vite dev server
npm test                           # vitest run (single pass)
npm run test:watch                 # vitest in watch mode
npx vitest run test/storage.test.js        # one test file
npx vitest run -t "wrapping at the end"    # one describe/it by name
npx vitest run --coverage                  # v8 coverage into coverage/
```

There is no vite/vitest config file and no lint step — both tools run on defaults.

## Architecture

A framework-free, build-step-free line trainer for memorizing Sonnet 18. Three ES modules loaded directly by `index.html` via `<script type="module">`; Vite is only a dev server, not a bundler in the shipped path. The page is intended to work when opened over `file://` as well as over http.

The split exists so the logic is testable without a DOM:

- **`lineTrainer.js`** — pure line navigation. Owns the current index, the two-line history (`far` = older, `near` = newer), 1-based `position`, and the two ends. `next()` and `prev()` clamp rather than wrap: at the last or first line they leave the index alone and return it unchanged, and `atStart`/`atEnd` let the UI say so. Knows nothing about the DOM or storage. `createLineTrainer(lines, startIndex)` treats an untrusted `startIndex` as a suggestion: anything failing `isValidIndex` silently falls back to 0.
- **`storage.js`** — persistence of the reader's place. Every localStorage path is defensive: `browserBackend()` returns `null` where the browser refuses access (Safari on `file://`, private mode, blocked site data — the property access itself can throw), and `load()`/`save()` swallow failures so resuming degrades to "start at the top" rather than breaking the app. Stored values carry an FNV-1a `fingerprint` of the poem text; `load()` rejects a saved index whose signature doesn't match, so swapping the poem cannot resume mid-way through a different text. Bounds checking is deliberately *not* done here — that's the trainer's job.
- **`main.js`** — DOM glue only: holds the `lines` array, wires the two modules together, handles the Next/Previous buttons and the Space/Enter/→ (forward) and ← (back) keys, disables the spent direction at each end, and owns the fade transition. Deliberately thin; behavior worth testing belongs in the other two modules.

Data flow on each move: `trainer.next()`/`trainer.prev()` → `store.save(trainer.index)` → fade out → `render()` → fade in. Both directions go through the single `move(step)` helper, which compares the index before and after the step and returns early when nothing moved, so pressing into a wall costs no save and no fade. The fade is skipped entirely under `prefers-reduced-motion`.

## Conventions

- `STORAGE_KEY` in `main.js` is versioned (`line-trainer:sonnet-18:v1`). Bump the suffix if the shape of the stored value changes.
- `FADE_MS` in `main.js` must stay in sync with the `#stack` `transition: opacity` duration in `index.html`.
- `#edge` in `index.html` reserves its line height even when empty, so the controls below it do not jump as the end note appears and disappears.
- Comments explain *why* a defense exists (which browser, which failure), not what the code does. Match that register.
- Tests use a hand-rolled `fakeBackend()` stand-in that can be told to throw, rather than mocking localStorage — failure modes are covered as first-class cases, including the exact boundary values an off-by-one would let through.
