import { type SessionUser, sessionUserSchema, type UserRole } from "@local-craftsmen/contracts";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { Auth } from "./auth.ts";

export type AuthVariables = {
  getAuth: () => Auth;
  user: SessionUser;
};

const readSessionUser = async (context: Context<{ Variables: AuthVariables }>) => {
  const auth = context.get("getAuth")();
  const session = await auth.api.getSession({ headers: context.req.raw.headers });
  const user = session ? sessionUserSchema.parse(session.user) : null;

  return user;
};

export const requireSession = createMiddleware<{ Variables: AuthVariables }>(
  async (context, next) => {
    context.header("Cache-Control", "no-store");
    const user = await readSessionUser(context);
    if (!user) return context.json({ code: "UNAUTHORIZED", message: "Sign in to continue" }, 401);

    context.set("user", user);
    await next();
  },
);

/** Public routes that treat a signed-in caller differently. */
export const readSession = createMiddleware<{ Variables: AuthVariables }>(async (context, next) => {
  const user = await readSessionUser(context);
  if (user) context.set("user", user);
  await next();
});

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
