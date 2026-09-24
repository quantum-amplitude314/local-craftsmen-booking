import { cityIdSchema, type Location } from "@local-craftsmen/contracts";
import { city, type Db, district } from "@local-craftsmen/db";

export const createLocationsService = ({ db }: { db: Db }) => {
  const list = async () => {
    const [cities, districts] = await Promise.all([
      db.select().from(city).orderBy(city.name),
      db.select().from(district).orderBy(district.name),
    ]);
    const locations: Location[] = cities.map(({ id, name, timeZone }) => ({
      id: cityIdSchema.parse(id),
      name,
      timeZone,
      districts: districts
        .filter(({ cityId }) => cityId === id)
        .map(({ id, name }) => ({ id, name })),
    }));

    return locations;
  };
  const service = { list };

  return service;
};
export type LocationsService = ReturnType<typeof createLocationsService>;
