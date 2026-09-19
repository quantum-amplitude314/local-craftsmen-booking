import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ORPCError, onError } from "@orpc/server";
import { Hono } from "hono";
import type { Auth } from "./auth.ts";
import { type AuthVariables, requireSession } from "./auth-middleware.ts";
import { type ApiContext, router } from "./router.ts";

type RuntimeContext = Omit<ApiContext, "user"> & { getAuth: () => Auth };

type CreateApiContext<Bindings> = (input: {
  bindings: Bindings;
  request: Request;
}) => RuntimeContext | Promise<RuntimeContext>;

const handler = new OpenAPIHandler(router, {
  interceptors: [
    onError((error) => {
      if (error instanceof ORPCError && error.status < 500) return;

      const detail = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ message: "oRPC request failed", detail }));
    }),
  ],
});

export const createApp = <Bindings extends object>({
  createApiContext,
}: {
  createApiContext: CreateApiContext<Bindings>;
}) => {
  const app = new Hono<{
    Bindings: Bindings;
    Variables: AuthVariables & { apiContext: RuntimeContext };
  }>();

  app.get("/health", (context) => context.json({ status: "ok" }));

  app.use("*", async (context, next) => {
    const apiContext = await createApiContext({
      bindings: context.env,
      request: context.req.raw,
    });
    context.set("apiContext", apiContext);
    context.set("getAuth", apiContext.getAuth);
    await next();
  });

  app.on(["GET", "POST"], "/auth/*", (context) => {
    context.header("Cache-Control", "no-store");

    return context.get("getAuth")().handler(context.req.raw);
  });

  app.use("/me", requireSession);
  app.use("/me/*", requireSession);

  app.use("*", async (context, next) => {
    const apiContext = { ...context.get("apiContext"), user: context.get("user") ?? null };
    const { matched, response } = await handler.handle(context.req.raw, { context: apiContext });

    if (matched) return context.newResponse(response.body, response);

    await next();
  });

  app.notFound((context) => context.json({ code: "NOT_FOUND", message: "Not found" }, 404));

  app.onError((error, context) => {
    console.error(
      JSON.stringify({
        message: "Unhandled request error",
        detail: error.message,
        path: context.req.path,
      }),
    );

    return context.json({ code: "INTERNAL_SERVER_ERROR", message: "Internal server error" }, 500);
  });

  return app;
};
