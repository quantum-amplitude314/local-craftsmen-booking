import { customType } from "drizzle-orm/pg-core";

export type DateRange = { start: Date; end: Date };

const parseRange = (raw: string): DateRange => {
  const [start, end] = raw.slice(1, -1).split(",");
  if (!start || !end) throw new Error(`invalid tstzrange: ${raw}`);

  return { start: new Date(start.replaceAll('"', "")), end: new Date(end.replaceAll('"', "")) };
};

export const tstzrange = customType<{ data: DateRange; driverData: string }>({
  dataType: () => "tstzrange",
  toDriver: ({ start, end }) => `[${start.toISOString()},${end.toISOString()})`,
  fromDriver: parseRange,
});
