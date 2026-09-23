import {
  type CraftsmanRate,
  cityIdSchema,
  currencySchema,
  type ProfileInput,
  type SlotSearch,
} from "@local-craftsmen/contracts";
import { availability, craftsmanProfile, craftsmanRate, type Db, user } from "@local-craftsmen/db";
import { and, eq, exists, inArray } from "drizzle-orm";
import { createSlotsService, slotPredicate } from "./slots.ts";

const profileColumns = {
  id: craftsmanProfile.userId,
  name: user.name,
  craft: craftsmanProfile.craft,
  baseCityId: craftsmanProfile.baseCityId,
  baseDistrictId: craftsmanProfile.baseDistrictId,
  bio: craftsmanProfile.bio,
};

type ProfileRow = {
  baseCityId: string;
  baseDistrictId: string | null;
};

const toProfile = <Row extends ProfileRow>({ baseCityId, baseDistrictId, ...profile }: Row) => {
  const result = {
    ...profile,
    baseArea: { cityId: cityIdSchema.parse(baseCityId), districtId: baseDistrictId },
  };

  return result;
};

export const createCraftsmenService = ({ db }: { db: Db }) => {
  const readRates = async ({ ids }: { ids: string[] }) => {
    const ratesByCraftsman = new Map<string, CraftsmanRate[]>();
    if (ids.length === 0) return ratesByCraftsman;

    const rows = await db
      .select()
      .from(craftsmanRate)
      .where(inArray(craftsmanRate.craftsmanId, ids))
      .orderBy(craftsmanRate.currency);
    for (const { craftsmanId, currency, hourlyRate } of rows) {
      const rates = ratesByCraftsman.get(craftsmanId) ?? [];
      rates.push({ currency: currencySchema.parse(currency), hourlyRate });
      ratesByCraftsman.set(craftsmanId, rates);
    }

    return ratesByCraftsman;
  };

  const list = async (input: SlotSearch) => {
    const { craft, cityId, districtId, start, end } = input;
    const filteredBySlot = cityId || districtId || start || end;
    const rows = await db
      .select(profileColumns)
      .from(craftsmanProfile)
      .innerJoin(user, eq(user.id, craftsmanProfile.userId))
      .where(
        and(
          craft ? eq(craftsmanProfile.craft, craft) : undefined,
          filteredBySlot
            ? exists(
                db
                  .select({ id: availability.id })
                  .from(availability)
                  .where(
                    and(
                      eq(availability.craftsmanId, craftsmanProfile.userId),
                      slotPredicate({ db, input }),
                    ),
                  ),
              )
            : undefined,
        ),
      );
    const ratesByCraftsman = await readRates({ ids: rows.map(({ id }) => id) });
    const profiles = rows.map((row) => ({
      ...toProfile(row),
      rates: ratesByCraftsman.get(row.id) ?? [],
    }));

    return profiles;
  };

  const getProfile = async ({ id }: { id: string }) => {
    const [row] = await db
      .select(profileColumns)
      .from(craftsmanProfile)
      .innerJoin(user, eq(user.id, craftsmanProfile.userId))
      .where(eq(craftsmanProfile.userId, id));
    if (!row) return null;

    const ratesByCraftsman = await readRates({ ids: [id] });
    const profile = { ...toProfile(row), rates: ratesByCraftsman.get(id) ?? [] };

    return profile;
  };

  const saveProfile = async ({ id, input }: { id: string; input: ProfileInput }) => {
    const { craft, baseArea, bio, rates } = input;
    const { cityId, districtId } = baseArea;
    const values = {
      craft,
      baseCityId: cityId,
      baseDistrictId: districtId,
      bio: bio || null,
      updatedAt: new Date(),
    };
    const profile = await db.transaction(async (tx) => {
      // The upsert locks this profile before replacing its rates, serializing concurrent saves.
      await tx
        .insert(craftsmanProfile)
        .values({ userId: id, ...values })
        .onConflictDoUpdate({ target: craftsmanProfile.userId, set: values });
      await tx.delete(craftsmanRate).where(eq(craftsmanRate.craftsmanId, id));
      const savedRates = await tx
        .insert(craftsmanRate)
        .values(
          rates.map(({ currency, hourlyRate }) => ({ craftsmanId: id, currency, hourlyRate })),
        )
        .returning({ currency: craftsmanRate.currency, hourlyRate: craftsmanRate.hourlyRate });
      const [row] = await tx
        .select(profileColumns)
        .from(craftsmanProfile)
        .innerJoin(user, eq(user.id, craftsmanProfile.userId))
        .where(eq(craftsmanProfile.userId, id));
      if (!row) throw new Error("Saved craftsman profile is missing");
      const result = {
        ...toProfile(row),
        rates: savedRates.map(({ currency, hourlyRate }) => ({
          currency: currencySchema.parse(currency),
          hourlyRate,
        })),
      };

      return result;
    });

    return profile;
  };

  const find = async ({ id }: { id: string }) => {
    const profile = await getProfile({ id });
    if (!profile) return null;

    const slots = await createSlotsService({ db }).list({ craftsmanId: id });

    const detail = {
      ...profile,
      availability: slots,
    };

    return detail;
  };

  const service = { list, find, getProfile, saveProfile };

  return service;
};

export type CraftsmenService = ReturnType<typeof createCraftsmenService>;
