import "dotenv/config";
import { runHttpServer } from "./http/http";
import { runGqlServer } from "./graphQL/graphql";

// Some networks (e.g. corporate SSL inspection) insert a self-signed certificate
// into the TLS chain. Setting GROQ_DISABLE_TLS_VERIFY=true in .env disables
// Node's TLS verification to work around this. Do not use in production.
if (process.env.GROQ_DISABLE_TLS_VERIFY === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn(
    "[WARN] TLS certificate verification is disabled (GROQ_DISABLE_TLS_VERIFY=true). Do not use in production."
  );
}

const runApplication = async () => {
  const server = await runGqlServer();
  await runHttpServer(server);
};

runApplication().catch((error) => {
  console.error("Application failed to start", error);
  process.exit(1);
});