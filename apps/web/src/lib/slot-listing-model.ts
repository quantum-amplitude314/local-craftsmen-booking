import type {
  Area,
  CityId,
  CraftsmanRate,
  Currency,
  Location,
  SlotListing,
} from "@local-craftsmen/contracts";
import { BOOKING_MIN_MINUTES, SCHEDULE_STEP_MINUTES } from "@local-craftsmen/contracts";

const MINUTE_MS = 60_000;

export type Choice = { value: string; label: string };
/** A start the customer may pick, with the longest booking it still leaves room for. */
export type StartChoice = Choice & { maxMinutes: number };
export type DurationChoice = {
  minutes: number;
  label: string;
  priceLabels: Record<string, string>;
};

export type SlotBookingModel = {
  slotId: string;
  cityId: CityId;
  starts: StartChoice[];
  durations: DurationChoice[];
  areas: Choice[];
  currencies: Choice[];
};

export type SlotCardModel = {
  id: string;
  craftsmanId: string;
  craftLabel: string;
  craftsmanName: string;
  whenLabel: string;
  zoneNote: string;
  placeLabel: string;
  rateLabel: string;
  perHourLabel: string;
  booking: SlotBookingModel;
};

export type SlotListingText = {
  craftName: (craft: SlotListing["craftsman"]["craft"]) => string;
  cityName: (cityId: CityId) => string;
  wholeCity: (city: string) => string;
  zoneNote: (place: { city: string; zone: string }) => string;
  perHour: string;
};

const toMinutes = ({ start, end }: { start: string; end: string }) =>
  Math.round((Date.parse(end) - Date.parse(start)) / MINUTE_MS);

/**
 * Every slot listing prepared for reading and for booking: its hours on the clock of the city it is
 * worked in, and the starts, lengths, places and prices a customer may choose between.
 */
export const prepareSlotListings = ({
  slots,
  locations,
  locale,
  text,
}: {
  slots: SlotListing[];
  locations: Location[];
  locale: string;
  text: SlotListingText;
}) => {
  const { craftName, cityName, wholeCity, zoneNote } = text;
  const cities = new Map(locations.map((location) => [location.id, location]));
  const hours = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "hour",
    unitDisplay: "short",
    maximumFractionDigits: 2,
  });
  const money = new Map<Currency, Intl.NumberFormat>();
  const priceIn = (currency: Currency) => {
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
  const districtName = ({ cityId, districtId }: Area) =>
    cities.get(cityId)?.districts.find(({ id }) => id === districtId)?.name ?? null;
  const areaChoice = (area: Area) => {
    const district = districtName(area);
    const city = cityName(area.cityId);
    const choice: Choice = {
      value: area.districtId ?? "",
      label: district ?? wholeCity(city),
    };

    return choice;
  };
  const toCard = ({ id, start, end, areas, craftsman }: SlotListing) => {
    const [first] = areas;
    const cityId = first?.cityId ?? "prague";
    const city = cities.get(cityId);
    const timeZone = city?.timeZone ?? "Europe/Prague";
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
    const startsAt = Date.parse(start);
    const window = toMinutes({ start, end });
    const starts: StartChoice[] = [];
    for (let offset = 0; offset + BOOKING_MIN_MINUTES <= window; offset += SCHEDULE_STEP_MINUTES) {
      const moment = new Date(startsAt + offset * MINUTE_MS);
      starts.push({
        value: moment.toISOString(),
        label: clock.time.format(moment),
        maxMinutes: window - offset,
      });
    }
    const durations: DurationChoice[] = [];
    for (let minutes = BOOKING_MIN_MINUTES; minutes <= window; minutes += SCHEDULE_STEP_MINUTES) {
      const priceLabels = Object.fromEntries(
        craftsman.rates.map(({ currency, hourlyRate }) => [
          currency,
          priceIn(currency).format((Number(hourlyRate) * minutes) / 60),
        ]),
      );
      durations.push({ minutes, label: hours.format(minutes / 60), priceLabels });
    }
    const card: SlotCardModel = {
      id,
      craftsmanId: craftsman.id,
      craftLabel: craftName(craftsman.craft),
      craftsmanName: craftsman.name,
      whenLabel: `${clock.day.format(new Date(start))}, ${clock.time.format(new Date(start))} – ${clock.time.format(new Date(end))}`,
      zoneNote: zoneNote({ city: cityName(cityId), zone: timeZone }),
      placeLabel: areas.map((area) => districtName(area) ?? cityName(area.cityId)).join(" · "),
      rateLabel: rateLabel({ rates: craftsman.rates, priceIn }),
      perHourLabel: text.perHour,
      booking: {
        slotId: id,
        cityId,
        starts,
        durations,
        areas: areas.map(areaChoice),
        currencies: craftsman.rates.map(({ currency }) => ({ value: currency, label: currency })),
      },
    };

    return card;
  };
  const cards = slots.map(toCard);

  return cards;
};

const rateLabel = ({
  rates,
  priceIn,
}: {
  rates: CraftsmanRate[];
  priceIn: (currency: Currency) => Intl.NumberFormat;
}) => {
  const label = rates
    .map(({ currency, hourlyRate }) => priceIn(currency).format(Number(hourlyRate)))
    .join(" · ");

  return label;
};
