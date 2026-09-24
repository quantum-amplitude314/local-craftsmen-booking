import type { Booking, BookingTransition, CityId, OwnBooking } from "@local-craftsmen/contracts";

export type OwnBookingCardModel = {
  id: string;
  whenLabel: string;
  partyName: string;
  placeLabel: string;
  statusLabel: string;
  statusVariant: "default" | "secondary" | "outline";
  actions: { transition: BookingTransition; label: string; pendingLabel: string }[];
};

export type OwnBookingsModel = {
  upcoming: OwnBookingCardModel[];
  past: OwnBookingCardModel[];
  emptyMessage: string | null;
};

export type OwnBookingsText = {
  cityName: (id: CityId) => string;
  status: (status: Booking["status"]) => string;
  cancel: string;
  cancelling: string;
  empty: string;
};

const statusVariants: Record<Booking["status"], OwnBookingCardModel["statusVariant"]> = {
  pending: "outline",
  confirmed: "default",
  completed: "secondary",
  cancelled: "secondary",
};
/** A customer only ever calls a job off, and only while it still lies ahead. */
const cancellableStatuses: Booking["status"][] = ["pending", "confirmed"];

/**
 * One customer's jobs, each read on the clock of the city it happens in and split by whether the
 * work is still ahead of them.
 */
export const prepareOwnBookings = ({
  bookings,
  now,
  locale,
  text,
}: {
  bookings: OwnBooking[];
  now: string;
  locale: string;
  text: OwnBookingsText;
}) => {
  const { cityName, status: statusLabel, cancel, cancelling } = text;
  const thisMoment = new Date(now);
  const clocks = new Map<string, { day: Intl.DateTimeFormat; time: Intl.DateTimeFormat }>();
  const clockIn = (timeZone: string) => {
    const known = clocks.get(timeZone);
    if (known) return known;

    const time = { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone } as const;
    const clock = {
      day: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone,
      }),
      time: new Intl.DateTimeFormat(locale, time),
    };
    clocks.set(timeZone, clock);

    return clock;
  };
  const toCard = ({ id, start, end, partyName, location, status }: OwnBooking) => {
    const { day, time } = clockIn(location.timeZone);
    const ahead = new Date(end) > thisMoment;
    const card: OwnBookingCardModel = {
      id,
      whenLabel: `${day.format(new Date(start))}, ${time.format(new Date(start))} – ${time.format(new Date(end))}`,
      partyName,
      placeLabel: [cityName(location.cityId), location.districtName].filter(Boolean).join(" · "),
      statusLabel: statusLabel(status),
      statusVariant: statusVariants[status],
      actions:
        ahead && cancellableStatuses.includes(status)
          ? [{ transition: "cancel" as const, label: cancel, pendingLabel: cancelling }]
          : [],
    };

    return card;
  };
  const ahead = bookings.filter(({ end }) => new Date(end) > thisMoment);
  const behind = bookings.filter(({ end }) => new Date(end) <= thisMoment);
  const model: OwnBookingsModel = {
    upcoming: ahead.map(toCard),
    past: behind.toReversed().map(toCard),
    emptyMessage: bookings.length === 0 ? text.empty : null,
  };

  return model;
};
