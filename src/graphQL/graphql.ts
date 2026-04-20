import { ApolloServer } from "@apollo/server";
import { resolvers } from "./schema/resolvers/resolvers";
import { readFileSync } from "fs";
import { join } from "path";
import type { GraphQLContext } from "@generated/context";

const typeDefs = readFileSync(join(__dirname, "./schema/typeDefs.graphql"), "utf-8");

export const runGqlServer = async () => {
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== "production",
  });

  await server.start();
  return server;
};