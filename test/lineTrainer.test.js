import { describe, it, expect } from "vitest";
import { createLineTrainer, isValidIndex } from "../lineTrainer.js";

// A stand-in poem: the trainer should not care what the text is.
const LINES = ["one", "two", "three", "four"];
const LAST = LINES.length - 1;

describe("advancing", () => {
  it("starts on the first line with no history above it", () => {
    const t = createLineTrainer(LINES);
    expect(t.index).toBe(0);
    expect(t.current()).toBe("one");
    expect(t.position).toBe(1);
    expect(t.total).toBe(4);
    expect(t.history()).toEqual({ far: "", near: "" });
  });

  it("moves to the next line and lifts the old one into the history", () => {
    const t = createLineTrainer(LINES);
    t.next();
    expect(t.current()).toBe("two");
    expect(t.position).toBe(2);
    expect(t.history()).toEqual({ far: "", near: "one" });
  });

  it("keeps the two most recent lines, the older one further back", () => {
    const t = createLineTrainer(LINES);
    t.next();
    t.next();
    expect(t.current()).toBe("three");
    expect(t.history()).toEqual({ far: "one", near: "two" });
  });

  it("drops the third-oldest line out of the history", () => {
    const t = createLineTrainer(LINES);
    t.next();
    t.next();
    t.next();
    expect(t.current()).toBe("four");
    expect(t.history()).toEqual({ far: "two", near: "three" });
  });

  it("returns the new index from next()", () => {
    const t = createLineTrainer(LINES);
    expect(t.next()).toBe(1);
    expect(t.next()).toBe(2);
  });

  it("refuses a poem with no lines", () => {
    expect(() => createLineTrainer([])).toThrow(/non-empty/);
    expect(() => createLineTrainer(null)).toThrow(/non-empty/);
  });
});

describe("stopping at the end", () => {
  it("stays on the last line instead of starting over", () => {
    const t = createLineTrainer(LINES, LAST);
    expect(t.current()).toBe("four");

    t.next();
    expect(t.index).toBe(LAST);
    expect(t.current()).toBe("four");
    expect(t.position).toBe(4);
  });

  it("keeps the history intact when it refuses to advance", () => {
    const t = createLineTrainer(LINES, LAST);
    t.next();
    expect(t.history()).toEqual({ far: "two", near: "three" });
  });

  it("returns the unchanged index from a refused next()", () => {
    const t = createLineTrainer(LINES, LAST);
    expect(t.next()).toBe(LAST);
  });

  it("lands on the last line after a whole pass and stays there", () => {
    const t = createLineTrainer(LINES);
    for (let i = 0; i < LINES.length * 3; i++) t.next();
    expect(t.index).toBe(LAST);
  });

  it("can still be walked back after piling up against the end", () => {
    const t = createLineTrainer(LINES);
    for (let i = 0; i < 10; i++) t.next();
    t.prev();
    expect(t.index).toBe(LAST - 1);
  });
});

describe("going back", () => {
  it("returns to the previous line and empties the history at the top", () => {
    const t = createLineTrainer(LINES, 1);
    t.prev();
    expect(t.index).toBe(0);
    expect(t.current()).toBe("one");
    expect(t.position).toBe(1);
    expect(t.history()).toEqual({ far: "", near: "" });
  });

  it("restores the history that was showing before the advance", () => {
    const t = createLineTrainer(LINES);
    t.next();
    t.next();
    expect(t.history()).toEqual({ far: "one", near: "two" });
    t.prev();
    expect(t.current()).toBe("two");
    expect(t.history()).toEqual({ far: "", near: "one" });
  });

  it("returns the new index from prev()", () => {
    const t = createLineTrainer(LINES, 2);
    expect(t.prev()).toBe(1);
    expect(t.prev()).toBe(0);
  });

  it("stays on the first line instead of jumping to the last", () => {
    const t = createLineTrainer(LINES);
    expect(t.prev()).toBe(0);
    expect(t.current()).toBe("one");
    expect(t.position).toBe(1);
    expect(t.history()).toEqual({ far: "", near: "" });
  });

  it("holds at the first line however often it is pushed", () => {
    const t = createLineTrainer(LINES, 2);
    for (let i = 0; i < 10; i++) t.prev();
    expect(t.index).toBe(0);
  });

  it("can still be walked forward after piling up against the start", () => {
    const t = createLineTrainer(LINES, 2);
    for (let i = 0; i < 10; i++) t.prev();
    t.next();
    expect(t.index).toBe(1);
  });

  it("undoes next() from every line that can still advance", () => {
    for (let start = 0; start < LAST; start++) {
      const t = createLineTrainer(LINES, start);
      t.next();
      t.prev();
      expect(t.index).toBe(start);
    }
  });
});

describe("the ends", () => {
  it("flags the first line as the start and not the end", () => {
    const t = createLineTrainer(LINES);
    expect(t.atStart).toBe(true);
    expect(t.atEnd).toBe(false);
  });

  it("flags the last line as the end and not the start", () => {
    const t = createLineTrainer(LINES, LAST);
    expect(t.atStart).toBe(false);
    expect(t.atEnd).toBe(true);
  });

  it("flags neither end in the middle of the poem", () => {
    const t = createLineTrainer(LINES, 2);
    expect(t.atStart).toBe(false);
    expect(t.atEnd).toBe(false);
  });

  it("tracks the ends as the reader moves", () => {
    const t = createLineTrainer(LINES);
    t.next();
    expect(t.atStart).toBe(false);
    t.prev();
    expect(t.atStart).toBe(true);
  });

  it("calls a one-line poem both the start and the end at once", () => {
    const t = createLineTrainer(["only"]);
    expect(t.atStart).toBe(true);
    expect(t.atEnd).toBe(true);
    expect(t.next()).toBe(0);
    expect(t.prev()).toBe(0);
  });
});

describe("starting position", () => {
  it("starts on a valid saved line", () => {
    const t = createLineTrainer(LINES, 2);
    expect(t.current()).toBe("three");
    expect(t.history()).toEqual({ far: "one", near: "two" });
  });

  it("accepts the last line without wrapping early", () => {
    expect(createLineTrainer(LINES, LAST).index).toBe(LAST);
  });

  // Each of these must fall back to line 0 rather than address a line that
  // is not there. LINES.length is the boundary an off-by-one would let slip
  // through, landing the reader on an undefined line.
  const rejected = {
    "one past the end": LINES.length,
    "far past the end": 99,
    negative: -1,
    fractional: 2.5,
    "a numeric string": "3",
    null: null,
    undefined: undefined,
    NaN: NaN,
    Infinity: Infinity,
    "an object": {},
    "a boolean": true,
  };

  for (const [label, start] of Object.entries(rejected)) {
    it(`falls back to line 0 given ${label}`, () => {
      const t = createLineTrainer(LINES, start);
      expect(t.index).toBe(0);
      expect(t.current()).toBe("one");
      expect(t.history()).toEqual({ far: "", near: "" });
    });
  }
});

describe("isValidIndex", () => {
  it("accepts every addressable line and nothing else", () => {
    expect(isValidIndex(0, 4)).toBe(true);
    expect(isValidIndex(3, 4)).toBe(true);
    expect(isValidIndex(4, 4)).toBe(false);
    expect(isValidIndex(-1, 4)).toBe(false);
    expect(isValidIndex(1.5, 4)).toBe(false);
    expect(isValidIndex("2", 4)).toBe(false);
  });
});
