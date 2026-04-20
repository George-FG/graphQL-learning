import "dotenv/config";
import { runHttpServer } from "./http/http";
import { runGqlServer } from "./graphQL/graphql";

const runApplication = async () => {
  const server = await runGqlServer();
  await runHttpServer(server);
};

runApplication().catch((error) => {
  console.error("Application failed to start", error);
  process.exit(1);
});