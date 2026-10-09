"use server";

import { ORPCError } from "@orpc/client";
import { refresh } from "next/cache";
import { apiClient } from "@/lib/api";
import { isAccessRefused } from "@/lib/api-errors";
import {
  type ProfileFormState,
  type ProfileValues,
  validateProfileValues,
} from "@/lib/profile-form";

const saveError = (error: unknown) => {
  if (isAccessRefused(error)) return "unauthorized";
  if (error instanceof ORPCError && error.code === "CONFLICT") return "rateInUse";

  return "saveFailed";
};

export const saveProfile = async (input: ProfileValues): Promise<ProfileFormState> => {
  const { parsed, state, values } = validateProfileValues(input);
  if (!parsed.success) return state;

  try {
    await apiClient.me.profile.save(parsed.data);
  } catch (error) {
    const failure: ProfileFormState = { error: saveError(error), values };

    return failure;
  }

  refresh();
  const saved: ProfileFormState = { saved: true, values };

  return saved;
};
