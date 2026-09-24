import type { Area, Location } from "@local-craftsmen/contracts";

/** "City · District", or just the city when the area covers all of it. */
export const areaLabel = ({
  area,
  locations,
  cityName,
}: {
  area: Area;
  locations: Location[];
  cityName: (cityId: Area["cityId"]) => string;
}) => {
  const { cityId, districtId } = area;
  const districts = locations.find(({ id }) => id === cityId)?.districts ?? [];
  const district = districts.find(({ id }) => id === districtId);
  const label = [cityName(cityId), district?.name].filter(Boolean).join(" · ");

  return label;
};
