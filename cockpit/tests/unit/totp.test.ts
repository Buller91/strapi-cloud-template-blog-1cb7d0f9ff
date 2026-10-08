import { describe, expect, it } from "vitest";
import { base32Decode, totp } from "@/lib/totp";

describe("TOTP (RFC 6238)", () => {
  const secret = Buffer.from("12345678901234567890");
  it.each([
    [59_000, "94287082"],
    [1_111_111_109_000, "07081804"],
    [2_000_000_000_000, "69279037"],
  ])("Zeit %d → %s", (t, code) => expect(totp(secret, t, 8)).toBe(code));

  it("dekodiert Base32", () => {
    expect(base32Decode("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ").toString()).toBe("12345678901234567890");
  });
});
