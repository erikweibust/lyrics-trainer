// The text being memorized. Kept out of the glue layer because the trainer
// core and the storage signature are both written to be poem-agnostic:
// swapping poems should mean editing this file and nothing else.

export const title = "Sonnet 18 · Shakespeare";

// Names the poem, so one poem's saved place is never read as another's. Bump
// the version suffix if the shape of the stored value ever changes.
export const storageKey = "line-trainer:sonnet-18:v1";

export const lines = [
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
