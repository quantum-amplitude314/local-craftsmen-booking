import { ORPCError } from "@orpc/client";

const ACCESS_REFUSED_CODES = ["UNAUTHORIZED", "FORBIDDEN"];

/** The API turned the caller away: no valid session, or a role without this action. */
export const isAccessRefused = (error: unknown) =>
  error instanceof ORPCError && ACCESS_REFUSED_CODES.includes(error.code);
