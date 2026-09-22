import { areaCitySchema, type Craft } from "@local-craftsmen/contracts";
import { availability, craftsmanProfile, type Db, user } from "@local-craftsmen/db";
import { eq } from "drizzle-orm";

const profileColumns = {
  id: craftsmanProfile.userId,
  name: user.name,
  craft: craftsmanProfile.craft,
  baseCityId: craftsmanProfile.baseCityId,
  baseOtherCityName: craftsmanProfile.baseOtherCityName,
  baseDistrict: craftsmanProfile.baseDistrict,
  hourlyRate: craftsmanProfile.hourlyRate,
  bio: craftsmanProfile.bio,
};

type ProfileRow = {
  baseCityId: string | null;
  baseOtherCityName: string | null;
  baseDistrict: string | null;
};

const toProfile = <Row extends ProfileRow>({
  baseCityId,
  baseOtherCityName,
  baseDistrict,
  ...profile
}: Row) => {
  const city = areaCitySchema.parse(
    baseCityId
      ? { kind: "maintained", id: baseCityId }
      : { kind: "other", name: baseOtherCityName },
  );
  const result = { ...profile, baseArea: { city, district: baseDistrict } };

  return result;
};

export const createCraftsmenService = ({ db }: { db: Db }) => {
  const list = async ({ craft }: { craft?: Craft | undefined }) => {
    const rows = await db
      .select(profileColumns)
      .from(craftsmanProfile)
      .innerJoin(user, eq(user.id, craftsmanProfile.userId))
      .where(craft ? eq(craftsmanProfile.craft, craft) : undefined);
    const profiles = rows.map(toProfile);

    return profiles;
  };

  const find = async ({ id }: { id: string }) => {
    const [row] = await db
      .select(profileColumns)
      .from(craftsmanProfile)
      .innerJoin(user, eq(user.id, craftsmanProfile.userId))
      .where(eq(craftsmanProfile.userId, id));
    if (!row) return null;

    const ranges = await db
      .select({ id: availability.id, range: availability.range })
      .from(availability)
      .where(eq(availability.craftsmanId, id));

    const detail = {
      ...toProfile(row),
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
