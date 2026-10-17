/**
 * Convert a string to a URL-safe slug (kebab-case, ASCII).
 * Persian/Arabic characters are transliterated to best-effort ASCII.
 */
export function slugify(input: string): string {
  const map: Record<string, string> = {
    "ا": "a",
    "آ": "a",
    "ب": "b",
    "پ": "p",
    "ت": "t",
    "ث": "s",
    "ج": "j",
    "چ": "ch",
    "ح": "h",
    "خ": "kh",
    "د": "d",
    "ذ": "z",
    "ر": "r",
    "ز": "z",
    "ژ": "zh",
    "س": "s",
    "ش": "sh",
    "ص": "s",
    "ض": "z",
    "ط": "t",
    "ظ": "z",
    "ع": "a",
    "غ": "gh",
    "ف": "f",
    "ق": "gh",
    "ک": "k",
    "گ": "g",
    "ل": "l",
    "م": "m",
    "ن": "n",
    "و": "v",
    "ه": "h",
    "ی": "y",
    "ك": "k",
    "ي": "y",
  };

  let s = input.trim().toLowerCase();
  // transliterate
  for (const [k, v] of Object.entries(map)) {
    s = s.split(k).join(v);
  }
  // keep letters, numbers, dot, hyphen
  s = s.replace(/[^a-z0-9.\-]+/g, "-");
  // collapse hyphens
  s = s.replace(/-+/g, "-");
  // strip leading/trailing
  s = s.replace(/^-+|-+$/g, "");
  return s || "untitled";
}

/**
 * Generate a unique slug. Returns `{base}` if free, otherwise `{base}-{n}`.
 */
export async function uniqueSlug(
  isTaken: (candidate: string) => Promise<boolean>,
  base: string,
  maxTries = 20
): Promise<string> {
  let candidate = base;
  if (!(await isTaken(candidate))) return candidate;
  for (let i = 2; i <= maxTries; i++) {
    candidate = `${base}-${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  // fallback to random suffix
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
