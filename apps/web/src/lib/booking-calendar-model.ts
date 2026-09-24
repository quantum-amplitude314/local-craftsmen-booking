import type {
  Booking,
  BookingTransition,
  CityId,
  CraftsmanBooking,
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
  statusLabel: string;
  statusVariant: "default" | "secondary" | "outline";
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
  empty: string;
};

const statusVariants: Record<Booking["status"], BookingCardModel["statusVariant"]> = {
  pending: "outline",
  confirmed: "default",
  completed: "secondary",
  cancelled: "secondary",
};

/** What the craftsman may do with a job as it stands; finished work is only ever reported late. */
const offeredTransitions: Record<Booking["status"], BookingTransition[]> = {
  pending: ["confirm", "cancel"],
  confirmed: ["complete", "cancel"],
  completed: [],
  cancelled: [],
};
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
  const { cityName, status: statusLabel, action, actionPending } = text;
  const thisMoment = new Date(now);
  const offer = ({ status, end }: { status: Booking["status"]; end: string }) => {
    const done = new Date(end) <= thisMoment;
    const actions: BookingActionModel[] = offeredTransitions[status]
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
  const onSelectedDay = bookings.filter(({ start }) => dayOf(new Date(start)) === day);
  const model: BookingCalendarModel = {
    calendar: prepareScheduleCalendar({
      date: day,
      today,
      markedDates: [...new Set(bookings.map(({ start }) => dayOf(new Date(start))))],
    }),
    emptyMessage: onSelectedDay.length === 0 ? text.empty : null,
    cards: onSelectedDay.map(({ id, start, end, customerName, location, status }) => ({
      id,
      timeLabel: formatJobHours({ start, end, format: formatTimeIn(location.timeZone) }),
      customerName,
      placeLabel: [cityName(location.cityId), location.districtName].filter(Boolean).join(" · "),
      statusLabel: statusLabel(status),
      statusVariant: statusVariants[status],
      actions: offer({ status, end }),
    })),
  };

  return model;
};
