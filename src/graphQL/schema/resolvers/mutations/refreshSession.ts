import { prisma } from "../../../../lib/prisma";
import {
  REFRESH_TOKEN_TTL_MS,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../../../../lib/auth";
import { REFRESH_COOKIE_NAME, refreshCookieOptions, toGraphQLUser } from "../lib/authHelpers";
import type { MutationResolver } from "../lib/resolverTypes";

export const refreshSession: MutationResolver<"refreshSession"> = async (_parent, _args, context) => {
  const rawRefreshToken = context.req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (!rawRefreshToken) throw new Error("No refresh token");

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const session = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    context.res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    throw new Error("Invalid refresh token");
  }

  if (session.revokedAt) {
    context.res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    throw new Error("Session revoked");
  }

  if (session.expiresAt <= new Date()) {
    await prisma.userSession.delete({ where: { tokenHash } });
    context.res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    throw new Error("Refresh token expired");
  }

  const nextRaw = generateRefreshToken();
  const nextHash = hashRefreshToken(nextRaw);
  const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.userSession.update({
    where: { tokenHash },
    data: { tokenHash: nextHash, expiresAt: nextExpiresAt, lastUsedAt: new Date() },
  });

  context.res.cookie(REFRESH_COOKIE_NAME, nextRaw, refreshCookieOptions);

  return {
    accessToken: signAccessToken({
      userId: session.user.id.toString(),
      username: session.user.username,
    }),
    User: toGraphQLUser(session.user),
  };
};
