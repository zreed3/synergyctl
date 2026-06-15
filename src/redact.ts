const SECRET_KEYS = [
  "apiKey",
  "password",
  "newPassword",
  "domainPassword",
  "privKey",
  "privateKey",
  "csr",
  "cer",
  "p7b",
  "authInfo",
  "token",
  "secret",
  "key"
];

const CONTACT_KEYS = ["email", "emailAddress", "phone", "fax"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shouldRedact(key: string, includeSecrets: boolean): boolean {
  if (includeSecrets) {
    return false;
  }
  const normalized = key.toLowerCase();
  return SECRET_KEYS.some((secretKey) => normalized.includes(secretKey.toLowerCase()));
}

function shouldMaskContact(key: string, includeSecrets: boolean): boolean {
  if (includeSecrets) {
    return false;
  }
  const normalized = key.toLowerCase();
  return CONTACT_KEYS.some((contactKey) => normalized === contactKey.toLowerCase());
}

function maskContact(value: unknown): unknown {
  if (typeof value !== "string" || value.length <= 4) {
    return "[redacted]";
  }
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `${local.slice(0, 1)}***@${domain}`;
  }
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function redactString(value: string, includeSecrets: boolean): string {
  if (includeSecrets) {
    return value;
  }
  return value
    .replace(/(<(?:[^:>]+:)?apiKey[^>]*>)([^<]*)(<\/(?:[^:>]+:)?apiKey>)/gi, "$1[redacted]$3")
    .replace(/("apiKey"\s*:\s*")([^"]*)(")/gi, "$1[redacted]$3")
    .replace(/(apiKey\s*=\s*["'])([^"']*)(["'])/gi, "$1[redacted]$3")
    .replace(/(SYNERGY_API_KEY=)([^\s]+)/g, "$1[redacted]");
}

export function redact(value: unknown, includeSecrets = false): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, includeSecrets));
  }
  if (typeof value === "string") {
    return redactString(value, includeSecrets);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (shouldRedact(key, includeSecrets) && !isPlainObject(entry) && !Array.isArray(entry)) {
        return [key, "[redacted]"];
      }
      if (shouldMaskContact(key, includeSecrets)) {
        return [key, maskContact(entry)];
      }
      return [key, redact(entry, includeSecrets)];
    })
  );
}
