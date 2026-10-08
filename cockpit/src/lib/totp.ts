import { createHmac } from "node:crypto";

// TOTP nach RFC 6238 (SHA-1, 30 s, 6 Stellen). Nur für die lokale Direktanmeldung.
export function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of input.replace(/=+$/, "").replace(/\s/g, "").toUpperCase()) {
    const v = alphabet.indexOf(c);
    if (v < 0) throw new Error("Ungültiges Base32.");
    bits += v.toString(2).padStart(5, "0");
  }
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
}

export function totp(secret: string | Buffer, now = Date.now(), digits = 6): string {
  const key = typeof secret === "string" ? base32Decode(secret) : secret;
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 10 ** digits).padStart(digits, "0");
}
