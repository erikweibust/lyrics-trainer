// DOM glue: wires the trainer and its saved position to the page, and owns
// the fade. Deliberately thin — the behavior worth testing lives in
// lineTrainer.js and storage.js.

import { createLineTrainer } from "./lineTrainer.js";
import { browserBackend, createStorage, fingerprint } from "./storage.js";

const lines = [
  "Shall I compare thee to a summer's day?",
  "Thou art more lovely and more temperate:",
  "Rough winds do shake the darling buds of May,",
  "And summer's lease hath all too short a date;",
  "Sometime too hot the eye of heaven shines,",
  "And often is his gold complexion dimm'd;",
  "And every fair from fair sometime declines,",
  "By chance or nature's changing course untrimm'd;",
  "But thy eternal summer shall not fade,",
  "Nor lose possession of that fair thou ow'st;",
  "Nor shall Death brag thou wander'st in his shade,",
  "When in eternal lines to time thou grow'st:",
  "So long as men can breathe or eyes can see,",
  "So long lives this, and this gives life to thee.",
];

// Bump the version suffix if the shape of the stored value ever changes.
const STORAGE_KEY = "line-trainer:sonnet-18:v1";
const FADE_MS = 160;

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
  key: STORAGE_KEY,
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

// Both directions share one path: move the trainer, save, then fade.
function move(step) {
  const before = trainer.index;
  step();
  if (trainer.index === before) return; // already at that end — nothing to fade

  store.save(trainer.index);

  clearTimeout(fadeTimer);
  fadeTimer = null;

  if (reduceMotion.matches) {
    stackEl.classList.remove("fading");
    render();
    return;
  }

  stackEl.classList.add("fading");
  fadeTimer = setTimeout(function () {
    render();
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

render();
