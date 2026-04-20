import express from "express";
import cors from "cors";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServer, BaseContext } from "@apollo/server";

export const runHttpServer = async (server: ApolloServer<BaseContext>) => {
  const app = express();
  const port = 3000;

  app.get("/", (_req, res) => {
    res.send("Hello World!");
  });

  app.use(
    "/graphql",
    cors({
      origin: "http://localhost:5173",
    }),
    express.json(),
    expressMiddleware(server)
  );

  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
      resolve();
    });
  });
};