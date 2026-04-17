import { runHttpServer } from "./http/http";
import { runGqlServer } from "./graphQL/graphql";

const runApplication = async () => {
  const server = await runGqlServer();
  runHttpServer(server);
};

runApplication();
