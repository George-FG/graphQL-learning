import type { Request, Response } from "express";
import type { AuthTokenPayload } from "../auth";

export type GraphQLContext = {
  req: Request;
  res: Response;
  authUser: AuthTokenPayload | null;
};