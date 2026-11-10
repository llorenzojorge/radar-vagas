const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(input = "") {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const isHex = entity[1].toLowerCase() === "x";
      const code = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function stripHtml(input = "") {
  return decodeEntities(input.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function escapeHtml(input = "") {
  return String(input).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Lowercases, removes diacritics and collapses everything into space-separated words. */
export function normalize(input = "") {
  return ` ${input}`
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.(?![a-z0-9])/g, " ") // drop sentence dots, keep ".net" / "node.js"
    .replace(/[^a-z0-9+#.$]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Builds a predicate that tells whether a text contains any of the given terms
 * as whole words. A trailing "*" turns a term into a prefix match.
 *
 * @param {string[]} terms
 * @returns {(text: string) => boolean}
 */
export function createMatcher(terms = []) {
  if (!terms.length) return () => false;
  const patterns = terms.map((term) => {
    const isPrefix = term.endsWith("*");
    const base = normalize(isPrefix ? term.slice(0, -1) : term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return isPrefix ? `${base}\\S*` : base;
  });
  const regex = new RegExp(`(?:^| )(?:${patterns.join("|")})(?= |$)`);
  return (text) => regex.test(normalize(text));
}
