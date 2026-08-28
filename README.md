# Line Trainer

A small, framework-free page for memorizing a poem one line at a time. It shows
the line you are on, the two lines you just recited above it, and nothing else.
Move forward when you have the line; move back when you don't.

The poem shipped with it is Shakespeare's Sonnet 18.

## Running it

```bash
npm install
npm run dev        # Vite dev server, http://localhost:5173
```

Vite is only a dev server here — there is no build step and nothing is bundled.
`index.html` loads the ES modules directly, so opening the file straight from
disk works too:

```bash
open index.html    # file:// also works
```

## Using it

| | |
|---|---|
| Next line | **Space**, **Enter**, **→**, or the *Next* button |
| Previous line | **←** or the *Previous* button |

The ends of the poem are walls, not a loop: at the first or last line the spent
direction's button goes dead and a note says which end you have reached.

Your place is saved as you go and restored the next time you open the page.
The saved place is stamped with a signature of the poem text, so editing or
swapping the poem starts you cleanly at line 1 instead of resuming part-way
through a text you never read. Where the browser refuses `localStorage` at all
— Safari on `file://`, private mode, blocked site data — saving is skipped
silently and the page simply opens at the top.

The card fades between lines, and skips the fade entirely under
`prefers-reduced-motion`.

## Using a different poem

Everything poem-specific lives in `poem.js`: the `lines`, the `title` shown in
the heading and the browser tab, and the `storageKey` that names this poem's
saved place. Edit that one file — the trainer and the saved-place signature are
both written to be poem-agnostic.

If you keep the same `storageKey`, an old saved position is discarded
automatically because the text signature no longer matches.

## Tests

```bash
npm test           # vitest: the trainer core and storage, no DOM needed
npm run test:e2e   # playwright: real-browser navigation across 5 browsers
```

`npm run test:e2e` starts the dev server itself. See `CLAUDE.md` for the
narrower commands (single file, single test, coverage, one browser).

## Layout

```
index.html        markup, styles, and the module entry point
main.js           DOM glue: buttons, keys, the fade, and the save
lineTrainer.js    line navigation — the current line, its history, the ends
storage.js        the saved place, signed against the poem text
poem.js           the text, its title, and its storage key
test/             vitest unit tests
e2e/              playwright browser tests
```

`CLAUDE.md` documents the architecture and the reasoning behind it; `PHASE-2.md`
records a design discussion about where the app could go next, including the
directions already declined.
