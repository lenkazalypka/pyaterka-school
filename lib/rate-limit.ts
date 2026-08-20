import { headers } from "next/headers";
import { supabaseAdmin } from "./supabase-admin";

export type RateLimitAction = "login" | "register" | "recover" | "parent_invite";

export class RateLimitExceededError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
  }
}

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Rate limit service unavailable");
    this.name = "RateLimitUnavailableError";
  }
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requestIdentifiers(action: RateLimitAction, email?: string) {
  const pepper = process.env.RATE_LIMIT_PEPPER;
  if (!pepper || pepper.length < 32) throw new RateLimitUnavailableError();

  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || requestHeaders.get("x-real-ip")?.trim();
  const raw = [email ? `email:${email.trim().toLowerCase()}` : null, ip ? `ip:${ip}` : null].filter(
    (value): value is string => Boolean(value),
  );
  if (raw.length === 0) raw.push("ip:unavailable");
  return Promise.all(raw.slice(0, 2).map((value) => sha256(`${action}.${value}.${pepper}`)));
}

export async function assertRateLimit(action: RateLimitAction, email?: string) {
  const identifiers = await requestIdentifiers(action, email);
  const db = supabaseAdmin();
  const { data, error } = await db.rpc("check_auth_rate_limit", {
    p_action: action,
    p_identifier_hashes: identifiers,
  });
  if (error || !Array.isArray(data) || !data[0]) throw new RateLimitUnavailableError();
  if (!data[0].allowed) throw new RateLimitExceededError(Number(data[0].retry_after_seconds) || 60);
  return identifiers;
}

export async function recordRateLimitAttempt(
  action: RateLimitAction,
  identifiers: string[],
) {
  const db = supabaseAdmin();
  const { error } = await db.rpc("record_auth_rate_limit_attempt", {
    p_action: action,
    p_identifier_hashes: identifiers,
  });
  if (error) throw new RateLimitUnavailableError();
}

export async function clearRateLimit(action: RateLimitAction, identifiers: string[]) {
  const db = supabaseAdmin();
  const { error } = await db.rpc("clear_auth_rate_limit", {
    p_action: action,
    p_identifier_hashes: identifiers,
  });
  if (error) throw new RateLimitUnavailableError();
}

export function publicRateLimitMessage(error: unknown) {
  if (error instanceof RateLimitExceededError) {
    const minutes = Math.max(1, Math.ceil(error.retryAfterSeconds / 60));
    return `Слишком много попыток. Попробуйте через ${minutes} мин.`;
  }
  return "Защита от частых запросов временно недоступна. Попробуйте позже.";
}
