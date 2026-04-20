import { prisma } from "../../../lib/prisma";
import bcrypt from "bcrypt";
import type {
  QueryGetUserByIdArgs,
  MutationSignUpArgs,
  MutationLoginArgs,
  Resolvers,
} from "@generated/generated";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../../lib/auth";
import type { GraphQLContext } from "@generated/context";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 14 * 24 * 60 * 60 * 1000,
  path: "/",
};

function toGraphQLUser(user: {
  id: bigint;
  username: string;
  numFish: number | null;
}) {
  return {
    ID: user.id.toString(),
    username: user.username,
    numFish: user.numFish ?? undefined,
  };
}

export const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    getUserByID: async (_parent, args: QueryGetUserByIdArgs) => {
      const user = await prisma.user.findUnique({
        where: {
          id: BigInt(args.ID),
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return toGraphQLUser(user);
    },

    me: async (_parent, _args, context) => {
      const authHeader = context.req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {ID: "-1", username: "", NumFish: undefined};
      }

      const token = authHeader.slice("Bearer ".length);

      try {
        const payload = verifyAccessToken(token);

        const user = await prisma.user.findUnique({
          where: {
            id: BigInt(payload.userId),
          },
        });

        if (!user) {
          return {ID: "-1", username: "", NumFish: undefined};
        }

        return toGraphQLUser(user);
      } catch {
        return {ID: "-1", username: "", NumFish: undefined};
      }
    },
  },

  Mutation: {
    signUp: async (_parent, args: MutationSignUpArgs, context) => {
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

      const payload = {
        userId: user.id.toString(),
        username: user.username,
      };

      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      context.res.cookie(
        REFRESH_COOKIE_NAME,
        refreshToken,
        refreshCookieOptions
      );

      return {
        accessToken,
        User: toGraphQLUser(user),
      };
    },

    login: async (_parent, args: MutationLoginArgs, context) => {
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

      const payload = {
        userId: user.id.toString(),
        username: user.username,
      };

      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      context.res.cookie(
        REFRESH_COOKIE_NAME,
        refreshToken,
        refreshCookieOptions
      );

      return {
        accessToken,
        User: toGraphQLUser(user),
      };
    },

    refreshSession: async (_parent, _args, context) => {
      const refreshToken = context.req.cookies?.[REFRESH_COOKIE_NAME];

      if (!refreshToken) {
        throw new Error("No refresh token");
      }

      let payload;
      try {
        payload = verifyRefreshToken(refreshToken);
      } catch {
        throw new Error("Invalid refresh token");
      }

      const user = await prisma.user.findUnique({
        where: {
          id: BigInt(payload.userId),
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const newPayload = {
        userId: user.id.toString(),
        username: user.username,
      };

      const accessToken = signAccessToken(newPayload);
      const newRefreshToken = signRefreshToken(newPayload);

      context.res.cookie(
        REFRESH_COOKIE_NAME,
        newRefreshToken,
        refreshCookieOptions
      );

      return {
        accessToken,
        User: toGraphQLUser(user),
      };
    },

    logout: async (_parent, _args, context) => {
      context.res.clearCookie(REFRESH_COOKIE_NAME, {
        path: "/",
      });

      return true;
    },
  },
};