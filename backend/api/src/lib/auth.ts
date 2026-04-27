import { createHash, randomBytes } from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import type { IncomingHttpHeaders } from "http";

export type AuthTokenPayload = {
  userId: string;
  username: string;
};

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;

if (!ACCESS_SECRET) {
  throw new Error("Missing JWT_ACCESS_SECRET");
}

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function isAuthTokenPayload(value: unknown): value is AuthTokenPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.userId === "string" &&
    typeof candidate.username === "string"
  );
}

function parseVerifiedToken(decoded: string | JwtPayload): AuthTokenPayload {
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  if (!isAuthTokenPayload(decoded)) {
    throw new Error("Token payload missing required fields");
  }

  return decoded;
}

export function signAccessToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, ACCESS_SECRET);
  return parseVerifiedToken(decoded);
}

export function generateRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getBearerToken(headers: IncomingHttpHeaders) {
  const raw = headers.authorization;

  if (!raw) return null;

  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!value?.startsWith("Bearer ")) return null;

  return value.slice("Bearer ".length).trim();
}

export function getAuthUserFromHeaders(
  headers: IncomingHttpHeaders
): AuthTokenPayload | null {
  const token = getBearerToken(headers);

  if (!token) return null;

  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}