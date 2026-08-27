// DOM glue: wires the trainer and its saved position to the page, and owns
// the fade. Deliberately thin — the behavior worth testing lives in
// lineTrainer.js and storage.js, and the poem itself lives in poem.js.

import { createLineTrainer } from "./lineTrainer.js";
import { browserBackend, createStorage, fingerprint } from "./storage.js";
import { lines, storageKey, title } from "./poem.js";

// Must stay in sync with the #stack `transition: opacity` duration in index.html.
const FADE_MS = 160;

const titleEl = document.getElementById("title");
const stackEl = document.getElementById("stack");
const lineEl = document.getElementById("line");
const past1El = document.getElementById("past-1");
const past2El = document.getElementById("past-2");
const counterEl = document.getElementById("counter");
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const edgeEl = document.getElementById("edge");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const store = createStorage({
  key: storageKey,
  signature: fingerprint(lines.join("\n")),
  backend: browserBackend(),
});

const trainer = createLineTrainer(lines, store.load());

let fadeTimer = null;

function render() {
  const { far, near } = trainer.history();
  past2El.textContent = far;
  past1El.textContent = near;
  lineEl.textContent = trainer.current();
  counterEl.textContent = "Line " + trainer.position + " of " + trainer.total;

  // The ends are shown twice over: the dead button says which way is blocked,
  // the note says why. Announced politely so a screen reader hears it too.
  prevBtn.disabled = trainer.atStart;
  nextBtn.disabled = trainer.atEnd;
  edgeEl.textContent = trainer.atEnd
    ? "End of the poem"
    : trainer.atStart
      ? "Start of the poem"
      : "";

  // Disabling the button under the pointer would drop focus to the body and
  // strand a keyboard reader mid-poem; hand it to the direction still open.
  if (document.activeElement === prevBtn && prevBtn.disabled) nextBtn.focus();
  else if (document.activeElement === nextBtn && nextBtn.disabled) prevBtn.focus();
}

// Saving after the draw rather than before it means the recorded place is
// always one the page has actually been told to show: a tab closed during the
// fade resumes where the reader was, not a line ahead of it.
function commit() {
  render();
  store.save(trainer.index);
}

// Both directions share one path: move the trainer, then draw and save.
function move(step) {
  const before = trainer.index;
  step();
  if (trainer.index === before) return; // already at that end — nothing to fade

  if (reduceMotion.matches) {
    clearTimeout(fadeTimer);
    fadeTimer = null;
    stackEl.classList.remove("fading");
    commit();
    return;
  }

  // A press landing mid-fade draws straight away and leaves the fade already
  // in flight to finish on its original schedule. Rescheduling it instead —
  // clearTimeout, then a fresh FADE_MS — lets a reader moving faster than the
  // fade push the draw back indefinitely: the card stays blank, every line in
  // between goes undrawn, and #counter, which sits outside #stack so nothing
  // fades it, stays legible on a line the reader has long since left.
  if (fadeTimer !== null) {
    commit();
    return;
  }

  stackEl.classList.add("fading");
  fadeTimer = setTimeout(function () {
    commit();
    stackEl.classList.remove("fading");
    fadeTimer = null;
  }, FADE_MS);
}

const next = () => move(() => trainer.next());
const prev = () => move(() => trainer.prev());

nextBtn.addEventListener("click", next);
prevBtn.addEventListener("click", prev);

document.addEventListener("keydown", function (e) {
  if (e.repeat) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") {
    e.preventDefault();
    next();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    prev();
  }
});

titleEl.textContent = title;
document.title = "Line Trainer — " + title;
render();
