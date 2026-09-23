"use server";

import { userRoleSchema } from "@local-craftsmen/contracts";
import { revalidatePath } from "next/cache";
import { hasLocale } from "next-intl";
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
  } catch {
    const failure: ProfileFormState = { error: "saveFailed", values };

    return failure;
  }

  const requestedLocale = formData.get("locale");
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  revalidatePath(`${prefix}/dashboard`);
  for (const supportedLocale of routing.locales) {
    const directoryPrefix = supportedLocale === routing.defaultLocale ? "" : `/${supportedLocale}`;
    revalidatePath(`${directoryPrefix}/craftsmen`);
  }
  const saved: ProfileFormState = { saved: true, values };

  return saved;
};
