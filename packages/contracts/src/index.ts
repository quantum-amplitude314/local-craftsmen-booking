import { oc } from "@orpc/contract";
import { z } from "zod";
import { craftSchema } from "./crafts.ts";
import { craftsmenContract } from "./craftsmen.ts";

export const contract = {
  crafts: {
    list: oc
      .route({ method: "GET", path: "/crafts", summary: "List supported crafts" })
      .output(z.array(craftSchema)),
  },
  craftsmen: craftsmenContract,
};

export type Contract = typeof contract;

export { idSchema, type TimeRange, timeRangeSchema, userIdSchema } from "./common.ts";
export { CRAFTS, type Craft, craftSchema } from "./crafts.ts";
export { craftsmanDetailSchema, craftsmanProfileSchema } from "./craftsmen.ts";
