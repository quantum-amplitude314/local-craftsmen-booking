import type { Craft } from "@local-craftsmen/contracts";
import { availability, craftsmanProfile, type Db, user } from "@local-craftsmen/db";
import { and, eq } from "drizzle-orm";

const profileColumns = {
  id: craftsmanProfile.userId,
  name: user.name,
  craft: craftsmanProfile.craft,
  city: craftsmanProfile.city,
  hourlyRate: craftsmanProfile.hourlyRate,
  bio: craftsmanProfile.bio,
};

export const createCraftsmenService = ({ db }: { db: Db }) => {
  const list = ({ craft, city }: { craft?: Craft | undefined; city?: string | undefined }) => {
    const filters = [
      craft ? eq(craftsmanProfile.craft, craft) : undefined,
      city ? eq(craftsmanProfile.city, city) : undefined,
    ];

    return db
      .select(profileColumns)
      .from(craftsmanProfile)
      .innerJoin(user, eq(user.id, craftsmanProfile.userId))
      .where(and(...filters));
  };

  const find = async ({ id }: { id: string }) => {
    const [profile] = await db
      .select(profileColumns)
      .from(craftsmanProfile)
      .innerJoin(user, eq(user.id, craftsmanProfile.userId))
      .where(eq(craftsmanProfile.userId, id));
    if (!profile) return null;

    const ranges = await db
      .select({ id: availability.id, range: availability.range })
      .from(availability)
      .where(eq(availability.craftsmanId, id));

    const detail = {
      ...profile,
      availability: ranges.map(({ id: rangeId, range: { start, end } }) => ({
        id: rangeId,
        start: start.toISOString(),
        end: end.toISOString(),
      })),
    };

    return detail;
  };

  const service = { list, find };

  return service;
};

export type CraftsmenService = ReturnType<typeof createCraftsmenService>;
