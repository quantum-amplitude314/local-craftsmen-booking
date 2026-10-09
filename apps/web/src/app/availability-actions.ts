"use server";

import { idSchema, type SlotInput, slotInputSchema } from "@local-craftsmen/contracts";
import { ORPCError } from "@orpc/client";
import { refresh } from "next/cache";
import { apiClient } from "@/lib/api";
import { isAccessRefused } from "@/lib/api-errors";

export type SlotFormState = {
  error?: "invalid" | "occupied" | "saveFailed" | "unauthorized";
  saved?: boolean;
};

export type DeleteSlotState = { error?: "deleteFailed" | "unauthorized" };

const slotErrorsByCode: Record<string, SlotFormState["error"]> = {
  CONFLICT: "occupied",
  BAD_REQUEST: "invalid",
};

const slotError = (error: unknown) => {
  if (isAccessRefused(error)) return "unauthorized";
  const reason = (error instanceof ORPCError && slotErrorsByCode[error.code]) || "saveFailed";

  return reason;
};

export const createSlot = async (input: SlotInput): Promise<SlotFormState> => {
  const parsed = slotInputSchema.safeParse(input);
  if (!parsed.success) {
    const invalid: SlotFormState = { error: "invalid" };

    return invalid;
  }

  try {
    await apiClient.me.availability.create(parsed.data);
  } catch (error) {
    const failure: SlotFormState = { error: slotError(error) };

    return failure;
  }

  refresh();
  const saved: SlotFormState = { saved: true };

  return saved;
};

export const deleteSlot = async (input: { id: string }): Promise<DeleteSlotState> => {
  const parsed = idSchema.safeParse(input?.id);
  if (!parsed.success) {
    const invalid: DeleteSlotState = { error: "deleteFailed" };

    return invalid;
  }

  try {
    await apiClient.me.availability.remove({ id: parsed.data });
  } catch (error) {
    const alreadyGone = error instanceof ORPCError && error.code === "NOT_FOUND";
    if (!alreadyGone) {
      const failure: DeleteSlotState = {
        error: isAccessRefused(error) ? "unauthorized" : "deleteFailed",
      };

      return failure;
    }
  }

  refresh();
  const deleted: DeleteSlotState = {};

  return deleted;
};
