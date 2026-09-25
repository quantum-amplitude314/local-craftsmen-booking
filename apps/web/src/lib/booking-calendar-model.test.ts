import { describe, expect, test } from "bun:test";
import type { OwnBooking } from "@local-craftsmen/contracts";
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
  cityId?: OwnBooking["location"]["cityId"];
  timeZone?: string;
}): OwnBooking => ({
  id,
  customerId: "seed-customer-1",
  craftsmanId: "seed-painter-1",
  craft: "painter",
  partyName: "Dan Customer",
  actions: [],
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
  price: ({ hours, rate, total }: { hours: string; rate: string; total: string }) =>
    `${hours} · ${rate} · ${total}`,
  empty: "No jobs on this day.",
};

const prepare = ({
  bookings,
  day,
  timeZone,
}: {
  bookings: OwnBooking[];
  day: string;
  timeZone: string;
}) =>
  prepareBookingCalendar({
    bookings,
    day,
    today: "2040-07-01",
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

  test("offers what the API allows, with cancelling apart from the steps forward", () => {
    const offered = (actions: OwnBooking["actions"]) => {
      const { cards } = prepare({
        bookings: [
          {
            ...job({
              id: "one",
              start: "2040-07-01T06:00:00.000Z",
              end: "2040-07-01T08:00:00.000Z",
            }),
            actions,
          },
        ],
        day: "2040-07-01",
        timeZone: "Europe/Prague",
      });
      const [card] = cards;

      return {
        forward: card?.actions.map(({ transition }) => transition),
        cancellable: card?.cancellable,
      };
    };

    expect(offered(["confirm", "cancel"])).toEqual({ forward: ["confirm"], cancellable: true });
    expect(offered(["cancel", "complete"])).toEqual({ forward: ["complete"], cancellable: true });
    expect(offered(["cancel"])).toEqual({ forward: [], cancellable: true });
    expect(offered([])).toEqual({ forward: [], cancellable: false });
  });
});
