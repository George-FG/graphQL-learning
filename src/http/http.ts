import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServer } from "@apollo/server";
import type { GraphQLContext } from "@generated/context";

export const runHttpServer = async (server: ApolloServer<GraphQLContext>) => {
  const app = express();
  const port = 3000;

  app.get("/", (_req, res) => {
    res.send("Hello World!");
  });

  app.use(cookieParser());

  app.use(
    "/graphql",
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req, res }) => ({ req, res }),
    })
  );

  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
      resolve();
    });
  });
};