import { prisma } from "../../../../lib/prisma";
import {
  REFRESH_TOKEN_TTL_MS,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../../../../lib/auth";
import type { GraphQLContext } from "@generated/context";

export const REFRESH_COOKIE_NAME = "refreshToken";

export const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: "/",
};

export function toGraphQLUser(user: { id: bigint; username: string }) {
  return {
    ID: user.id.toString(),
    username: user.username,
  };
}

export async function createSession(
  user: { id: bigint; username: string },
  context: GraphQLContext,
) {
  const accessToken = signAccessToken({
    userId: user.id.toString(),
    username: user.username,
  });

  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.userSession.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  context.res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, refreshCookieOptions);

  return {
    accessToken,
    User: toGraphQLUser(user),
  };
}
