import { oc } from "@orpc/contract";
import { z } from "zod";
import { meContract } from "./auth.ts";
import { craftSchema } from "./crafts.ts";
import { craftsmenContract } from "./craftsmen.ts";

export const contract = {
  crafts: {
    list: oc
      .route({ method: "GET", path: "/crafts", summary: "List supported crafts" })
      .output(z.array(craftSchema)),
  },
  craftsmen: craftsmenContract,
  me: meContract,
};

export type Contract = typeof contract;

export {
  type AuthField,
  type AuthFieldErrors,
  type AuthValidationError,
  getAuthFieldErrors,
  loginSchema,
  registrationSchema,
  type SessionUser,
  sessionUserSchema,
  type UserRole,
  userRoleSchema,
} from "./auth.ts";
export {
  type Area,
  areaCitySchema,
  areaSchema,
  CITY_IDS,
  type CityId,
  cityIdSchema,
} from "./cities.ts";
export { idSchema, type TimeRange, timeRangeSchema, userIdSchema } from "./common.ts";
export { CRAFTS, type Craft, craftSchema } from "./crafts.ts";
export { craftsmanDetailSchema, craftsmanProfileSchema } from "./craftsmen.ts";
