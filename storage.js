// Persistence for the reader's place in the poem.
//
// localStorage is not guaranteed. Safari refuses it outright on file://
// origins, and private browsing or blocked site data can throw anywhere —
// including on the property access itself. Resuming is a convenience, so
// every failure degrades to "no saved place" rather than breaking the trainer.

// FNV-1a. Not cryptographic, and it does not need to be: a collision would
// only mean resuming at the wrong line of a poem that was swapped out.
export function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** window.localStorage, or null where the browser refuses to hand it over. */
export function browserBackend() {
  try {
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.key        versioned; bump it if the stored shape changes
 * @param {string} opts.signature  identifies the text the index was saved from
 * @param {Storage|null} opts.backend
 */
export function createStorage({ key, signature, backend }) {
  return {
    /** The saved index, or null if there is nothing trustworthy to resume. */
    load() {
      if (!backend) return null;
      try {
        const raw = backend.getItem(key);
        if (raw === null) return null;
        const saved = JSON.parse(raw);
        // A saved position only means anything against the text it was saved
        // from. Bounds alone would happily resume mid-way through a different
        // poem of the same length, so the signature is checked first. Whether
        // the index itself is in range is the trainer's call.
        if (!saved || saved.sig !== signature) return null;
        return saved.index ?? null;
      } catch (e) {
        return null;
      }
    },

    save(index) {
      if (!backend) return;
      try {
        backend.setItem(key, JSON.stringify({ index, sig: signature }));
      } catch (e) {
        // Quota, private mode, or a file:// origin: carry on without saving.
      }
    },
  };
}
