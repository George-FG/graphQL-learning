import { ApolloServer } from "@apollo/server";
import { resolvers } from "./schema/resolvers/resolvers";
import { readFileSync } from "fs";
import { join } from "path";

const typeDefs = readFileSync(join(__dirname, "./schema/typeDefs.graphql"), "utf-8");
const schema = { typeDefs, resolvers };

export const runGqlServer = async () => {
  const server = new ApolloServer(schema);
  await server.start();
  return server;
};
