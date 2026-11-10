import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";

const RETENTION_DAYS = 45;

/** @returns {import("../core/types.mjs").State} */
export function emptyState() {
  return { includeInternational: null, seen: {}, telegramOffset: 0, lastRecruiterDigest: "" };
}

/** Loads state from disk. A missing or corrupt file yields a fresh state. */
export async function loadState(path) {
  try {
    return { ...emptyState(), ...JSON.parse(await readFile(path, "utf8")) };
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`⚠️  Estado ilegível, iniciando do zero: ${error.message}`);
    return emptyState();
  }
}

/** Prunes old entries and writes atomically (temp file + rename). */
export async function saveState(path, state, now = Date.now()) {
  const cutoff = now - RETENTION_DAYS * 86_400_000;
  for (const [id, notifiedAt] of Object.entries(state.seen)) {
    if (Date.parse(notifiedAt) < cutoff) delete state.seen[id];
  }
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`);
  await rename(temp, path);
}
