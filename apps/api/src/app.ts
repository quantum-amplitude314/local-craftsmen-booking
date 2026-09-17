import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ORPCError, onError } from "@orpc/server";
import { Hono } from "hono";
import { type ApiContext, router } from "./router.ts";

type CreateApiContext<Bindings> = (input: {
  bindings: Bindings;
  request: Request;
}) => ApiContext | Promise<ApiContext>;

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
  const app = new Hono<{ Bindings: Bindings }>();

  app.get("/health", (context) => context.json({ status: "ok" }));

  app.use("*", async (context, next) => {
    const apiContext = await createApiContext({
      bindings: context.env,
      request: context.req.raw,
    });
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
