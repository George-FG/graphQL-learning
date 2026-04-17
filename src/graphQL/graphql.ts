import { ApolloServer } from "@apollo/server";
import { resolvers } from "./schema/resolvers/resolvers";
import { typeDefs } from "./schema/typeDefs";

const schema = { typeDefs, resolvers };

export const runGqlServer = async () => {
  const server = new ApolloServer(schema);
  await server.start();
  return server;
};
