# Phase 2 — where this app could go

Written 2026-08-27, against `master` at `23f091c` (the fade fix and `poem.js`
extraction, PR #6). Nothing here is committed to; it is a record of a design
discussion so the reasoning does not have to be rebuilt from scratch later.
It is a record of options and of decisions already taken, not a roadmap: none
of it is planned work.

Phase 1 got the app correct: a testable navigation core, defensive persistence,
a fade that no longer defers its own draw, and the poem lifted out of the glue
layer. Phase 2 is about what the app *is*.

---

## 1. The central gap: it doesn't actually train anything

The app is a **reader**, not a trainer. Press Next and the line appears. The
reader is never once asked to produce a line from memory, so the app cannot
distinguish someone who has the sonnet cold from someone who has never seen it.

Memorization works through *retrieval*: attempt first, confirm second. Right
now the confirm step is the only step.

**The change:** make a move two-stage. The first press hides the focus line and
leaves the two history lines standing as the cue — the reader recites — and the
second press reveals it. `#line` already reserves its height (`min-height:
2.9em` in `index.html`), so nothing on the page shifts.

**Where it goes:** the `trainer` needs one piece of state it does not have,
`revealed`. It belongs in `lineTrainer.js`, where it is unit-testable, not in
the glue. `move()` would consult it before stepping the index.

This does not change the stored shape, so `storageKey` stays at `v1`. Per-line
grading (§3) *would* change it, and that is the moment to bump the suffix.

Everything below this section matters less than this section.

---

## 2. Things that are simply missing

Small, uncontroversial, no design debate required:

- **No way to start over.** There is no reset. Once a position is saved the
  reader resumes there forever; clearing it means opening devtools. `store`
  exposes `load`/`save` and no `clear`.
- **No way to jump.** Reaching line 11 costs ten presses. No line picker, no
  scrubber.
- **No way to see the whole poem.** The text can only be walked, never
  surveyed, so there is no way to orient yourself within it.
- **No swipe on mobile.** `playwright.config.js` tests Pixel 5 and iPhone 13,
  and on both the only way forward is hitting a pill button. Thumb-swipe is the
  natural gesture.
- **No sections.** Sonnet 18 is three quatrains and a couplet. Drilling
  quatrain two alone is how people actually learn it, and there is no concept
  of a chunk anywhere in the model.

---

## 3. What comparable apps have that we don't

Roughly in order of value to this app:

- **First-letter scaffolding** — `S___ I c_____ t___ t_ a s______'s d__?` The
  standard technique for actors and scripture memorizers, and a gentler rung
  than a fully blank line: a middle setting between "shown" and "hidden."
- **Per-line competence tracking** — after a reveal, got it / missed it. This
  is the data the app currently throws away, and it is what unlocks everything
  below.
- **Spaced repetition** (Anki's model) — resurface the shaky lines instead of
  walking 1→14 forever. Depends on the grading above.
- **A library.** `poem.js` holds exactly one poem. Pasting in your own text is
  the difference between a demo and something used twice.
- **Audio** — text-to-speech reading the line, or recording yourself. Poems and
  lyrics are auditory before they are visual; this is the entire premise of the
  actor line-learning apps.
- **Typed or spoken input with verification**, rather than self-graded honesty.

Deliberately **not** wanted: streaks, points, leaderboards. They suit
language-learning apps and would sit badly on this one.

---

## 4. Two observations that may reframe the whole thing

### The repo is called `lyrics-trainer` and contains a sonnet

If lyrics are the real target, there is a structural problem the current model
cannot see: **songs repeat.** A chorus appears verbatim three times, and the
thing people actually fail at is not the chorus — it is *which verse follows
this chorus*. An index into a flat array cannot represent that, and the FNV-1a
fingerprint would treat identical lines as identical.

A song is a graph of sections, not a list of lines. Decide which app is being
built before adding features to the wrong model.

### The cold-start problem is the real skill, and almost nobody targets it

Every app in this space drills sequentially, so people become able to recite
from line 1 and helpless from line 9. Dropping the reader at a *random* line
and asking for the next one tests the thing that actually fails in performance.

`createLineTrainer(lines, startIndex)` already accepts an entry point, so this
is nearly free.

---

## 5. What would make it unique

**The pick: the scaffold is the product, and it retreats as you improve.**

The two-line history is already the app's distinctive idea — nobody else puts
the cue structure front and centre. Lean in and let the window shrink
automatically: two cue lines while the reader is shaky, then one, then none,
then first-letters-only on the focus line, then nothing at all. The reader
never picks a difficulty setting; the app withdraws support as evidence
accumulates and restores it after a stumble.

Combined with random entry points (§4), that is genuinely different from both
Anki — a card box that knows nothing about adjacency — and the lyrics apps,
which are fill-in-the-blank games.

Note the cost: the history window of 2 is currently baked into four layers
(`lineTrainer.history()`, the `#past-1`/`#past-2` element ids, the CSS, and the
tests). A variable window means unpicking all four. That was logged as a minor
finding on the assumption nobody would want it; this is the want.

**Runner-up, if distinctiveness is wanted without a data model: hands-free
recitation.** Speak the line, the Web Speech API listens, it advances when you
are close enough. That is how people actually rehearse — walking, driving,
pacing. Browser support and recognition accuracy are real risks, which is why
it is second.

**The quiet position worth protecting either way:** no account, no build step,
no telemetry, one page you could email to yourself. That restraint is a feature
against everything else in the category, and most items above can be added
without giving it up.

---

## 6. Suggested first step

The two-stage reveal from §1, on a branch, with the reveal state in
`lineTrainer.js` where it can be unit-tested. It is the smallest change that
makes the app's name true, and it does not commit to any of the larger
directions.

---

## Appendix — decisions already made, so they are not relitigated

Declined:

- **A CI workflow.** Declined 2026-08-27: it's a basic app, CI isn't needed.
  Run `npm test` and `npm run test:e2e` locally.
- **Unit-testing `main.js` under jsdom.** Declined 2026-08-27: the Playwright
  tests cover it. New guards for `main.js` belong in `e2e/`.

Open minor findings from the 2026-08-26 review, none pressing:

- The `far`/`near` → `past-2`/`past-1` mapping is unprotected — the names run
  near/far while the ids count backwards, and inverting them keeps all 64 unit
  tests green. One `#past-2` assertion in `e2e/` closes it.
- The history window of 2 is baked into four layers. See §5 — this stops being
  a nitpick if the retreating-scaffold idea is taken.
- `FADE_MS` is duplicated between `main.js` and the `#stack` CSS. Low value;
  the convention comment in `CLAUDE.md` is holding.

Checked and explicitly not problems — do not re-flag:

- Contrast passes WCAG AA in both themes.
- Space/Enter on a focused button does not double-advance; `preventDefault()`
  on keydown cancels the activation. Verified in the browser 2026-08-27.
