import { Hono } from "hono";
import { z } from "zod";

const brewOrderSchema = z.object({ beverage: z.enum(["tea", "coffee"]) });

const readBrewOrder = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const order = brewOrderSchema.safeParse(body);

  return order.success ? order.data : null;
};

export const teapot = new Hono();

teapot.get("/", (context) => context.json({ pot: "teapot", brews: ["tea"] }));

teapot.post("/", async (context) => {
  const order = await readBrewOrder(context.req.raw);
  if (!order) {
    return context.json({ code: "BAD_REQUEST", message: 'Send { "beverage": "tea" }' }, 400);
  }

  if (order.beverage === "coffee") {
    return context.json(
      {
        code: "IM_A_TEAPOT",
        message: "I refuse to brew coffee because I am, permanently, a teapot.",
      },
      418,
    );
  }

  return context.json({ status: "brewing", beverage: order.beverage }, 202);
});
