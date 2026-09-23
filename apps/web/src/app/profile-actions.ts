"use server";

import { userRoleSchema } from "@local-craftsmen/contracts";
import { ORPCError } from "@orpc/client";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  type ProfileFormState,
  type ProfileValues,
  validateProfileValues,
} from "@/lib/profile-form";
import { revalidateLocalized } from "@/lib/revalidate";

export const saveProfile = async (input: ProfileValues): Promise<ProfileFormState> => {
  const { parsed, state, values } = validateProfileValues(input);
  if (!parsed.success) return state;

  try {
    const user = await getCurrentUser();
    if (!user || user.role !== userRoleSchema.enum.craftsman) {
      const failure: ProfileFormState = { error: "unauthorized", values };

      return failure;
    }
    await apiClient.me.profile.save(parsed.data);
  } catch (error) {
    const rateInUse = error instanceof ORPCError && error.code === "CONFLICT";
    const failure: ProfileFormState = { error: rateInUse ? "rateInUse" : "saveFailed", values };

    return failure;
  }

  revalidateLocalized(["/profile", "/dashboard", "/slots"]);
  const saved: ProfileFormState = { saved: true, values };

  return saved;
};
