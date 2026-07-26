import { randomInt } from "node:crypto";

/**
 * Alphabet for system-issued temporary passwords: no 0/O/1/l/I, because these
 * get read off a screen and retyped from an email.
 */
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGIT = "23456789";
const SYMBOL = "!@#$%*?";
const ALL = UPPER + LOWER + DIGIT + SYMBOL;

function pick(set: string) {
  return set[randomInt(set.length)];
}

/**
 * A 14-character temporary password with at least one of each class.
 * Used once: the app forces the holder to replace it at first sign-in.
 */
export function generateTempPassword(): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SYMBOL)];
  while (chars.length < 14) chars.push(pick(ALL));

  // Fisher-Yates with a CSPRNG so the guaranteed classes are not always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
