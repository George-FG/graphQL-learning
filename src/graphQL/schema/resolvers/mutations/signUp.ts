import bcrypt from "bcrypt";
import { prisma } from "../../../../lib/prisma";
import { createSession } from "../lib/authHelpers";
import type { MutationResolver } from "../lib/resolverTypes";

export const signUp: MutationResolver<"signUp"> = async (_parent, args, context) => {
  const username = args.username.trim();
  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) throw new Error("Username already exists");

  const passwordHash = await bcrypt.hash(args.password, 12);
  const user = await prisma.user.create({ data: { username, passwordHash } });

  return createSession(user, context);
};
