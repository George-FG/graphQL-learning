import { prisma } from "../../../lib/prisma";
import bcrypt from "bcrypt";

type GetUserArgs = {
  ID: string;
};

type SignUpArgs = {
  username: string;
  password: string;
  numFish: number;
};

type LoginArgs = {
  username: string;
  password: string;
};

export const resolvers = {
  Query: {
    getUserByID: async (_: unknown, args: GetUserArgs) => {
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
        NumFish: user.numFish,
      };
    },
  },

  Mutation: {
    signUp: async (_: unknown, args: SignUpArgs) => {
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
          NumFish: user.numFish,
        },
      };
    },

    login: async (_: unknown, args: LoginArgs) => {
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
          NumFish: user.numFish,
        },
      };
    },
  },
};