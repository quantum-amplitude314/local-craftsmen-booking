"use server";

import {
  idSchema,
  type SlotInput,
  slotInputSchema,
  userRoleSchema,
} from "@local-craftsmen/contracts";
import { ORPCError } from "@orpc/client";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { revalidateLocalized } from "@/lib/revalidate";

export type SlotFormState = {
  error?: "invalid" | "occupied" | "saveFailed" | "unauthorized";
  saved?: boolean;
};

export type DeleteSlotState = { error?: "deleteFailed" | "unauthorized" };

const scheduledPaths = ["/dashboard"];

const isCraftsman = async () => {
  const user = await getCurrentUser();
  const craftsman = user?.role === userRoleSchema.enum.craftsman;

  return craftsman;
};

const slotErrorsByCode: Record<string, SlotFormState["error"]> = {
  CONFLICT: "occupied",
  BAD_REQUEST: "invalid",
};

const slotError = (error: unknown) => {
  const reason = (error instanceof ORPCError && slotErrorsByCode[error.code]) || "saveFailed";

  return reason;
};

export const createSlot = async (input: SlotInput): Promise<SlotFormState> => {
  const parsed = slotInputSchema.safeParse(input);
  if (!parsed.success) {
    const invalid: SlotFormState = { error: "invalid" };

    return invalid;
  }
  if (!(await isCraftsman())) {
    const unauthorized: SlotFormState = { error: "unauthorized" };

    return unauthorized;
  }

  try {
    await apiClient.me.availability.create(parsed.data);
  } catch (error) {
    const failure: SlotFormState = { error: slotError(error) };

    return failure;
  }

  revalidateLocalized(scheduledPaths);
  const saved: SlotFormState = { saved: true };

  return saved;
};

export const deleteSlot = async (input: { id: string }): Promise<DeleteSlotState> => {
  const parsed = idSchema.safeParse(input?.id);
  if (!parsed.success) {
    const invalid: DeleteSlotState = { error: "deleteFailed" };

    return invalid;
  }
  if (!(await isCraftsman())) {
    const unauthorized: DeleteSlotState = { error: "unauthorized" };

    return unauthorized;
  }

  try {
    await apiClient.me.availability.remove({ id: parsed.data });
  } catch (error) {
    const alreadyGone = error instanceof ORPCError && error.code === "NOT_FOUND";
    if (!alreadyGone) {
      const failure: DeleteSlotState = { error: "deleteFailed" };

      return failure;
    }
  }

  revalidateLocalized(scheduledPaths);
  const deleted: DeleteSlotState = {};

  return deleted;
};
