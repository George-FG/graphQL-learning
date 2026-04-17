import { readFileSync } from "node:fs";
import { join } from "node:path";

const path = join(__dirname, "typeDefs.graphql");

export const typeDefs = readFileSync(path, "utf8");
