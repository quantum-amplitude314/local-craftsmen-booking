"use server";

import { userRoleSchema } from "@local-craftsmen/contracts";
import { ORPCError } from "@orpc/client";
import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { type ProfileFormState, validateProfileForm } from "@/lib/profile-form";

export const saveProfile = async (
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> => {
  const { parsed, state, values } = validateProfileForm(formData);
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

  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
    for (const path of ["/profile", "/dashboard", "/slots"]) revalidatePath(`${prefix}${path}`);
  }
  const saved: ProfileFormState = { saved: true, values };

  return saved;
};
