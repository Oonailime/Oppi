import {
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ITERATIONS = 120_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    DIGEST,
  ).toString("hex");
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [algorithm, iterationsValue, salt, storedHash] = encoded.split("$");
  const iterations = Number(iterationsValue);
  if (
    algorithm !== "pbkdf2" ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    !salt ||
    !storedHash
  ) {
    return false;
  }

  const expected = Buffer.from(storedHash, "hex");
  const received = pbkdf2Sync(
    password,
    salt,
    iterations,
    expected.length,
    DIGEST,
  );
  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}
