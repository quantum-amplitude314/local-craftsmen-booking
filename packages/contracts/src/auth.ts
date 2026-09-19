import { oc } from "@orpc/contract";
import { z } from "zod";

export const userRoleSchema = z.enum(["customer", "craftsman"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const registrationSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(100),
  role: userRoleSchema,
});

export const meContract = {
  get: oc
    .route({ method: "GET", path: "/me", summary: "Get the signed-in user" })
    .output(sessionUserSchema),
};
