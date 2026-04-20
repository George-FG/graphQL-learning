import jwt, { JwtPayload } from "jsonwebtoken";
import type { IncomingHttpHeaders } from "http";

export type AuthTokenPayload = {
  userId: string;
  username: string;
};


const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

if (!ACCESS_SECRET) {
  throw new Error("Missing JWT_ACCESS_SECRET");
}

if (!REFRESH_SECRET) {
  throw new Error("Missing JWT_REFRESH_SECRET");
}

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
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "14d" });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, ACCESS_SECRET);
  return parseVerifiedToken(decoded);
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, REFRESH_SECRET);
  return parseVerifiedToken(decoded);
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