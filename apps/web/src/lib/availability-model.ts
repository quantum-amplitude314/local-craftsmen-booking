import type { Area, AvailabilityDay, CityId, Location, Quarter } from "@local-craftsmen/contracts";
import type { SlotFormState } from "@/app/availability-actions";
import { areaLabel } from "@/lib/area-label";
import { prepareScheduleCalendar, type ScheduleCalendarModel } from "@/lib/schedule-calendar-model";
import type { DraftStatus } from "@/lib/slot-selection";

/** A quarter-hour with the labels it is shown by; `start`/`end` stay the instants the API sent. */
export type QuarterModel = Quarter & { label: string; endLabel: string };

export type DaySlotModel = { id: string; timeLabel: string; areaLabel: string };

export type OptionModel = { value: string; label: string };

export type HintModel = { text: string; tone: "muted" | "destructive" };

export type DraftIssue = Exclude<DraftStatus, "ready">;

export type SlotError = NonNullable<SlotFormState["error"]>;

export type AvailabilityModel = {
  date: string;
  /** The planned day, as the dialog names it. */
  dayLabel: string;
  calendar: ScheduleCalendarModel;
  zoneNote: string;
  quarters: QuarterModel[];
  /** The next day's first hours, joined to the list once a selection reaches midnight. */
  nextDayQuarters: QuarterModel[];
  slots: DaySlotModel[];
  cities: OptionModel[];
  districtsByCity: Record<string, OptionModel[]>;
  /** What the new slot covers: the city the day was read in, narrowed by an optional district. */
  draftArea: { cityId: string; districtId: string };
  hints: Record<DraftIssue, HintModel>;
  errors: Record<SlotError, string>;
  savedMessage: string;
};

export type AvailabilityText = {
  cityName: (cityId: CityId) => string;
  zoneNote: (values: { city: string; zone: string }) => string;
  hints: Record<DraftIssue, string>;
  errors: Record<SlotError, string>;
  saved: string;
};

const hintTones: Record<DraftIssue, HintModel["tone"]> = {
  pickRange: "muted",
  tooShort: "destructive",
  tooLong: "destructive",
};

const readZoneName = ({ format, instant }: { format: Intl.DateTimeFormat; instant: string }) => {
  const name = format.formatToParts(new Date(instant)).find(({ type }) => type === "timeZoneName");

  return name?.value ?? "";
};

/**
 * Turns one day of the craftsman's schedule into the strings the planner renders. Times use the
 * schedule's own zone and the page locale, so the browser never reformats them.
 */
export const prepareAvailability = ({
  schedule,
  locations,
  baseArea,
  locale,
  text,
}: {
  schedule: AvailabilityDay;
  locations: Location[];
  baseArea: Area;
  locale: string;
  text: AvailabilityText;
}) => {
  const { timeZone, date, today, quarters, nextDayQuarters, slots, slotDates } = schedule;
  const { cityName, hints, errors } = text;
  const formatTime = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timeZone.id,
  });
  const formatDay = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: timeZone.id,
  });
  const formatZone = new Intl.DateTimeFormat(locale, {
    timeZone: timeZone.id,
    timeZoneName: "short",
  });
  const label = (time: string) => formatTime.format(new Date(time));
  const toQuarterModel = (quarter: Quarter) => {
    const { start, end } = quarter;
    const model: QuarterModel = { ...quarter, label: label(start), endLabel: label(end) };

    return model;
  };
  const dayStart = quarters[0]?.start ?? `${date}T00:00:00.000Z`;
  const availability: AvailabilityModel = {
    date,
    dayLabel: formatDay.format(new Date(dayStart)),
    calendar: prepareScheduleCalendar({ date, today, markedDates: slotDates }),
    zoneNote: text.zoneNote({
      city: cityName(timeZone.cityId),
      zone: readZoneName({ format: formatZone, instant: dayStart }),
    }),
    quarters: quarters.map(toQuarterModel),
    nextDayQuarters: nextDayQuarters.map(toQuarterModel),
    slots: slots.map(({ id, start, end, areas }) => ({
      id,
      timeLabel: `${label(start)} – ${label(end)}`,
      areaLabel: areas.map((area) => areaLabel({ area, locations, cityName })).join(", "),
    })),
    cities: locations.map(({ id }) => ({ value: id, label: cityName(id) })),
    districtsByCity: Object.fromEntries(
      locations.map(({ id, districts }) => [
        id,
        districts.map((district) => ({ value: district.id, label: district.name })),
      ]),
    ),
    // The schedule's own city wins: the hours on screen were counted in its zone. The base district
    // only preselects while the craftsman is still planning at home.
    draftArea: {
      cityId: timeZone.cityId,
      districtId: timeZone.cityId === baseArea.cityId ? (baseArea.districtId ?? "") : "",
    },
    hints: {
      pickRange: { text: hints.pickRange, tone: hintTones.pickRange },
      tooShort: { text: hints.tooShort, tone: hintTones.tooShort },
      tooLong: { text: hints.tooLong, tone: hintTones.tooLong },
    },
    errors,
    savedMessage: text.saved,
  };

  return availability;
};
