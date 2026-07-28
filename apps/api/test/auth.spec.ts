import { hashPassword, verifyPassword } from "../src/auth/password";

const MIGRATED_EMILIANO_HASH =
  "pbkdf2$120000$88af33068dc0dff9af17339d15ee1f01$5ab4a83758e4e4469d19c423d039538a82d6228f11bf396ff5a7f6db8fdd8e8bf4992de3f13e2503aa0f5d62e85ca9ebeca8628044d9b7e663f43a2335a517b4";

describe("password hashing", () => {
  it("valida a senha migrada de Emiliano", () => {
    expect(verifyPassword("123", MIGRATED_EMILIANO_HASH)).toBe(true);
    expect(verifyPassword("senha-incorreta", MIGRATED_EMILIANO_HASH)).toBe(
      false,
    );
  });

  it("gera hashes sem armazenar a senha em texto puro", () => {
    const encoded = hashPassword("outra-senha");

    expect(encoded).not.toContain("outra-senha");
    expect(verifyPassword("outra-senha", encoded)).toBe(true);
  });
});
