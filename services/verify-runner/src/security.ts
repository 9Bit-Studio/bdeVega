import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface TargetPolicy {
  allowedOrigins: ReadonlySet<string>;
  allowPrivateAddresses: boolean;
}

export class TargetPolicyError extends Error {}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
}

export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  if (isIP(address) !== 6) return true;
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? isPrivateIpv4(mapped) : false;
}

export function parseAllowedOrigins(value: string | undefined): ReadonlySet<string> {
  const origins = new Set<string>();
  for (const item of value?.split(",") ?? []) {
    const candidate = item.trim();
    if (!candidate) continue;
    const url = new URL(candidate);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.pathname !== "/" || url.search || url.hash) {
      throw new TargetPolicyError(`Invalid allowed app origin: ${candidate}`);
    }
    origins.add(url.origin);
  }
  return origins;
}

export async function assertSafeTarget(rawUrl: string, policy: TargetPolicy): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new TargetPolicyError("Target URL is invalid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TargetPolicyError("Target must use HTTP or HTTPS");
  if (url.username || url.password) throw new TargetPolicyError("Target credentials are not allowed");
  if (!policy.allowedOrigins.has(url.origin)) throw new TargetPolicyError("Target origin is not allowed");

  let addresses: { address: string }[];
  try {
    addresses = isIP(url.hostname)
      ? [{ address: url.hostname }]
      : await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new TargetPolicyError("Target host did not resolve");
  }
  if (addresses.length === 0) throw new TargetPolicyError("Target host did not resolve");
  if (!policy.allowPrivateAddresses && addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new TargetPolicyError("Private or internal target addresses are not allowed");
  }
  return url;
}
