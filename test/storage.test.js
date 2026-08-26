import { describe, it, expect } from "vitest";
import { createStorage, fingerprint } from "../storage.js";
import { createLineTrainer } from "../lineTrainer.js";

const KEY = "line-trainer:test:v1";
const SIG = "abc123";

/** A localStorage stand-in that can be told to misbehave. */
function fakeBackend({ initial = {}, throwOnGet = false, throwOnSet = false } = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem(k) {
      if (throwOnGet) throw new Error("SecurityError: storage is blocked");
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      if (throwOnSet) throw new Error("QuotaExceededError");
      map.set(k, String(v));
    },
  };
}

const withBackend = (backend) => createStorage({ key: KEY, signature: SIG, backend });
const stored = (index, sig = SIG) => ({ [KEY]: JSON.stringify({ index, sig }) });

describe("saving", () => {
  it("writes the index and signature under the versioned key", () => {
    const backend = fakeBackend();
    withBackend(backend).save(7);
    expect(JSON.parse(backend.map.get(KEY))).toEqual({ index: 7, sig: SIG });
  });

  it("overwrites the previous position rather than accumulating", () => {
    const backend = fakeBackend();
    const store = withBackend(backend);
    store.save(1);
    store.save(2);
    expect(backend.map.size).toBe(1);
    expect(JSON.parse(backend.map.get(KEY)).index).toBe(2);
  });

  it("stays quiet when the write is refused", () => {
    const store = withBackend(fakeBackend({ throwOnSet: true }));
    expect(() => store.save(3)).not.toThrow();
  });

  it("stays quiet when there is no storage at all", () => {
    const store = withBackend(null);
    expect(() => store.save(3)).not.toThrow();
  });
});

describe("loading", () => {
  it("round-trips a saved position", () => {
    const backend = fakeBackend();
    const store = withBackend(backend);
    store.save(5);
    expect(store.load()).toBe(5);
  });

  it("round-trips line 0 rather than reporting nothing saved", () => {
    // 0 is falsy; a truthiness check here would send the reader back to the
    // top of the poem on every refresh of the first line.
    const backend = fakeBackend();
    const store = withBackend(backend);
    store.save(0);
    expect(store.load()).toBe(0);
  });

  const nothingToResume = {
    "nothing stored": {},
    "malformed JSON": { [KEY]: "{index: 5" },
    "an empty string": { [KEY]: "" },
    "a stored null": { [KEY]: "null" },
    "a bare number": { [KEY]: "7" },
    "a signature from a different poem": stored(5, "different"),
    "a missing signature": { [KEY]: JSON.stringify({ index: 5 }) },
    "a missing index": { [KEY]: JSON.stringify({ sig: SIG }) },
  };

  for (const [label, initial] of Object.entries(nothingToResume)) {
    it(`reports nothing to resume given ${label}`, () => {
      expect(withBackend(fakeBackend({ initial })).load()).toBeNull();
    });
  }

  it("reports nothing to resume when reading throws", () => {
    // Safari on a file:// origin, or blocked site data.
    const backend = fakeBackend({ initial: stored(5), throwOnGet: true });
    expect(withBackend(backend).load()).toBeNull();
  });

  it("reports nothing to resume when there is no storage at all", () => {
    expect(withBackend(null).load()).toBeNull();
  });

  it("ignores positions saved under a different key", () => {
    const backend = fakeBackend({ initial: { "line-trainer:other:v1": JSON.stringify({ index: 5, sig: SIG }) } });
    expect(withBackend(backend).load()).toBeNull();
  });
});

describe("fingerprint", () => {
  it("is stable for the same text", () => {
    expect(fingerprint("a\nb")).toBe(fingerprint("a\nb"));
  });

  it("changes when the text changes", () => {
    expect(fingerprint("a\nb")).not.toBe(fingerprint("a\nc"));
  });

  it("distinguishes poems of the same length", () => {
    // The reason a bounds check alone is not enough to trust a saved index.
    expect(fingerprint("one\ntwo")).not.toBe(fingerprint("uno\ndos"));
  });

  it("is a short printable string", () => {
    expect(fingerprint("anything")).toMatch(/^[0-9a-z]+$/);
  });
});

// The two modules only meet in main.js, so this is the seam worth checking:
// what the reader actually experiences on reopening the page.
describe("resuming", () => {
  const LINES = ["one", "two", "three", "four"];
  const resume = (backend) =>
    createLineTrainer(LINES, withBackend(backend).load());

  it("reopens on the line the reader left off at", () => {
    const backend = fakeBackend();
    withBackend(backend).save(2);
    const t = resume(backend);
    expect(t.current()).toBe("three");
    expect(t.history()).toEqual({ far: "one", near: "two" });
  });

  it("survives a full save-and-reopen cycle", () => {
    const backend = fakeBackend();
    const store = withBackend(backend);
    const first = createLineTrainer(LINES, store.load());
    first.next();
    store.save(first.index);

    expect(resume(backend).current()).toBe("two");
  });

  it("opens on line 0 for a first-time reader", () => {
    expect(resume(fakeBackend()).index).toBe(0);
  });

  it("opens on line 0 when the saved index is out of range", () => {
    // The signature still matches, so storage hands the index over; the
    // trainer is what refuses it.
    expect(resume(fakeBackend({ initial: stored(99) })).index).toBe(0);
  });

  it("opens on line 0 when the poem has been swapped out", () => {
    expect(resume(fakeBackend({ initial: stored(2, "other-poem") })).index).toBe(0);
  });

  it("opens on line 0 when storage is unavailable", () => {
    expect(resume(null).index).toBe(0);
  });
});
