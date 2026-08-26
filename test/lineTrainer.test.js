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

describe("wrapping at the end", () => {
  it("returns to the first line after the last one", () => {
    const t = createLineTrainer(LINES, LAST);
    expect(t.current()).toBe("four");

    t.next();
    expect(t.index).toBe(0);
    expect(t.current()).toBe("one");
    expect(t.position).toBe(1);
  });

  it("starts the new pass with an empty history", () => {
    const t = createLineTrainer(LINES, LAST);
    t.next();
    expect(t.history()).toEqual({ far: "", near: "" });
  });

  it("comes full circle after a whole pass through the poem", () => {
    const t = createLineTrainer(LINES);
    for (let i = 0; i < LINES.length; i++) t.next();
    expect(t.index).toBe(0);
  });

  it("keeps wrapping over repeated passes", () => {
    const t = createLineTrainer(LINES);
    for (let i = 0; i < LINES.length * 3 + 2; i++) t.next();
    expect(t.index).toBe(2);
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
