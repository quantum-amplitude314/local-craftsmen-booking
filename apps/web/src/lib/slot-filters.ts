import { type SlotSearch, slotSearchSchema } from "@local-craftsmen/contracts";

/** The filter values as the form holds them: every field is a string, empty meaning "any". */
export type SlotFilters = { craft: string; cityId: string; districtId: string; date: string };

export type SlotFilterField = keyof SlotFilters;

export const emptySlotFilters: SlotFilters = { craft: "", cityId: "", districtId: "", date: "" };

type ParamValue = string | string[] | undefined;

const firstValue = (value: ParamValue) => {
  const single = Array.isArray(value) ? value[0] : value;

  return single?.trim() || undefined;
};

/** A district without its city, or an unknown craft, would be rejected by the API; drop it here. */
const asSearch = (filters: SlotFilters) => {
  const candidate = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== ""),
  ) as Partial<SlotFilters>;
  const parsed = slotSearchSchema.safeParse(candidate);
  const search: SlotSearch = parsed.success ? parsed.data : {};

  return search;
};

/**
 * The listing is a link people share, so its filters live in the URL and are read back through the
 * same schema the API validates with. Anything that would not pass falls back to no filter at all.
 */
export const readSlotFilters = ({ params }: { params: Record<string, ParamValue> }) => {
  const search = asSearch({
    craft: firstValue(params.craft) ?? "",
    cityId: firstValue(params.city) ?? "",
    districtId: firstValue(params.district) ?? "",
    date: firstValue(params.date) ?? "",
  });
  const { craft = "", cityId = "", districtId = "", date = "" } = search;
  const result = { search, filters: { craft, cityId, districtId, date } };

  return result;
};

/** Only the fields in use, so a cleared filter leaves the address bar instead of lingering empty. */
export const slotFilterQuery = ({ filters }: { filters: SlotFilters }) => {
  const { craft, cityId, districtId, date } = filters;
  const query: Record<string, string> = {};
  if (craft) query.craft = craft;
  if (cityId) query.city = cityId;
  if (cityId && districtId) query.district = districtId;
  if (date) query.date = date;

  return query;
};

export const hasSlotFilters = ({ filters }: { filters: SlotFilters }) =>
  Object.values(filters).some((value) => value !== "");
