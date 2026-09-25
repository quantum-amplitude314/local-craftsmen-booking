import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createBookingsService,
  createCraftsmenService,
  createLocationsService,
  createSlotsService,
} from "@local-craftsmen/application";
import {
  type Area,
  availabilityDaySchema,
  bookingSchema,
  type CraftsmanRate,
  craftsmanProfileSchema,
  ownBookingSchema,
  sessionUserSchema,
  slotSchema,
} from "@local-craftsmen/contracts";
import {
  availability,
  availabilityArea,
  booking,
  bookingHistory,
  city,
  type Db,
} from "@local-craftsmen/db";
import { startTestDb } from "@local-craftsmen/db/test-db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createApp } from "../src/app.ts";
import { createAuth } from "../src/auth.ts";
import { apiEnvSchema } from "../src/env.ts";

const baseUrl = "http://localhost:3001";
const webOrigin = "http://localhost:3000";
const password = "correct-horse-battery";
const testEnvSchema = apiEnvSchema
  .pick({ TURNSTILE_SECRET_KEY: true })
  .extend({ TURNSTILE_TEST_TOKEN: z.string().min(1) });
const { TURNSTILE_SECRET_KEY: turnstileSecretKey, TURNSTILE_TEST_TOKEN: turnstileToken } =
  testEnvSchema.parse(process.env);

let app: ReturnType<typeof createApp<Record<string, never>>>;
let stopDb: () => Promise<void>;
let database: Db;

const call = async ({
  path,
  method = "GET",
  body,
  cookie,
  captchaToken = turnstileToken,
}: {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown> | undefined;
  cookie?: string;
  captchaToken?: string;
}) => {
  const headers = new Headers({ Origin: webOrigin });
  if (body) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);
  if (captchaToken) headers.set("x-captcha-response", captchaToken);

  const request = body
    ? new Request(`${baseUrl}${path}`, { method, headers, body: JSON.stringify(body) })
    : new Request(`${baseUrl}${path}`, { method, headers });
  const response = await app.fetch(request);

  return response;
};

const readSessionCookie = ({ response }: { response: Response }) => {
  const cookie = response.headers
    .getSetCookie()
    .map((header) => header.split(";")[0])
    .join("; ");

  return cookie;
};

const registerUser = async ({ role }: { role: "customer" | "craftsman" }) => {
  const email = `${role}-${crypto.randomUUID()}@example.com`;
  const response = await call({
    path: "/auth/sign-up/email",
    method: "POST",
    body: { name: `Test ${role}`, email, password, role },
  });

  const account = { email, response, cookie: readSessionCookie({ response }) };

  return account;
};

beforeAll(async () => {
  const { db, stop } = await startTestDb();
  database = db;
  stopDb = stop;

  const auth = createAuth({
    db,
    secret: "test-secret-with-at-least-32-characters",
    baseURL: baseUrl,
    webOrigin,
    turnstileSecretKey,
  });
  const craftsmen = createCraftsmenService({ db });

  app = createApp<Record<string, never>>({
    createApiContext: () => ({
      craftsmen,
      slots: createSlotsService({ db }),
      bookings: createBookingsService({ db }),
      locations: createLocationsService({ db }),
      getAuth: () => auth,
    }),
  });
});

describe("location-aware slots and booking allocation", () => {
  let craftsmanCookie: string;
  let customerCookie: string;
  let otherCraftsmanCookie: string;
  let otherCustomerCookie: string;
  let craftsmanId: string;
  let customerId: string;
  let day = 0;

  const createSlot = async (
    areas: Area[] = [
      { cityId: "prague", districtId: "prague-holesovice" },
      { cityId: "prague", districtId: "prague-liben" },
    ],
  ) => {
    day += 1;
    const response = await call({
      path: "/me/availability",
      method: "POST",
      cookie: craftsmanCookie,
      body: {
        start: new Date(Date.UTC(2040, 0, day, 8)).toISOString(),
        end: new Date(Date.UTC(2040, 0, day, 12)).toISOString(),
        areas,
        craftsmanId: "seed-painter-1",
      },
    });
    expect(response.status).toBe(200);
    const slot = slotSchema.parse(await response.json());
    expect(slot.craftsmanId).toBe(craftsmanId);

    return slot;
  };

  beforeAll(async () => {
    const craftsman = await registerUser({ role: "craftsman" });
    const customer = await registerUser({ role: "customer" });
    const otherCraftsman = await registerUser({ role: "craftsman" });
    const otherCustomer = await registerUser({ role: "customer" });
    craftsmanCookie = craftsman.cookie;
    customerCookie = customer.cookie;
    otherCraftsmanCookie = otherCraftsman.cookie;
    otherCustomerCookie = otherCustomer.cookie;
    const profile = await call({
      path: "/me/profile",
      method: "PUT",
      cookie: craftsmanCookie,
      body: {
        ...profileInput,
        baseArea: { cityId: "pilsen", districtId: "pilsen-doubravka" },
      },
    });
    expect(profile.status).toBe(200);
    craftsmanId = craftsmanProfileSchema.parse(await profile.json()).id;
    const me = await call({ path: "/me", cookie: customerCookie });
    customerId = sessionUserSchema.parse(await me.json()).id;
  });

  test("serves seeded districts grouped under their canonical cities", async () => {
    const response = await call({ path: "/locations" });
    expect(response.status).toBe(200);
    const locations = await response.json();
    expect(locations).toHaveLength(3);
    expect(locations).toContainEqual(
      expect.objectContaining({
        id: "prague",
        districts: expect.arrayContaining([
          { id: "prague-holesovice", name: "Holešovice" },
          { id: "prague-liben", name: "Libeň" },
        ]),
      }),
    );
  });

  test("guards availability and booking routes by session and role", async () => {
    for (const path of ["/me/availability", "/me/availability/"]) {
      expect((await call({ path, method: "POST", body: {} })).status).toBe(401);
      expect((await call({ path, method: "POST", body: {}, cookie: customerCookie })).status).toBe(
        403,
      );
    }
    expect((await call({ path: "/me/availability/day" })).status).toBe(401);
    expect((await call({ path: "/me/availability/day", cookie: customerCookie })).status).toBe(403);
    expect((await call({ path: "/me/bookings/range" })).status).toBe(401);
    expect((await call({ path: "/slots" })).status).toBe(401);
    expect((await call({ path: "/bookings", method: "POST", body: {} })).status).toBe(401);
    expect(
      (await call({ path: "/bookings", method: "POST", body: {}, cookie: craftsmanCookie })).status,
    ).toBe(403);
  });

  test("rejects cross-city profile districts without changing the profile", async () => {
    const response = await call({
      path: "/me/profile",
      method: "PUT",
      cookie: craftsmanCookie,
      body: {
        ...profileInput,
        baseArea: { cityId: "prague", districtId: "pilsen-doubravka" },
      },
    });
    expect(response.status).toBe(400);
    const unchanged = await call({ path: "/me/profile", cookie: craftsmanCookie });
    await expect(unchanged.json()).resolves.toMatchObject({
      baseArea: { cityId: "pilsen", districtId: "pilsen-doubravka" },
    });
  });

  test("matches slot coverage rather than the profile's base and combines location with time", async () => {
    const slot = await createSlot();
    for (const districtId of ["prague-holesovice", "prague-liben"]) {
      const response = await call({
        path: `/slots?cityId=prague&districtId=${districtId}&start=${slot.start}&end=${slot.end}`,
        cookie: customerCookie,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toContainEqual(expect.objectContaining({ id: slot.id }));
    }
    const wrongDistrict = await call({
      path: "/slots?cityId=prague&districtId=prague-dolni-chabry",
      cookie: customerCookie,
    });
    expect(await wrongDistrict.json()).not.toContainEqual(expect.objectContaining({ id: slot.id }));
    const listing = await call({
      path: `/slots?cityId=prague&start=${slot.start}&end=${slot.end}`,
      cookie: customerCookie,
    });
    expect(await listing.json()).toContainEqual(
      expect.objectContaining({
        id: slot.id,
        craftsman: {
          id: craftsmanId,
          name: expect.any(String),
          craft: profileInput.craft,
          rates: [
            { currency: "CZK", hourlyRate: "250.00" },
            { currency: "EUR", hourlyRate: "10.00" },
          ],
        },
      }),
    );
    const wrongCity = await call({
      path: `/slots?cityId=pilsen&start=${slot.start}&end=${slot.end}`,
      cookie: customerCookie,
    });
    expect(await wrongCity.json()).not.toContainEqual(expect.objectContaining({ id: slot.id }));
    const outsideTime = await call({
      path: `/slots?cityId=prague&start=${slot.start}&end=2041-01-01T00:00:00Z`,
      cookie: customerCookie,
    });
    expect(await outsideTime.json()).not.toContainEqual(expect.objectContaining({ id: slot.id }));
  });

  test("matches a date on the slot city's clock", async () => {
    const response = await call({
      path: "/me/availability",
      method: "POST",
      cookie: craftsmanCookie,
      body: {
        start: "2040-02-01T23:00:00.000Z",
        end: "2040-02-02T00:00:00.000Z",
        areas: [{ cityId: "prague", districtId: "prague-liben" }],
      },
    });
    expect(response.status).toBe(200);
    const slot = slotSchema.parse(await response.json());
    const localDay = await call({ path: "/slots?date=2040-02-02", cookie: customerCookie });
    const utcDay = await call({ path: "/slots?date=2040-02-01", cookie: customerCookie });

    expect(await localDay.json()).toContainEqual(expect.objectContaining({ id: slot.id }));
    expect(await utcDay.json()).not.toContainEqual(expect.objectContaining({ id: slot.id }));
  });

  test("supports city-wide coverage with a nullable district, without accepting mismatched district filters", async () => {
    const slot = await createSlot([{ cityId: "pardubice", districtId: null }]);
    const city = await call({ path: "/slots?cityId=pardubice", cookie: customerCookie });
    expect(await city.json()).toContainEqual(expect.objectContaining({ id: slot.id }));
    const district = await call({
      path: "/slots?cityId=pardubice&districtId=pardubice-polabiny",
      cookie: customerCookie,
    });
    expect(await district.json()).toContainEqual(expect.objectContaining({ id: slot.id }));
    const invalid = await call({
      path: "/slots?cityId=pardubice&districtId=prague-liben",
      cookie: customerCookie,
    });
    await expect(invalid.json()).resolves.toEqual([]);
  });

  test("rolls back invalid coverage and rejects overlapping slots", async () => {
    const slot = await createSlot();
    const duplicate = await call({
      path: "/me/availability",
      method: "POST",
      cookie: craftsmanCookie,
      body: slot,
    });
    expect(duplicate.status).toBe(409);
    const start = "2042-01-01T08:00:00Z";
    const end = "2042-01-01T12:00:00Z";
    const invalid = await call({
      path: "/me/availability",
      method: "POST",
      cookie: craftsmanCookie,
      body: { start, end, areas: [{ cityId: "prague", districtId: "pilsen-doubravka" }] },
    });
    expect(invalid.status).toBe(400);
    // A slot is worked in one city, because its hours are read in that city's zone.
    const twoCities = await call({
      path: "/me/availability",
      method: "POST",
      cookie: craftsmanCookie,
      body: {
        start,
        end,
        areas: [
          { cityId: "prague", districtId: null },
          { cityId: "pilsen", districtId: null },
        ],
      },
    });
    expect(twoCities.status).toBe(400);
    const valid = await call({
      path: "/me/availability",
      method: "POST",
      cookie: craftsmanCookie,
      body: { start, end, areas: [{ cityId: "prague", districtId: null }] },
    });
    expect(valid.status).toBe(200);
  });

  test("rejects slots off the grid, or outside 1 to 4 hours", async () => {
    const areas = [{ cityId: "prague", districtId: null }];
    for (const [start, end] of [
      ["2043-01-01T08:10:00Z", "2043-01-01T09:10:00Z"],
      ["2043-01-01T08:00:00Z", "2043-01-01T08:45:00Z"],
      ["2043-01-01T08:00:00Z", "2043-01-01T12:15:00Z"],
    ]) {
      const response = await call({
        path: "/me/availability",
        method: "POST",
        cookie: craftsmanCookie,
        body: { start, end, areas },
      });
      expect(response.status).toBe(400);
    }
  });

  test("keeps a 15-minute break after every slot and booking", async () => {
    const { end, areas } = await createSlot();
    const minutesAfterEnd = (minutes: number) =>
      new Date(Date.parse(end) + minutes * 60_000).toISOString();
    const createHourAfterEnd = (minutes: number) =>
      call({
        path: "/me/availability",
        method: "POST",
        cookie: craftsmanCookie,
        body: { start: minutesAfterEnd(minutes), end: minutesAfterEnd(minutes + 60), areas },
      });
    expect((await createHourAfterEnd(0)).status).toBe(409);
    const next = await createHourAfterEnd(15);
    expect(next.status).toBe(200);
    const nextSlot = slotSchema.parse(await next.json());
    expect(nextSlot.end).toBe(minutesAfterEnd(75));

    const booked = await call({
      path: "/bookings",
      method: "POST",
      cookie: customerCookie,
      body: {
        slotId: nextSlot.id,
        start: nextSlot.start,
        end: nextSlot.end,
        location: { cityId: "prague", districtId: "prague-liben" },
        currency: "EUR",
      },
    });
    expect(booked.status).toBe(200);
    expect((await createHourAfterEnd(75)).status).toBe(409);
    expect((await createHourAfterEnd(90)).status).toBe(200);
  });

  test("describes a Prague day in quarter-hours: taken, and breaks after and before a slot", async () => {
    const slot = await createSlot();
    const { id, start, end } = slot;
    const date = start.slice(0, 10);
    const shifted = (iso: string, minutes: number) =>
      new Date(Date.parse(iso) + minutes * 60_000).toISOString();
    const response = await call({
      path: `/me/availability/day?date=${date}`,
      cookie: craftsmanCookie,
    });
    expect(response.status).toBe(200);
    const schedule = availabilityDaySchema.parse(await response.json());
    const { quarters, nextDayQuarters } = schedule;
    const stateAt = (iso: string) => quarters.find((quarter) => quarter.start === iso)?.state;
    const dayStart = shifted(`${date}T00:00:00.000Z`, -60);
    expect(schedule.timeZone).toEqual({ id: "Europe/Prague", cityId: "pilsen" });
    expect(schedule.date).toBe(date);
    expect(quarters).toHaveLength(96);
    expect(quarters[0]).toEqual({ start: dayStart, end: shifted(dayStart, 15), state: "free" });
    expect(stateAt(shifted(start, -30))).toBe("free");
    expect(stateAt(shifted(start, -15))).toBe("break");
    expect(stateAt(start)).toBe("occupied");
    expect(stateAt(shifted(end, -15))).toBe("occupied");
    expect(stateAt(end)).toBe("break");
    expect(stateAt(shifted(end, 15))).toBe("free");
    expect(nextDayQuarters).toHaveLength(16);
    expect(nextDayQuarters[0]?.start).toBe(shifted(dayStart, 24 * 60));
    expect(schedule.slots.map(({ id }) => id)).toEqual([id]);
    expect(schedule.slotDates).toContain(date);
  });

  test("follows daylight saving and defaults to today", async () => {
    const quartersOn = async (date: string) => {
      const response = await call({
        path: `/me/availability/day?date=${date}`,
        cookie: craftsmanCookie,
      });
      const { quarters } = availabilityDaySchema.parse(await response.json());

      return quarters.length;
    };
    expect(await quartersOn("2040-03-25")).toBe(92);
    expect(await quartersOn("2040-10-28")).toBe(100);

    const today = await call({ path: "/me/availability/day", cookie: craftsmanCookie });
    const schedule = availabilityDaySchema.parse(await today.json());
    expect(schedule.date).toBe(schedule.today);
    expect(schedule.quarters.some(({ state }) => state === "past")).toBe(true);

    const invalid = await call({
      path: "/me/availability/day?date=2040-13-01",
      cookie: craftsmanCookie,
    });
    expect(invalid.status).toBe(400);
  });

  test("plans the day in the requested city's zone instead of the base city's", async () => {
    const readDay = async (query: string) => {
      const response = await call({
        path: `/me/availability/day?${query}`,
        cookie: craftsmanCookie,
      });
      expect(response.status).toBe(200);
      const schedule = availabilityDaySchema.parse(await response.json());

      return schedule;
    };
    await database.update(city).set({ timeZone: "America/New_York" }).where(eq(city.id, "prague"));
    try {
      const requested = await readDay("date=2040-07-02&cityId=prague");
      expect(requested.timeZone).toEqual({ id: "America/New_York", cityId: "prague" });
      // Midnight in New York is 04:00 UTC that July day, so the day starts four hours later.
      expect(requested.quarters[0]?.start).toBe("2040-07-02T04:00:00.000Z");
    } finally {
      await database.update(city).set({ timeZone: "Europe/Prague" }).where(eq(city.id, "prague"));
    }

    const base = await readDay("date=2040-07-02");
    expect(base.timeZone).toEqual({ id: "Europe/Prague", cityId: "pilsen" });
    expect(base.quarters[0]?.start).toBe("2040-07-01T22:00:00.000Z");

    const unknown = await call({
      path: "/me/availability/day?cityId=atlantis",
      cookie: craftsmanCookie,
    });
    expect(unknown.status).toBe(400);
  });

  test("restricts slot deletion to the owner and cascades coverage deletion", async () => {
    const { id } = await createSlot();
    expect(
      (await call({ path: `/me/availability/${id}`, method: "DELETE", cookie: customerCookie }))
        .status,
    ).toBe(403);
    expect(
      (
        await call({
          path: `/me/availability/${id}`,
          method: "DELETE",
          cookie: otherCraftsmanCookie,
        })
      ).status,
    ).toBe(404);
    expect(
      (await call({ path: `/me/availability/${id}`, method: "DELETE", cookie: craftsmanCookie }))
        .status,
    ).toBe(200);
    expect(
      await database.select().from(availabilityArea).where(eq(availabilityArea.availabilityId, id)),
    ).toHaveLength(0);
  });

  test("rejects uncovered locations, unavailable currencies, and out-of-slot times without consuming the slot", async () => {
    const slot = await createSlot();
    const input = {
      slotId: slot.id,
      start: slot.start,
      end: slot.end,
      location: { cityId: "prague", districtId: "prague-liben" },
      currency: "EUR",
    };
    for (const body of [
      { ...input, location: { cityId: "prague", districtId: "prague-dolni-chabry" } },
      { ...input, location: { cityId: "prague", districtId: null } },
      { ...input, currency: "USD" },
      { ...input, end: "2041-01-01T00:00:00Z" },
    ]) {
      const response = await call({
        path: "/bookings",
        method: "POST",
        cookie: customerCookie,
        body,
      });
      expect(response.status).toBe(400);
    }
    expect(
      await database.select().from(availability).where(eq(availability.id, slot.id)),
    ).toHaveLength(1);
    expect(
      await database
        .select()
        .from(availabilityArea)
        .where(eq(availabilityArea.availabilityId, slot.id)),
    ).toHaveLength(2);
  });

  test("booking part of a slot deletes it completely and snapshots server-selected price and history", async () => {
    const slot = await createSlot();
    const start = new Date(new Date(slot.start).getTime() + 3_600_000).toISOString();
    const end = new Date(new Date(start).getTime() + 3_600_000).toISOString();
    const response = await call({
      path: "/bookings",
      method: "POST",
      cookie: customerCookie,
      body: {
        slotId: slot.id,
        start,
        end,
        location: { cityId: "prague", districtId: "prague-liben" },
        currency: "EUR",
        hourlyRate: "1",
        customerId: "seed-customer-1",
        craftsmanId: "seed-painter-1",
      },
    });
    expect(response.status).toBe(200);
    const booked = bookingSchema.parse(await response.json());
    expect(booked).toMatchObject({
      customerId,
      craftsmanId,
      hourlyRate: "10.00",
      start,
      end,
      status: "pending",
      location: {
        cityId: "prague",
        cityName: "Praha",
        districtId: "prague-liben",
        districtName: "Libeň",
        timeZone: "Europe/Prague",
      },
    });
    expect(
      await database.select().from(availability).where(eq(availability.id, slot.id)),
    ).toHaveLength(0);
    expect(
      await database
        .select()
        .from(availabilityArea)
        .where(eq(availabilityArea.availabilityId, slot.id)),
    ).toHaveLength(0);
    const remaining = await call({
      path: `/slots?cityId=prague&start=${slot.start}&end=${start}`,
      cookie: customerCookie,
    });
    expect(await remaining.json()).not.toContainEqual(expect.objectContaining({ craftsmanId }));
    const history = await database
      .select()
      .from(bookingHistory)
      .where(eq(bookingHistory.bookingId, booked.id));
    expect(history).toHaveLength(1);
    expect(history[0]?.snapshot).toMatchObject({
      booking: booked,
      slot: {
        id: slot.id,
        start: slot.start,
        end: slot.end,
        areas: expect.arrayContaining([expect.objectContaining({ districtName: "Libeň" })]),
      },
    });
    // Each side of a job is shown the other side's name.
    const own = await call({ path: "/me/bookings", cookie: customerCookie });
    expect(ownBookingSchema.array().parse(await own.json())).toContainEqual({
      ...booked,
      partyName: "Test craftsman",
      actions: ["cancel"],
    });
    const provider = await call({ path: "/me/bookings", cookie: craftsmanCookie });
    expect(ownBookingSchema.array().parse(await provider.json())).toContainEqual({
      ...booked,
      partyName: "Test customer",
      actions: ["confirm", "cancel"],
    });
    const unrelated = await call({ path: "/me/bookings", cookie: otherCustomerCookie });
    expect(
      ownBookingSchema
        .array()
        .parse(await unrelated.json())
        .map(({ id }) => id),
    ).not.toContain(booked.id);
    const overlap = await call({
      path: "/me/availability",
      method: "POST",
      cookie: craftsmanCookie,
      body: { start, end, areas: slot.areas },
    });
    expect(overlap.status).toBe(409);
    await database.delete(booking).where(eq(booking.id, booked.id));
    expect(
      await database.select().from(bookingHistory).where(eq(bookingHistory.bookingId, booked.id)),
    ).toEqual(history);
  });

  test("lists either party's active jobs overlapping a window, in chronological order", async () => {
    const book = async () => {
      const { id: slotId, start, end } = await createSlot();
      const response = await call({
        path: "/bookings",
        method: "POST",
        cookie: customerCookie,
        body: {
          slotId,
          start,
          end,
          location: { cityId: "prague", districtId: "prague-liben" },
          currency: "EUR",
        },
      });
      expect(response.status).toBe(200);
      const booked = bookingSchema.parse(await response.json());

      return booked;
    };
    const kept = await book();
    const cancelled = await book();
    const completed = await book();
    const expired = await book();
    const ongoing = await book();
    await database.update(booking).set({ status: "cancelled" }).where(eq(booking.id, cancelled.id));
    await database.update(booking).set({ status: "completed" }).where(eq(booking.id, completed.id));
    const now = Date.now();
    await database
      .update(booking)
      .set({
        status: "confirmed",
        range: { start: new Date(now - 7_200_000), end: new Date(now - 3_600_000) },
      })
      .where(eq(booking.id, expired.id));
    await database
      .update(booking)
      .set({
        status: "confirmed",
        range: { start: new Date(now - 900_000), end: new Date(now + 3_600_000) },
      })
      .where(eq(booking.id, ongoing.id));

    const inWindow = async ({
      start,
      end,
      cookie,
    }: {
      start: string;
      end: string;
      cookie: string;
    }) => {
      const response = await call({
        path: `/me/bookings/range?start=${start}&end=${end}`,
        cookie,
      });
      expect(response.status).toBe(200);
      const jobs = ownBookingSchema.array().parse(await response.json());

      return jobs;
    };
    const january = { start: "2039-12-31T00:00:00Z", end: "2040-02-01T00:00:00Z" };
    const jobs = await inWindow({ ...january, cookie: craftsmanCookie });
    expect(jobs).toContainEqual({
      ...kept,
      partyName: "Test customer",
      actions: ["confirm", "cancel"],
    });
    // The customer's window holds the same job under the craftsman's name; an outsider's holds none.
    expect(await inWindow({ ...january, cookie: customerCookie })).toContainEqual({
      ...kept,
      partyName: "Test craftsman",
      actions: ["cancel"],
    });
    const outsider = await inWindow({ ...january, cookie: otherCustomerCookie });
    expect(outsider.map(({ id }) => id)).not.toContain(kept.id);
    const ids = jobs.map(({ id }) => id);
    expect(ids).not.toContain(cancelled.id);
    expect(ids).not.toContain(completed.id);
    // Both were moved to this week, so a January window must not reach them.
    expect(ids).not.toContain(ongoing.id);
    expect(ids).not.toContain(expired.id);
    const starts = jobs.map(({ start }) => start);
    expect(starts).toEqual(starts.toSorted());

    // A window looks backwards too: a job that has ended still belongs to the day it happened on.
    const thisWeek = {
      start: new Date(now - 7 * 86_400_000).toISOString(),
      end: new Date(now + 7 * 86_400_000).toISOString(),
    };
    const week = await inWindow({ ...thisWeek, cookie: craftsmanCookie });
    const weekIds = week.map(({ id }) => id);
    expect(weekIds).toContain(ongoing.id);
    expect(weekIds).toContain(expired.id);
    // Each job says what its reader may do now; work is reported done only once it has ended.
    const actionsOf = ({ jobs, id }: { jobs: typeof week; id: string }) =>
      jobs.find((job) => job.id === id)?.actions;
    expect(actionsOf({ jobs: week, id: ongoing.id })).toEqual(["cancel"]);
    expect(actionsOf({ jobs: week, id: expired.id })).toEqual(["cancel", "complete"]);
    const customerWeek = await inWindow({ ...thisWeek, cookie: customerCookie });
    expect(actionsOf({ jobs: customerWeek, id: expired.id })).toEqual(["cancel"]);

    expect(await inWindow({ ...january, cookie: otherCraftsmanCookie })).toEqual([]);
    const tooWide = await call({
      path: "/me/bookings/range?start=2040-01-01T00:00:00Z&end=2040-06-01T00:00:00Z",
      cookie: craftsmanCookie,
    });
    expect(tooWide.status).toBe(400);
  });

  test("moves a job through its lifecycle, and only for the party entitled to ask", async () => {
    const book = async () => {
      const { id: slotId, start, end } = await createSlot();
      const response = await call({
        path: "/bookings",
        method: "POST",
        cookie: customerCookie,
        body: {
          slotId,
          start,
          end,
          location: { cityId: "prague", districtId: "prague-liben" },
          currency: "EUR",
        },
      });
      expect(response.status).toBe(200);
      const booked = bookingSchema.parse(await response.json());

      return booked;
    };
    const ask = async ({
      id,
      transition,
      cookie,
    }: {
      id: string;
      transition: string;
      cookie: string;
    }) => await call({ path: `/me/bookings/${id}/${transition}`, method: "POST", cookie });

    const job = await book();
    expect(job.status).toBe("pending");
    // A job is only ever between its two parties, and confirming is the craftsman's word.
    expect(
      (await ask({ id: job.id, transition: "confirm", cookie: otherCustomerCookie })).status,
    ).toBe(404);
    expect((await ask({ id: job.id, transition: "confirm", cookie: customerCookie })).status).toBe(
      409,
    );
    expect(
      (await ask({ id: job.id, transition: "complete", cookie: craftsmanCookie })).status,
    ).toBe(409);

    const confirmed = await ask({ id: job.id, transition: "confirm", cookie: craftsmanCookie });
    expect(confirmed.status).toBe(200);
    expect(bookingSchema.parse(await confirmed.json())).toMatchObject({
      id: job.id,
      status: "confirmed",
      location: { cityName: "Praha", districtName: "Libeň", timeZone: "Europe/Prague" },
    });
    // The work still lies ahead, so there is nothing to call finished yet.
    expect(
      (await ask({ id: job.id, transition: "complete", cookie: craftsmanCookie })).status,
    ).toBe(409);
    const lastMonth = Date.now() - 30 * 86_400_000;
    await database
      .update(booking)
      .set({ range: { start: new Date(lastMonth), end: new Date(lastMonth + 3_600_000) } })
      .where(eq(booking.id, job.id));
    const completed = await ask({ id: job.id, transition: "complete", cookie: craftsmanCookie });
    expect(completed.status).toBe(200);
    expect(bookingSchema.parse(await completed.json()).status).toBe("completed");
    expect((await ask({ id: job.id, transition: "cancel", cookie: customerCookie })).status).toBe(
      409,
    );

    const dropped = await book();
    const cancelled = await ask({ id: dropped.id, transition: "cancel", cookie: customerCookie });
    expect(cancelled.status).toBe(200);
    expect(bookingSchema.parse(await cancelled.json()).status).toBe("cancelled");
    const history = await database
      .select()
      .from(bookingHistory)
      .where(eq(bookingHistory.bookingId, dropped.id))
      .orderBy(bookingHistory.recordedAt);
    expect(history.map(({ event }) => event)).toEqual(["created", "cancelled"]);
    expect(history.at(-1)).toMatchObject({
      actorId: customerId,
      snapshot: { previousStatus: "pending", by: "customer" },
    });
    expect(
      (await ask({ id: crypto.randomUUID(), transition: "cancel", cookie: customerCookie })).status,
    ).toBe(404);
  });

  test("returns the job city's zone, not the craftsman's base zone, for bookings in multiple cities", async () => {
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();
    await database.update(city).set({ timeZone: "America/New_York" }).where(eq(city.id, "prague"));
    await database.update(city).set({ timeZone: "Europe/London" }).where(eq(city.id, "pardubice"));
    try {
      await database.insert(booking).values([
        {
          id: secondId,
          customerId,
          craftsmanId,
          craft: "painter",
          cityId: "pardubice",
          districtId: null,
          range: { start: new Date("2042-07-01T08:00:00Z"), end: new Date("2042-07-01T09:00:00Z") },
          currency: "EUR",
          hourlyRate: "10.00",
        },
        {
          id: firstId,
          customerId,
          craftsmanId,
          craft: "painter",
          cityId: "prague",
          districtId: "prague-liben",
          range: { start: new Date("2042-07-01T00:15:00Z"), end: new Date("2042-07-01T01:15:00Z") },
          currency: "EUR",
          hourlyRate: "10.00",
        },
      ]);
      const response = await call({
        path: "/me/bookings/range?start=2042-06-30T00:00:00Z&end=2042-07-02T00:00:00Z",
        cookie: craftsmanCookie,
      });
      expect(response.status).toBe(200);
      const jobs = ownBookingSchema.array().parse(await response.json());
      const fixtureJobs = jobs.filter(({ id }) => id === firstId || id === secondId);
      expect(fixtureJobs).toMatchObject([
        {
          id: firstId,
          start: "2042-07-01T00:15:00.000Z",
          location: { cityId: "prague", districtName: "Libeň", timeZone: "America/New_York" },
        },
        {
          id: secondId,
          location: { cityId: "pardubice", districtName: null, timeZone: "Europe/London" },
        },
      ]);
    } finally {
      await database.delete(booking).where(eq(booking.id, firstId));
      await database.delete(booking).where(eq(booking.id, secondId));
      await database.update(city).set({ timeZone: "Europe/Prague" }).where(eq(city.id, "prague"));
      await database
        .update(city)
        .set({ timeZone: "Europe/Prague" })
        .where(eq(city.id, "pardubice"));
    }
  });

  test("concurrent requests for different districts and nonoverlapping portions of one slot have exactly one winner", async () => {
    const slot = await createSlot();
    const requests = Array.from({ length: 4 }, (_, index) => {
      const start = new Date(new Date(slot.start).getTime() + index * 3_600_000).toISOString();
      const end = new Date(new Date(start).getTime() + 3_600_000).toISOString();

      return call({
        path: "/bookings",
        method: "POST",
        cookie: index % 2 ? customerCookie : otherCustomerCookie,
        body: {
          slotId: slot.id,
          start,
          end,
          location: {
            cityId: "prague",
            districtId: index % 2 ? "prague-liben" : "prague-holesovice",
          },
          currency: "EUR",
        },
      });
    });
    const responses = await Promise.all(requests);
    expect(responses.filter(({ status }) => status === 200)).toHaveLength(1);
    expect(responses.filter(({ status }) => status === 404 || status === 409)).toHaveLength(3);
    expect(
      await database.select().from(availability).where(eq(availability.id, slot.id)),
    ).toHaveLength(0);
    expect(
      await database
        .select()
        .from(availabilityArea)
        .where(eq(availabilityArea.availabilityId, slot.id)),
    ).toHaveLength(0);
  });
});

afterAll(async () => {
  await stopDb();
});

describe("authentication", () => {
  test("registers a customer and exposes the session user", async () => {
    const { email, response, cookie } = await registerUser({ role: "customer" });

    expect(response.status).toBe(200);
    expect(cookie).toContain("session_token");

    const me = await call({ path: "/me", cookie });

    expect(me.status).toBe(200);
    expect(me.headers.get("Cache-Control")).toBe("no-store");
    await expect(me.json()).resolves.toMatchObject({ email, role: "customer" });
  });

  test("registers a craftsman with the craftsman role", async () => {
    const { cookie } = await registerUser({ role: "craftsman" });
    const me = await call({ path: "/me", cookie });

    expect(me.status).toBe(200);
    await expect(me.json()).resolves.toMatchObject({ role: "craftsman" });
  });

  test("rejects a second registration with the same email", async () => {
    const { email } = await registerUser({ role: "customer" });
    const response = await call({
      path: "/auth/sign-up/email",
      method: "POST",
      body: { name: "Impostor", email, password, role: "craftsman" },
    });

    expect(response.ok).toBe(false);
  });

  test("signs an existing customer back in", async () => {
    const { email } = await registerUser({ role: "customer" });
    const response = await call({
      path: "/auth/sign-in/email",
      method: "POST",
      body: { email, password },
    });

    expect(response.status).toBe(200);

    const me = await call({ path: "/me", cookie: readSessionCookie({ response }) });

    await expect(me.json()).resolves.toMatchObject({ email, role: "customer" });
  });

  test("rejects a sign-in without a Turnstile token", async () => {
    const { email } = await registerUser({ role: "customer" });
    const response = await call({
      path: "/auth/sign-in/email",
      method: "POST",
      body: { email, password },
      captchaToken: "",
    });

    expect(response.status).toBe(400);
    expect(readSessionCookie({ response })).toBe("");
  });

  test("rejects a wrong password", async () => {
    const { email } = await registerUser({ role: "customer" });
    const response = await call({
      path: "/auth/sign-in/email",
      method: "POST",
      body: { email, password: "not-the-password" },
    });

    expect(response.status).toBe(401);
  });

  test("rejects an unauthenticated request for the session user", async () => {
    const response = await call({ path: "/me" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Sign in to continue",
    });
  });

  test("rejects a session cookie that was tampered with", async () => {
    const { cookie } = await registerUser({ role: "customer" });
    const response = await call({ path: "/me", cookie: `${cookie}x` });

    expect(response.status).toBe(401);
  });

  test("refuses to change the role of an existing account", async () => {
    const { cookie } = await registerUser({ role: "customer" });
    const response = await call({
      path: "/auth/update-user",
      method: "POST",
      body: { role: "craftsman" },
      cookie,
    });

    expect(response.status).toBe(400);

    const me = await call({ path: "/me", cookie });

    await expect(me.json()).resolves.toMatchObject({ role: "customer" });
  });

  test("ends the session on sign out", async () => {
    const { cookie } = await registerUser({ role: "customer" });
    const signOut = await call({ path: "/auth/sign-out", method: "POST", body: {}, cookie });

    expect(signOut.status).toBe(200);

    const me = await call({ path: "/me", cookie });

    expect(me.status).toBe(401);
  });
});

describe("slot listing and craftsman access", () => {
  test("rejects an anonymous request for a craftsman profile", async () => {
    const response = await call({ path: "/craftsmen/seed-painter" });

    expect(response.status).toBe(401);
  });

  test("no longer serves a craftsmen list", async () => {
    const { cookie } = await registerUser({ role: "customer" });
    const response = await call({ path: "/craftsmen", cookie });

    expect(response.status).toBe(404);
  });

  test("lists seeded slots with their craftsman for a signed-in user", async () => {
    const { cookie } = await registerUser({ role: "customer" });
    const response = await call({ path: "/slots?craft=painter", cookie });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toContainEqual(
      expect.objectContaining({
        craftsmanId: "seed-painter-1",
        craftsman: expect.objectContaining({ id: "seed-painter-1", craft: "painter" }),
      }),
    );
  });
});

const profileInput = {
  craft: "painter",
  baseArea: { cityId: "prague", districtId: "prague-liben" },
  bio: "Interior painting",
  rates: [
    { currency: "CZK", hourlyRate: "250" },
    { currency: "EUR", hourlyRate: "10" },
  ],
};

describe("craftsman profile pricing", () => {
  test("requires a craftsman session for reading and saving a profile", async () => {
    const { cookie } = await registerUser({ role: "customer" });
    for (const method of ["GET", "PUT"] as const) {
      const body = method === "PUT" ? profileInput : undefined;
      const anonymous = await call({ path: "/me/profile", method, body });
      const customer = await call({ path: "/me/profile", method, body, cookie });
      const trailingSlash = await call({ path: "/me/profile/", method, body, cookie });
      expect(anonymous.status).toBe(401);
      expect(customer.status).toBe(403);
      expect(trailingSlash.status).toBe(403);
    }
  });

  test("creates a profile with independent rates, owned by the signed-in craftsman", async () => {
    const { cookie } = await registerUser({ role: "craftsman" });
    const missing = await call({ path: "/me/profile", cookie });
    expect(missing.status).toBe(200);
    await expect(missing.json()).resolves.toBeNull();

    const me = await call({ path: "/me", cookie });
    const { id } = sessionUserSchema.parse(await me.json());
    const saved = await call({
      path: "/me/profile",
      method: "PUT",
      cookie,
      body: { ...profileInput, id: "seed-painter-1", userId: "seed-painter-1" },
    });
    expect(saved.status).toBe(200);
    await expect(saved.json()).resolves.toMatchObject({
      id,
      rates: [
        { currency: "CZK", hourlyRate: "250.00" },
        { currency: "EUR", hourlyRate: "10.00" },
      ],
    });

    const detail = await call({ path: `/craftsmen/${id}`, cookie });
    await expect(detail.json()).resolves.toMatchObject({
      id,
      rates: [
        { currency: "CZK", hourlyRate: "250.00" },
        { currency: "EUR", hourlyRate: "10.00" },
      ],
    });
    const original = await call({ path: "/craftsmen/seed-painter-1", cookie });
    await expect(original.json()).resolves.toMatchObject({ id: "seed-painter-1", bio: null });
  });

  test("saves a profile without rates, but slots need a rate and the last rate stays while slots exist", async () => {
    const { cookie } = await registerUser({ role: "craftsman" });
    const unpriced = await call({
      path: "/me/profile",
      method: "PUT",
      cookie,
      body: { ...profileInput, rates: [] },
    });
    expect(unpriced.status).toBe(200);
    await expect(unpriced.json()).resolves.toMatchObject({ rates: [] });

    const slotInput = {
      start: "2041-01-01T08:00:00.000Z",
      end: "2041-01-01T12:00:00.000Z",
      areas: [{ cityId: "prague", districtId: null }],
    };
    const unpricedSlot = await call({
      path: "/me/availability",
      method: "POST",
      cookie,
      body: slotInput,
    });
    expect(unpricedSlot.status).toBe(400);

    const priced = await call({ path: "/me/profile", method: "PUT", cookie, body: profileInput });
    expect(priced.status).toBe(200);
    const created = await call({
      path: "/me/availability",
      method: "POST",
      cookie,
      body: slotInput,
    });
    expect(created.status).toBe(200);
    const { id: slotId } = slotSchema.parse(await created.json());

    const lastRateRemoval = await call({
      path: "/me/profile",
      method: "PUT",
      cookie,
      body: { ...profileInput, rates: [] },
    });
    expect(lastRateRemoval.status).toBe(409);
    const unchanged = await call({ path: "/me/profile", cookie });
    const { rates } = craftsmanProfileSchema.parse(await unchanged.json());
    expect(rates).toHaveLength(2);

    const removed = await call({ path: `/me/availability/${slotId}`, method: "DELETE", cookie });
    expect(removed.status).toBe(200);
    const withoutSlots = await call({
      path: "/me/profile",
      method: "PUT",
      cookie,
      body: { ...profileInput, rates: [] },
    });
    expect(withoutSlots.status).toBe(200);
  });

  test("enforces v1 rate policy at the API without modifying saved prices on rejection", async () => {
    const { cookie } = await registerUser({ role: "craftsman" });
    const saved = await call({ path: "/me/profile", method: "PUT", cookie, body: profileInput });
    expect(saved.status).toBe(200);
    const expected = await saved.json();
    for (const rates of [
      [{ currency: "EUR", hourlyRate: "12.50" }],
      [
        { currency: "EUR", hourlyRate: "10" },
        { currency: "EUR", hourlyRate: "12" },
      ],
    ]) {
      const rejected = await call({
        path: "/me/profile",
        method: "PUT",
        cookie,
        body: { ...profileInput, rates },
      });
      expect(rejected.status).toBe(400);
    }
    const unchanged = await call({ path: "/me/profile", cookie });
    await expect(unchanged.json()).resolves.toEqual(expected);
  });

  test("replaces advertised currencies without altering a booking's stored price", async () => {
    const { cookie } = await registerUser({ role: "craftsman" });
    const saved = await call({ path: "/me/profile", method: "PUT", cookie, body: profileInput });
    expect(saved.status).toBe(200);
    const { id: craftsmanId } = craftsmanProfileSchema.parse(await saved.json());
    const bookingId = crypto.randomUUID();
    await database.insert(booking).values({
      id: bookingId,
      customerId: "seed-customer-1",
      craftsmanId,
      craft: "painter",
      cityId: "prague",
      districtId: "prague-liben",
      range: { start: new Date("2035-01-01T08:00:00Z"), end: new Date("2035-01-01T10:00:00Z") },
      currency: "EUR",
      hourlyRate: "10.00",
    });

    const updated = await call({
      path: "/me/profile",
      method: "PUT",
      cookie,
      body: {
        ...profileInput,
        rates: [
          { currency: "CZK", hourlyRate: "300" },
          { currency: "PLN", hourlyRate: "45" },
        ],
      },
    });
    expect(updated.status).toBe(200);
    const profile = await call({ path: "/me/profile", cookie });
    await expect(profile.json()).resolves.toMatchObject({
      rates: [
        { currency: "CZK", hourlyRate: "300.00" },
        { currency: "PLN", hourlyRate: "45.00" },
      ],
    });
    const bookedPrice = await database.query.booking.findFirst({
      columns: { currency: true, hourlyRate: true },
      where: (table, { eq }) => eq(table.id, bookingId),
    });
    expect(bookedPrice).toEqual({ currency: "EUR", hourlyRate: "10.00" });
  });

  test("serializes concurrent profile saves so rates never mix between submissions", async () => {
    const { cookie } = await registerUser({ role: "craftsman" });
    const submissions = [
      { ...profileInput, bio: "First", rates: [{ currency: "EUR", hourlyRate: "10" }] },
      {
        ...profileInput,
        bio: "Second",
        rates: [
          { currency: "USD", hourlyRate: "12" },
          { currency: "PLN", hourlyRate: "45" },
        ],
      },
    ];
    const responses = await Promise.all(
      submissions.map((body) => call({ path: "/me/profile", method: "PUT", cookie, body })),
    );
    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
    const current = await call({ path: "/me/profile", cookie });
    const { bio, rates } = craftsmanProfileSchema.parse(await current.json());
    const expectedRates: CraftsmanRate[] =
      bio === "First"
        ? [{ currency: "EUR", hourlyRate: "10.00" }]
        : [
            { currency: "PLN", hourlyRate: "45.00" },
            { currency: "USD", hourlyRate: "12.00" },
          ];
    expect(rates).toEqual(expectedRates);
  });
});
