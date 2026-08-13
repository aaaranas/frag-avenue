import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";

describe("passwords", () => {
  it("hashes a password and verifies the same plaintext", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("s3cret!");
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
  });

  it("returns false for empty inputs rather than throwing", async () => {
    await expect(verifyPassword("", "not-a-real-hash")).resolves.toBe(false);
    await expect(verifyPassword("x", "")).resolves.toBe(false);
  });

  it("produces distinct hashes for identical inputs (salting)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });
});
