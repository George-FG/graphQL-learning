import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServer } from "@apollo/server";
import type { GraphQLContext } from "@generated/context";
import { getAuthUserFromHeaders } from "../lib/auth";

export const runHttpServer = async (server: ApolloServer<GraphQLContext>) => {
  const app = express();
  const port = Number(process.env.PORT ?? 3000);
  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    next();
  });

  app.get("/", (_req, res) => {
    res.send("Hello World!");
  });

  app.use(cookieParser());

  app.use(
    "/graphql",
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
    express.json({ limit: "16kb" }),
    expressMiddleware(server, {
      context: async ({ req, res }) => ({
        req,
        res,
        authUser: getAuthUserFromHeaders(req.headers),
      }),
    })
  );

  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`HTTP server ready at http://localhost:${port}/graphql`);
      resolve();
    });
  });
};