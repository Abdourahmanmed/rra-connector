import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function deriveKey(secret: string, salt: Buffer): Buffer {
  return pbkdf2Sync(secret, salt, 120_000, 32, "sha512");
}

export function encryptSecret(plainText: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(env.SECRET_ENCRYPTION_KEY, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [salt.toString("base64"), iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(cipherText: string): string {
  const [saltB64, ivB64, tagB64, dataB64] = cipherText.split(".");

  if (!saltB64 || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted payload format");
  }

  const salt = Buffer.from(saltB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const key = deriveKey(env.SECRET_ENCRYPTION_KEY, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
