import {
  BOOKING_MIN_MINUTES,
  type CityId,
  type Currency,
  type Location,
  SCHEDULE_STEP_MINUTES,
  type SlotListing,
} from "@local-craftsmen/contracts";
import type { QuarterModel } from "@/lib/availability-model";
import { dayReader } from "@/lib/booking-calendar-model";
import { prepareScheduleCalendar, type ScheduleCalendarModel } from "@/lib/schedule-calendar-model";

const MINUTE_MS = 60_000;
const FALLBACK_TIME_ZONE = "Europe/Prague";

export type PlaceChoice = { value: string; label: string };

/** Everything the booking dialog shows and sends for one slot. */
export type OfferBookingModel = {
  slotId: string;
  cityId: CityId;
  currency: Currency;
  /** The slot's day on its city's clock, for showing the new booking once it is made. */
  date: string;
  craftsmanName: string;
  windowLabel: string;
  quarters: QuarterModel[];
  /** An empty value books the whole city, without a district. */
  places: PlaceChoice[];
  /** The slot covers one district only, so there is nothing to choose. */
  placeFixed: boolean;
  defaultPlace: string;
  /** The price line for each length the slot allows, by minutes. */
  priceLabels: Record<number, string>;
};

export type OfferCardModel = {
  id: string;
  timeLabel: string;
  craftsmanName: string;
  /** Craft and city are the filters' choice, so the card names only the place and the rate. */
  detailLabel: string;
  booking: OfferBookingModel;
};

export type SlotOfferModel = {
  calendar: ScheduleCalendarModel;
  cards: OfferCardModel[];
  emptyMessage: string | null;
};

export type SlotOfferText = {
  wholeCity: string;
  rate: (rate: string) => string;
  window: (parts: { day: string; start: string; end: string }) => string;
  price: (parts: { hours: string; rate: string; total: string }) => string;
  empty: string;
};

/**
 * Turns the slots on offer into the days worth marking and one day's cards. Each slot is read on
 * the clock of the city it is worked in, the same clock its hours are shown on.
 */
export const prepareSlotOffer = ({
  slots,
  locations,
  day,
  today,
  districtId,
  locale,
  text,
}: {
  slots: SlotListing[];
  locations: Location[];
  day: string;
  today: string;
  /** The district the customer filtered by, preselected where the slot allows it. */
  districtId: string;
  locale: string;
  text: SlotOfferText;
}) => {
  const { wholeCity, rate: rateText, window: windowText, price, empty } = text;
  const cities = new Map(locations.map((location) => [location.id, location]));
  const hours = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "hour",
    unitDisplay: "short",
    maximumFractionDigits: 2,
  });
  const money = new Map<Currency, Intl.NumberFormat>();
  const moneyIn = (currency: Currency) => {
    const known = money.get(currency);
    if (known) return known;

    const format = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    money.set(currency, format);

    return format;
  };
  const clocks = new Map<string, { day: Intl.DateTimeFormat; time: Intl.DateTimeFormat }>();
  const clockIn = (timeZone: string) => {
    const known = clocks.get(timeZone);
    if (known) return known;

    const clock = {
      day: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone,
      }),
      time: new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone,
      }),
    };
    clocks.set(timeZone, clock);

    return clock;
  };
  const toOffer = (slot: SlotListing) => {
    const { id, start, end, areas, craftsman } = slot;
    const [rate] = craftsman.rates;
    const cityId = areas[0]?.cityId;
    if (!rate || !cityId) return [];

    const city = cities.get(cityId);
    const timeZone = city?.timeZone ?? FALLBACK_TIME_ZONE;
    const { day: dayFormat, time } = clockIn(timeZone);
    const startsAt = Date.parse(start);
    const window = Math.round((Date.parse(end) - startsAt) / MINUTE_MS);
    const quarters: QuarterModel[] = Array.from(
      { length: window / SCHEDULE_STEP_MINUTES },
      (_, index) => {
        const quarterStart = new Date(startsAt + index * SCHEDULE_STEP_MINUTES * MINUTE_MS);
        const quarterEnd = new Date(quarterStart.getTime() + SCHEDULE_STEP_MINUTES * MINUTE_MS);
        const quarter: QuarterModel = {
          start: quarterStart.toISOString(),
          end: quarterEnd.toISOString(),
          state: "free",
          label: time.format(quarterStart),
          endLabel: time.format(quarterEnd),
        };

        return quarter;
      },
    );
    const districtNames = new Map(city?.districts.map(({ id: key, name }) => [key, name]));
    const coversWholeCity = areas.some((area) => area.districtId === null);
    const places: PlaceChoice[] = coversWholeCity
      ? [
          { value: "", label: wholeCity },
          ...(city?.districts ?? []).map(({ id: key, name }) => ({ value: key, label: name })),
        ]
      : areas.flatMap((area) =>
          area.districtId
            ? [{ value: area.districtId, label: districtNames.get(area.districtId) ?? "" }]
            : [],
        );
    const placeLabel = coversWholeCity ? wholeCity : places.map(({ label }) => label).join(", ");
    const hourlyRate = Number(rate.hourlyRate);
    const format = moneyIn(rate.currency);
    const priceLabels: Record<number, string> = {};
    for (let minutes = BOOKING_MIN_MINUTES; minutes <= window; minutes += SCHEDULE_STEP_MINUTES) {
      priceLabels[minutes] = price({
        hours: hours.format(minutes / 60),
        rate: format.format(hourlyRate),
        total: format.format((hourlyRate * minutes) / 60),
      });
    }
    const startLabel = time.format(new Date(start));
    const endLabel = time.format(new Date(end));
    const card: OfferCardModel = {
      id,
      timeLabel: `${startLabel} – ${endLabel}`,
      craftsmanName: craftsman.name,
      detailLabel: `${placeLabel} · ${rateText(format.format(hourlyRate))}`,
      booking: {
        slotId: id,
        cityId,
        currency: rate.currency,
        date: dayReader(timeZone)(new Date(start)),
        craftsmanName: craftsman.name,
        windowLabel: windowText({
          day: dayFormat.format(new Date(start)),
          start: startLabel,
          end: endLabel,
        }),
        quarters,
        places,
        placeFixed: places.length === 1,
        defaultPlace: places.some(({ value }) => value === districtId)
          ? districtId
          : (places[0]?.value ?? ""),
        priceLabels,
      },
    };

    return [card];
  };
  const offered = slots.toSorted((a, b) => a.start.localeCompare(b.start)).flatMap(toOffer);
  const onDay = offered.filter(({ booking }) => booking.date === day);
  const model: SlotOfferModel = {
    calendar: prepareScheduleCalendar({
      date: day,
      today,
      markedDates: [...new Set(offered.map(({ booking }) => booking.date))],
    }),
    cards: onDay,
    emptyMessage: onDay.length === 0 ? empty : null,
  };

  return model;
};
