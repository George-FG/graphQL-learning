import { prisma } from "../../../../lib/prisma";
import { hashRefreshToken } from "../../../../lib/auth";
import { REFRESH_COOKIE_NAME } from "../lib/authHelpers";
import type { MutationResolver } from "../lib/resolverTypes";

export const logout: MutationResolver<"logout"> = async (_parent, _args, context) => {
  const rawRefreshToken = context.req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (rawRefreshToken) {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    await prisma.userSession.deleteMany({ where: { tokenHash } });
  }

  context.res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
  return true;
};
