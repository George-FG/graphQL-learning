import bcrypt from "bcrypt";
import { prisma } from "../../../lib/prisma";
import type { Resolvers } from "@generated/generated";
import {
  REFRESH_TOKEN_TTL_MS,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../../../lib/auth";
import { parseAnkiFile } from "../../../lib/ankiParser";
import type { GraphQLContext } from "@generated/context";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: "/",
};

function toGraphQLUser(user: {
  id: bigint;
  username: string;
}) {
  return {
    ID: user.id.toString(),
    username: user.username,
  };
}

async function createSession(
  user: {
    id: bigint;
    username: string;
  },
  context: GraphQLContext
) {
  const accessToken = signAccessToken({
    userId: user.id.toString(),
    username: user.username,
  });

  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  context.res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, refreshCookieOptions);

  return {
    accessToken,
    User: toGraphQLUser(user),
  };
}

export const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    getUserByID: async (_parent, args) => {
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
      if (!context.authUser) {
        return undefined;
      }

      const user = await prisma.user.findUnique({
        where: {
          id: BigInt(context.authUser.userId),
        },
      });

      if (!user) {
        return undefined;
      }

      return toGraphQLUser(user);
    },

    myDecks: async (_parent, _args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      const decks = await prisma.deck.findMany({
        where: { userId: BigInt(context.authUser.userId) },
        include: { _count: { select: { cards: true } } },
        orderBy: { createdAt: "desc" },
      });

      return decks.map((deck) => ({
        id: deck.id.toString(),
        name: deck.name,
        createdAt: deck.createdAt.toISOString(),
        cardCount: deck._count.cards,
        cards: [],
      }));
    },

    deck: async (_parent, args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      const PAGE_SIZE = 10;
      const offset = Math.max(0, args.offset ?? 0);
      const limit = Math.min(50, args.limit ?? PAGE_SIZE);

      const deck = await prisma.deck.findFirst({
        where: {
          id: BigInt(args.id),
          userId: BigInt(context.authUser.userId),
        },
        include: {
          cards: {
            orderBy: { position: "asc" },
            skip: offset,
            take: limit,
          },
          _count: { select: { cards: true } },
        },
      });

      if (!deck) return undefined;

      return {
        id: deck.id.toString(),
        name: deck.name,
        createdAt: deck.createdAt.toISOString(),
        cardCount: deck._count.cards,
        cards: deck.cards.map((c) => ({
          id: c.id.toString(),
          front: c.front,
          back: c.back,
          position: c.position,
        })),
      };
    },
  },

  Mutation: {
    signUp: async (_parent, args, context) => {
      const username = args.username.trim();

      const existingUser = await prisma.user.findUnique({
        where: {
          username,
        },
      });

      if (existingUser) {
        throw new Error("Username already exists");
      }

      const passwordHash = await bcrypt.hash(args.password, 12);

      const user = await prisma.user.create({
        data: {
          username,
          passwordHash,
        },
      });

      return createSession(user, context);
    },

    login: async (_parent, args, context) => {
      const username = args.username.trim();

      const user = await prisma.user.findUnique({
        where: {
          username,
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

      return createSession(user, context);
    },

    refreshSession: async (_parent, _args, context) => {
      const rawRefreshToken = context.req.cookies?.[REFRESH_COOKIE_NAME] as
        | string
        | undefined;

      if (!rawRefreshToken) {
        throw new Error("No refresh token");
      }

      const tokenHash = hashRefreshToken(rawRefreshToken);

      const session = await prisma.userSession.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
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
        await prisma.userSession.delete({
          where: {
            tokenHash,
          },
        });

        context.res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
        throw new Error("Refresh token expired");
      }

      const nextRawRefreshToken = generateRefreshToken();
      const nextTokenHash = hashRefreshToken(nextRawRefreshToken);
      const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

      await prisma.userSession.update({
        where: {
          tokenHash,
        },
        data: {
          tokenHash: nextTokenHash,
          expiresAt: nextExpiresAt,
          lastUsedAt: new Date(),
        },
      });

      context.res.cookie(
        REFRESH_COOKIE_NAME,
        nextRawRefreshToken,
        refreshCookieOptions
      );

      return {
        accessToken: signAccessToken({
          userId: session.user.id.toString(),
          username: session.user.username,
        }),
        User: toGraphQLUser(session.user),
      };
    },

    logout: async (_parent, _args, context) => {
      const rawRefreshToken = context.req.cookies?.[REFRESH_COOKIE_NAME] as
        | string
        | undefined;

      if (rawRefreshToken) {
        const tokenHash = hashRefreshToken(rawRefreshToken);

        await prisma.userSession.deleteMany({
          where: {
            tokenHash,
          },
        });
      }

      context.res.clearCookie(REFRESH_COOKIE_NAME, {
        path: "/",
      });

      return true;
    },

    uploadDeck: async (_parent, args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      const cards = parseAnkiFile(args.fileContent);
      if (cards.length === 0) {
        throw new Error("No valid cards found in the uploaded file");
      }

      const deck = await prisma.deck.create({
        data: {
          userId: BigInt(context.authUser.userId),
          name: args.name,
          cards: {
            create: cards.map((card, index) => ({
              front: card.front,
              back: card.back,
              position: index,
            })),
          },
        },
        include: {
          _count: { select: { cards: true } },
        },
      });

      return {
        id: deck.id.toString(),
        name: deck.name,
        createdAt: deck.createdAt.toISOString(),
        cardCount: deck._count.cards,
        cards: [],
      };
    },

    deleteDeck: async (_parent, args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      const deck = await prisma.deck.findFirst({
        where: {
          id: BigInt(args.id),
          userId: BigInt(context.authUser.userId),
        },
      });

      if (!deck) {
        throw new Error("Deck not found");
      }

      await prisma.deck.delete({ where: { id: deck.id } });
      return true;
    },
  },
};