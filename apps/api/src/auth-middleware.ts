import { type SessionUser, sessionUserSchema, type UserRole } from "@local-craftsmen/contracts";
import { createMiddleware } from "hono/factory";
import type { Auth } from "./auth.ts";

export type AuthVariables = {
  getAuth: () => Auth;
  user: SessionUser;
};

export const requireSession = createMiddleware<{ Variables: AuthVariables }>(
  async (context, next) => {
    context.header("Cache-Control", "no-store");
    const auth = context.get("getAuth")();
    const session = await auth.api.getSession({ headers: context.req.raw.headers });
    if (!session)
      return context.json({ code: "UNAUTHORIZED", message: "Sign in to continue" }, 401);

    context.set("user", sessionUserSchema.parse(session.user));
    await next();
  },
);

export const requireRole = (role: UserRole) => {
  const middleware = createMiddleware<{ Variables: AuthVariables }>(async (context, next) => {
    const user = context.get("user");
    if (!user) return context.json({ code: "UNAUTHORIZED", message: "Sign in to continue" }, 401);
    if (user.role !== role)
      return context.json(
        { code: "FORBIDDEN", message: "This action is not available for your role" },
        403,
      );

    await next();
  });

  return middleware;
};
