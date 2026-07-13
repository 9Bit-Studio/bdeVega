const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string): Uint8Array<ArrayBuffer> {
  const values = value.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [];
  const bytes = new Uint8Array(values.length);
  bytes.set(values);
  return bytes;
}

async function encryptionKey(): Promise<CryptoKey> {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) throw new Error("API_KEY_ENCRYPTION_SECRET must contain at least 32 characters");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptApiKey(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), encoder.encode(value));
  return `${toHex(iv)}.${toHex(new Uint8Array(encrypted))}`;
}

export async function decryptApiKey(value: string): Promise<string> {
  const [ivHex, encryptedHex] = value.split(".");
  if (!ivHex || !encryptedHex) throw new Error("Invalid encrypted API key");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromHex(ivHex) },
    await encryptionKey(),
    fromHex(encryptedHex),
  );
  return new TextDecoder().decode(decrypted);
}
