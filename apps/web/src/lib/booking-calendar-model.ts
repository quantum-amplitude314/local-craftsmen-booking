import type {
  Booking,
  BookingTransition,
  CityId,
  CraftsmanBooking,
  Currency,
} from "@local-craftsmen/contracts";
import { prepareScheduleCalendar, type ScheduleCalendarModel } from "@/lib/schedule-calendar-model";

export type BookingActionModel = {
  transition: BookingTransition;
  label: string;
  pendingLabel: string;
};

export type BookingCardModel = {
  id: string;
  timeLabel: string;
  customerName: string;
  placeLabel: string;
  priceLabel: string;
  statusLabel: string;
  statusVariant: "default" | "secondary" | "outline";
  cancellable: boolean;
  /** The steps forward; cancelling is offered apart, behind a confirmation. */
  actions: BookingActionModel[];
};

/** The clock the grid is drawn on: where the reader is, and when the page was built. */
export type ViewerClock = { timeZone: string; today: string; now: string };

export type BookingCalendarModel = {
  calendar: ScheduleCalendarModel;
  emptyMessage: string | null;
  cards: BookingCardModel[];
};

export type BookingCalendarText = {
  cityName: (id: CityId) => string;
  status: (status: Booking["status"]) => string;
  action: (transition: BookingTransition) => string;
  actionPending: (transition: BookingTransition) => string;
  price: (parts: { hours: string; rate: string; total: string }) => string;
  empty: string;
};

const statusVariants: Record<Booking["status"], BookingCardModel["statusVariant"]> = {
  pending: "outline",
  confirmed: "default",
  completed: "secondary",
  cancelled: "secondary",
};

/** The step forward the craftsman may take with a job; finished work is only ever reported late. */
const forwardTransitions: Record<Booking["status"], BookingTransition[]> = {
  pending: ["confirm"],
  confirmed: ["complete"],
  completed: [],
  cancelled: [],
};
const cancellableStatuses: Booking["status"][] = ["pending", "confirmed"];
const needsFinishedWork: BookingTransition[] = ["complete"];

/** The calendar date a moment falls on for whoever is reading the grid. */
export const dayReader = (timeZone: string) => {
  const format = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  });

  return (instant: Date) => format.format(instant);
};

const formatJobHours = ({
  start,
  end,
  format,
}: {
  start: string;
  end: string;
  format: Intl.DateTimeFormat;
}) => `${format.format(new Date(start))} – ${format.format(new Date(end))}`;

/**
 * Turns a window of jobs into one day's cards and the days worth marking. Every job is read on the
 * grid's own clock, so a job abroad lands on the day the reader would call it.
 */
export const prepareBookingCalendar = ({
  bookings,
  day,
  today,
  now,
  timeZone,
  locale,
  text,
}: {
  bookings: CraftsmanBooking[];
  day: string;
  today: string;
  now: string;
  timeZone: string;
  locale: string;
  text: BookingCalendarText;
}) => {
  const { cityName, status: statusLabel, action, actionPending, price } = text;
  const thisMoment = new Date(now);
  const offer = ({ status, end }: { status: Booking["status"]; end: string }) => {
    const done = new Date(end) <= thisMoment;
    const actions: BookingActionModel[] = forwardTransitions[status]
      .filter((transition) => done || !needsFinishedWork.includes(transition))
      .map((transition) => ({
        transition,
        label: action(transition),
        pendingLabel: actionPending(transition),
      }));

    return actions;
  };
  const dayOf = dayReader(timeZone);
  const timeFormats = new Map<string, Intl.DateTimeFormat>();
  const formatTimeIn = (zone: string) => {
    const known = timeFormats.get(zone);
    if (known) return known;

    const format = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: zone,
    });
    timeFormats.set(zone, format);

    return format;
  };
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
  const priceOf = ({ start, end, currency, hourlyRate }: CraftsmanBooking) => {
    const worked = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
    const rate = Number(hourlyRate);
    const format = moneyIn(currency);
    const label = price({
      hours: hours.format(worked),
      rate: format.format(rate),
      total: format.format(rate * worked),
    });

    return label;
  };
  const onSelectedDay = bookings.filter(({ start }) => dayOf(new Date(start)) === day);
  const model: BookingCalendarModel = {
    calendar: prepareScheduleCalendar({
      date: day,
      today,
      markedDates: [...new Set(bookings.map(({ start }) => dayOf(new Date(start))))],
    }),
    emptyMessage: onSelectedDay.length === 0 ? text.empty : null,
    cards: onSelectedDay.map((booking) => {
      const { id, start, end, customerName, location, status } = booking;
      const card: BookingCardModel = {
        id,
        timeLabel: formatJobHours({ start, end, format: formatTimeIn(location.timeZone) }),
        customerName,
        placeLabel: [cityName(location.cityId), location.districtName].filter(Boolean).join(" · "),
        priceLabel: priceOf(booking),
        statusLabel: statusLabel(status),
        statusVariant: statusVariants[status],
        cancellable: cancellableStatuses.includes(status),
        actions: offer({ status, end }),
      };

      return card;
    }),
  };

  return model;
};
