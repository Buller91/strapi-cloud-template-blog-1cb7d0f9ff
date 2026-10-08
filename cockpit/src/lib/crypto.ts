import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM für Zugangsdaten in der DB (Search Console, CMS). Schlüssel nur in SECRETS_KEY.
function key(): Buffer {
  const k = Buffer.from(process.env.SECRETS_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("SECRETS_KEY muss 32 Byte (base64) lang sein.");
  return k;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(token: string): string {
  const [v, iv, tag, data] = token.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Unbekanntes Format.");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}
