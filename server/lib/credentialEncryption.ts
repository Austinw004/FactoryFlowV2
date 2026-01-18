import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

let encryptionKeyCache: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (encryptionKeyCache) {
    return encryptionKeyCache;
  }

  const masterKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  
  if (!masterKey || masterKey.length < 32) {
    console.warn("[SECURITY] CREDENTIAL_ENCRYPTION_KEY not set or too short. Generating ephemeral key for this session.");
    console.warn("[SECURITY] Credentials encrypted with ephemeral key will be lost on restart.");
    console.warn("[SECURITY] Set CREDENTIAL_ENCRYPTION_KEY to a 64+ character random string in production.");
    encryptionKeyCache = crypto.randomBytes(32);
    return encryptionKeyCache;
  }

  const salt = "prescient-labs-cred-v1";
  encryptionKeyCache = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, "sha256");
  return encryptionKeyCache;
}

export function encryptCredentials(credentials: Record<string, any>): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

export function decryptCredentials(encryptedString: string): Record<string, any> {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedString, "base64");
    
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString("utf8"));
  } catch (error) {
    console.error("Credential decryption failed:", error);
    throw new Error("Failed to decrypt credentials - possible key mismatch or corrupted data");
  }
}

export function isEncrypted(value: any): boolean {
  if (typeof value !== "string") return false;
  try {
    const decoded = Buffer.from(value, "base64");
    return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}
