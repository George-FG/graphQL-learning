import bcrypt from "bcrypt";
import { prisma } from "../../../../lib/prisma";
import { createSession } from "../lib/authHelpers";
import type { MutationResolver } from "../lib/resolverTypes";

export const login: MutationResolver<"login"> = async (_parent, args, context) => {
  const username = args.username.trim();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error("Invalid username or password");

  const passwordMatches = await bcrypt.compare(args.password, user.passwordHash);
  if (!passwordMatches) throw new Error("Invalid username or password");

  return createSession(user, context);
};
