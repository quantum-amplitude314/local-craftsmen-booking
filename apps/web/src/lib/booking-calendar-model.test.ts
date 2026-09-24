import { describe, expect, test } from "bun:test";
import type { CraftsmanBooking } from "@local-craftsmen/contracts";
import { prepareBookingCalendar } from "@/lib/booking-calendar-model";

const job = ({
  id,
  start,
  end,
  cityId = "prague",
  timeZone = "Europe/Prague",
}: {
  id: string;
  start: string;
  end: string;
  cityId?: CraftsmanBooking["location"]["cityId"];
  timeZone?: string;
}): CraftsmanBooking => ({
  id,
  customerId: "seed-customer-1",
  craftsmanId: "seed-painter-1",
  craft: "painter",
  customerName: "Dan Customer",
  status: "confirmed",
  currency: "EUR",
  hourlyRate: "10.00",
  start,
  end,
  location: {
    cityId,
    districtId: "prague-liben",
    cityName: "Prague",
    districtName: "Libeň",
    timeZone,
  },
});

const text = {
  cityName: (id: string) => (id === "prague" ? "Prague" : "Pardubice"),
  status: (status: string) => status,
  action: (transition: string) => transition,
  actionPending: (transition: string) => `${transition}…`,
  empty: "No jobs on this day.",
};

const prepare = ({
  bookings,
  day,
  timeZone,
  now = "2040-06-30T12:00:00.000Z",
}: {
  bookings: CraftsmanBooking[];
  day: string;
  timeZone: string;
  now?: string;
}) =>
  prepareBookingCalendar({
    bookings,
    day,
    today: "2040-07-01",
    now,
    timeZone,
    locale: "en-GB",
    text,
  });

describe("prepareBookingCalendar", () => {
  test("puts a job on the day the reader would call it", () => {
    const lateEvening = job({
      id: "late",
      start: "2040-07-01T23:30:00.000Z",
      end: "2040-07-02T00:30:00.000Z",
    });

    const inPrague = prepare({
      bookings: [lateEvening],
      day: "2040-07-02",
      timeZone: "Europe/Prague",
    });
    expect(inPrague.calendar.markedDays).toEqual([new Date("2040-07-02T00:00:00.000Z")]);
    expect(inPrague.cards).toHaveLength(1);
    expect(inPrague.emptyMessage).toBeNull();

    const inNewYork = prepare({
      bookings: [lateEvening],
      day: "2040-07-02",
      timeZone: "America/New_York",
    });
    expect(inNewYork.calendar.markedDays).toEqual([new Date("2040-07-01T00:00:00.000Z")]);
    expect(inNewYork.cards).toEqual([]);
    expect(inNewYork.emptyMessage).toBe("No jobs on this day.");
  });

  test("keeps each card on the clock of the city the job is in", () => {
    const { cards } = prepare({
      bookings: [
        job({ id: "home", start: "2040-07-01T06:00:00.000Z", end: "2040-07-01T08:00:00.000Z" }),
        job({
          id: "abroad",
          start: "2040-07-01T13:00:00.000Z",
          end: "2040-07-01T14:00:00.000Z",
          cityId: "pardubice",
          timeZone: "America/New_York",
        }),
      ],
      day: "2040-07-01",
      timeZone: "Europe/Prague",
    });

    expect(cards.map(({ timeLabel }) => timeLabel)).toEqual(["08:00 – 10:00", "09:00 – 10:00"]);
    expect(cards[1]?.placeLabel).toBe("Pardubice · Libeň");
  });

  test("offers only what the job's status and its end allow", () => {
    const transitionsOffered = ({
      status,
      now,
    }: {
      status: CraftsmanBooking["status"];
      now: string;
    }) => {
      const { cards } = prepare({
        bookings: [
          {
            ...job({
              id: "one",
              start: "2040-07-01T06:00:00.000Z",
              end: "2040-07-01T08:00:00.000Z",
            }),
            status,
          },
        ],
        day: "2040-07-01",
        timeZone: "Europe/Prague",
        now,
      });

      return cards[0]?.actions.map(({ transition }) => transition);
    };
    const beforeWork = "2040-07-01T05:00:00.000Z";
    const afterWork = "2040-07-01T09:00:00.000Z";

    expect(transitionsOffered({ status: "pending", now: beforeWork })).toEqual([
      "confirm",
      "cancel",
    ]);
    // Work that has not happened yet cannot be reported as done.
    expect(transitionsOffered({ status: "confirmed", now: beforeWork })).toEqual(["cancel"]);
    expect(transitionsOffered({ status: "confirmed", now: afterWork })).toEqual([
      "complete",
      "cancel",
    ]);
    expect(transitionsOffered({ status: "completed", now: afterWork })).toEqual([]);
    expect(transitionsOffered({ status: "cancelled", now: afterWork })).toEqual([]);
  });
});
