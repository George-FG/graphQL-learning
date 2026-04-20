import bcrypt from "bcrypt";
import { prisma } from "../../../lib/prisma";
import type { Resolvers } from "@generated/generated";
import {
  REFRESH_TOKEN_TTL_MS,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../../../lib/auth";
import type { GraphQLContext } from "@generated/context";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: "/",
};

function toMaybe<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

function toGraphQLLocation(location: {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  type: string | null;
}) {
  return {
    id: location.id,
    name: location.name,
    lat: toMaybe(location.lat),
    lng: toMaybe(location.lng),
    type: toMaybe(location.type),
  };
}

function toGraphQLConnection(connection: {
  id: string;
  fromId: string;
  toId: string;
  transportType: string | null;
  routeId: string | null;
  routeName: string | null;
  duration: number | null;
}) {
  return {
    id: connection.id,
    fromId: connection.fromId,
    toId: connection.toId,
    transportType: toMaybe(connection.transportType),
    routeId: toMaybe(connection.routeId),
    routeName: toMaybe(connection.routeName),
    duration: toMaybe(connection.duration),
  };
}

function getEdgeWeight(connection: { duration: number | null }) {
  // Prefer provided duration; fall back to 1 so edges are still traversable.
  return connection.duration && connection.duration > 0 ? connection.duration : 1;
}

function buildShortestRoute(
  startId: string,
  endId: string,
  edges: Array<{
    id: string;
    fromId: string;
    toId: string;
    duration: number | null;
  }>,
) {
  const adjacency = new Map<
    string,
    Array<{
      id: string;
      fromId: string;
      toId: string;
      duration: number | null;
    }>
  >();

  for (const edge of edges) {
    const existing = adjacency.get(edge.fromId) ?? [];
    existing.push(edge);
    adjacency.set(edge.fromId, existing);
  }

  const distances = new Map<string, number>([[startId, 0]]);
  const previousNode = new Map<string, string>();
  const previousEdge = new Map<string, string>();
  const visited = new Set<string>();
  const queue = new Set<string>([startId]);

  while (queue.size > 0) {
    let currentNode: string | undefined;
    let currentDistance = Number.POSITIVE_INFINITY;

    for (const nodeId of queue) {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (distance < currentDistance) {
        currentDistance = distance;
        currentNode = nodeId;
      }
    }

    if (!currentNode) {
      break;
    }

    if (currentNode === endId) {
      break;
    }

    queue.delete(currentNode);
    visited.add(currentNode);

    const outgoing = adjacency.get(currentNode) ?? [];
    for (const edge of outgoing) {
      if (visited.has(edge.toId)) {
        continue;
      }

      const candidateDistance =
        (distances.get(currentNode) ?? Number.POSITIVE_INFINITY) +
        getEdgeWeight(edge);

      if (candidateDistance < (distances.get(edge.toId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.toId, candidateDistance);
        previousNode.set(edge.toId, currentNode);
        previousEdge.set(edge.toId, edge.id);
        queue.add(edge.toId);
      }
    }
  }

  if (!distances.has(endId)) {
    return {
      routeNodeIds: [] as string[],
      routeEdgeIds: [] as string[],
      totalDuration: undefined as number | undefined,
    };
  }

  const routeNodeIds: string[] = [];
  const routeEdgeIds: string[] = [];
  let cursor: string | undefined = endId;

  while (cursor) {
    routeNodeIds.push(cursor);
    if (cursor === startId) {
      break;
    }

    const edgeId = previousEdge.get(cursor);
    if (edgeId) {
      routeEdgeIds.push(edgeId);
    }

    cursor = previousNode.get(cursor);
  }

  if (routeNodeIds[routeNodeIds.length - 1] !== startId) {
    return {
      routeNodeIds: [] as string[],
      routeEdgeIds: [] as string[],
      totalDuration: undefined as number | undefined,
    };
  }

  routeNodeIds.reverse();
  routeEdgeIds.reverse();

  const totalDuration = distances.get(endId);
  return {
    routeNodeIds,
    routeEdgeIds,
    totalDuration,
  };
}

function toGraphQLUser(user: { id: bigint; username: string }) {
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
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  context.res.cookie(
    REFRESH_COOKIE_NAME,
    rawRefreshToken,
    refreshCookieOptions,
  );

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

    searchLocations: async (_parent, args) => {
      const locations = await prisma.location.findMany({
        where: {
          name: {
            contains: args.query,
            mode: "insensitive",
          },
        },
        take: 10,
      });

      return locations.map(toGraphQLLocation);
    },

    journeyGraph: async (_parent, args) => {
      const selectedStart = await prisma.location.findUnique({
        where: { id: args.startId },
      });

      const selectedEnd = await prisma.location.findUnique({
        where: { id: args.endId },
      });

      if (!selectedStart || !selectedEnd) {
        throw new Error("Start or end location not found");
      }

      const [startCandidatesByName, endCandidatesByName] = await Promise.all([
        prisma.location.findMany({
          where: {
            name: selectedStart.name,
          },
          take: 50,
        }),
        prisma.location.findMany({
          where: {
            name: selectedEnd.name,
          },
          take: 50,
        }),
      ]);

      const startCandidateIds = Array.from(
        new Set([selectedStart.id, ...startCandidatesByName.map((node) => node.id)]),
      );

      const endCandidateIds = Array.from(
        new Set([selectedEnd.id, ...endCandidatesByName.map((node) => node.id)]),
      );

      const nodes = await prisma.location.findMany({
        take: 2000,
      });

      const nodeIds = nodes.map((node) => node.id);

      const edges = await prisma.connection.findMany({
        where: {
          fromId: { in: nodeIds },
          toId: { in: nodeIds },
        },
        take: 5000,
      });

      let shortestRouteSelection:
        | {
            startId: string;
            endId: string;
            routeNodeIds: string[];
            routeEdgeIds: string[];
            totalDuration: number;
          }
        | undefined;

      for (const candidateStartId of startCandidateIds) {
        for (const candidateEndId of endCandidateIds) {
          const route = buildShortestRoute(candidateStartId, candidateEndId, edges);
          if (route.routeNodeIds.length === 0) {
            continue;
          }

          const totalDuration = route.totalDuration ?? Number.POSITIVE_INFINITY;

          if (
            !shortestRouteSelection ||
            totalDuration < shortestRouteSelection.totalDuration ||
            (totalDuration === shortestRouteSelection.totalDuration &&
              route.routeNodeIds.length < shortestRouteSelection.routeNodeIds.length)
          ) {
            shortestRouteSelection = {
              startId: candidateStartId,
              endId: candidateEndId,
              routeNodeIds: route.routeNodeIds,
              routeEdgeIds: route.routeEdgeIds,
              totalDuration,
            };
          }
        }
      }

      if (!shortestRouteSelection) {
        throw new Error("No route found between selected locations");
      }

      const routeNodeIdSet = new Set(shortestRouteSelection.routeNodeIds);
      const routeEdgeIdSet = new Set(shortestRouteSelection.routeEdgeIds);

      const start =
        nodes.find((node) => node.id === shortestRouteSelection.startId) ?? selectedStart;
      const end =
        nodes.find((node) => node.id === shortestRouteSelection.endId) ?? selectedEnd;

      const routeNodes = nodes
        .filter((node) => routeNodeIdSet.has(node.id))
        .sort(
          (a, b) =>
            shortestRouteSelection.routeNodeIds.indexOf(a.id) -
            shortestRouteSelection.routeNodeIds.indexOf(b.id),
        );

      const routeEdges = edges
        .filter((edge) => routeEdgeIdSet.has(edge.id))
        .sort(
          (a, b) =>
            shortestRouteSelection.routeEdgeIds.indexOf(a.id) -
            shortestRouteSelection.routeEdgeIds.indexOf(b.id),
        );

      return {
        start: toGraphQLLocation(start),
        end: toGraphQLLocation(end),
        nodes: routeNodes.map(toGraphQLLocation),
        edges: routeEdges.map(toGraphQLConnection),
        route: {
          nodes: routeNodes.map(toGraphQLLocation),
          edges: routeEdges.map(toGraphQLConnection),
          totalDuration: Number.isFinite(shortestRouteSelection.totalDuration)
            ? shortestRouteSelection.totalDuration
            : undefined,
        },
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
        user.passwordHash,
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
        refreshCookieOptions,
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
  },
};
