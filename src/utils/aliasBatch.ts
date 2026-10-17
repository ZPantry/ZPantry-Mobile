export type AliasBatch = {
  candidates: string[];
  duplicates: string[];
  existing: string[];
  tooLong: string[];
};

/** Prepares pasted aliases without changing the user's original spelling. */
export function parseAliasBatch(raw: string, existingAliases: Iterable<string>): AliasBatch {
  const known = new Set(Array.from(existingAliases, normalizeAlias));
  const seen = new Set<string>();
  const candidates: string[] = [];
  const duplicates: string[] = [];
  const existing: string[] = [];
  const tooLong: string[] = [];
  for (const value of raw.split(/[\n,;]+/)) {
    const aliasName = value.trim().replace(/\s+/g, " ");
    if (!aliasName) continue;
    const key = normalizeAlias(aliasName);
    if (aliasName.length > 200) { tooLong.push(aliasName); continue; }
    if (seen.has(key)) { duplicates.push(aliasName); continue; }
    seen.add(key);
    if (known.has(key)) { existing.push(aliasName); continue; }
    candidates.push(aliasName);
  }
  return { candidates, duplicates, existing, tooLong };
}

function normalizeAlias(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN");
}
