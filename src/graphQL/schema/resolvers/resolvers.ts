import { prisma } from "../../../lib/prisma";
import bcrypt from "bcrypt";
import type { 
  QueryGetUserByIdArgs, 
  MutationSignUpArgs, 
  MutationLoginArgs, 
  Resolvers 
} from "@generated/generated";

export const resolvers: Resolvers = {
  Query: {
    getUserByID: async (_: unknown, args: QueryGetUserByIdArgs) => {
      const user = await prisma.user.findUnique({
        where: {
          id: BigInt(args.ID),
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        ID: user.id.toString(),
        Username: user.username,
        NumFish: user.numFish ?? undefined,
      };
    },
  },

  Mutation: {
    signUp: async (_: unknown, args: MutationSignUpArgs) => {
      const existingUser = await prisma.user.findUnique({
        where: {
          username: args.username,
        },
      });

      if (existingUser) {
        throw new Error("Username already exists");
      }

      const passwordHash = await bcrypt.hash(args.password, 10);

      const user = await prisma.user.create({
        data: {
          username: args.username,
          passwordHash,
          numFish: args.numFish,
        },
      });

      return {
        User: {
          ID: user.id.toString(),
          Username: user.username,
          NumFish: user.numFish ?? undefined,
        },
      };
    },

    login: async (_: unknown, args: MutationLoginArgs) => {
      const user = await prisma.user.findUnique({
        where: {
          username: args.username,
        },
      });

      if (!user) {
        throw new Error("Invalid username or password");
      }

      const passwordMatches = await bcrypt.compare(
        args.password,
        user.passwordHash
      );

      if (!passwordMatches) {
        throw new Error("Invalid username or password");
      }

      return {
        User: {
          ID: user.id.toString(),
          Username: user.username,
          NumFish: user.numFish ?? undefined,
        },
      };
    },
  },
};