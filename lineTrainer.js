// Line navigation: which line is in focus, which two came before it, and what
// happens at the end of the poem. Knows nothing about the DOM or storage.

/** A position is only usable if it actually addresses a line. */
export function isValidIndex(i, total) {
  return Number.isInteger(i) && i >= 0 && i < total;
}

export function createLineTrainer(lines, startIndex = 0) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("createLineTrainer needs a non-empty array of lines");
  }

  // A supplied position is trusted only if it survives isValidIndex; anything
  // else — a stale save, a swapped poem, junk — quietly starts from the top.
  let index = isValidIndex(startIndex, lines.length) ? startIndex : 0;

  return {
    get index() {
      return index;
    },
    get total() {
      return lines.length;
    },
    /** 1-based, for display. */
    get position() {
      return index + 1;
    },

    current() {
      return lines[index];
    },

    // The two lines already recited, `far` being the older of them. A fresh
    // pass through the poem starts with an empty history.
    history() {
      return {
        far: index >= 2 ? lines[index - 2] : "",
        near: index >= 1 ? lines[index - 1] : "",
      };
    },

    /** True at the two ends, where there is nowhere further to go. */
    get atStart() {
      return index === 0;
    },
    get atEnd() {
      return index === lines.length - 1;
    },

    // The ends are walls, not seams: a reader who has run out of poem should
    // be told so, rather than be silently dropped back at the other end.
    /** Advances one line, stopping at the last. Returns the new index. */
    next() {
      if (index < lines.length - 1) index++;
      return index;
    },

    /** Steps back one line, stopping at the first. Returns the new index. */
    prev() {
      if (index > 0) index--;
      return index;
    },
  };
}
