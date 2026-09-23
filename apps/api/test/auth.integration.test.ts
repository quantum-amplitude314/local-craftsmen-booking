import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createBookingsService,
  createCraftsmenService,
  createLocationsService,
  createSlotsService,
} from "@local-craftsmen/application";
import {
  type Area,
  bookingSchema,
  type CraftsmanRate,
  craftsmanProfileSchema,
  sessionUserSchema,
  slotSchema,
} from "@local-craftsmen/contracts";
import {
  availability,
  availabilityArea,
  booking,
  bookingHistory,
  type Db,
} from "@local-craftsmen/db";
import { startTestDb } from "@local-craftsmen/db/test-db";
import { eq } from "drizzle-orm";
import { createApp } from "../src/app.ts";
import { createAuth } from "../src/auth.ts";

const baseUrl = "http://localhost:3001";
const webOrigin = "http://localhost:3000";
const password = "correct-horse-battery";
const { TURNSTILE_SECRET_KEY: turnstileSecretKey, TURNSTILE_TEST_TOKEN: turnstileToken } =
  process.env;

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
        end: new Date(Date.UTC(2040, 0, day, 16)).toISOString(),
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
      expect((await call({ path })).status).toBe(401);
      expect((await call({ path, cookie: customerCookie })).status).toBe(403);
      expect((await call({ path, method: "POST", body: {}, cookie: customerCookie })).status).toBe(
        403,
      );
    }
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
    const directory = await call({
      path: `/craftsmen?cityId=prague&start=${slot.start}&end=${slot.end}`,
      cookie: customerCookie,
    });
    expect(await directory.json()).toContainEqual(expect.objectContaining({ id: craftsmanId }));
    const wrongCity = await call({
      path: `/craftsmen?cityId=pilsen&start=${slot.start}&end=${slot.end}`,
      cookie: customerCookie,
    });
    expect(await wrongCity.json()).not.toContainEqual(expect.objectContaining({ id: craftsmanId }));
    const outsideTime = await call({
      path: `/slots?cityId=prague&start=${slot.start}&end=2041-01-01T00:00:00Z`,
      cookie: customerCookie,
    });
    expect(await outsideTime.json()).not.toContainEqual(expect.objectContaining({ id: slot.id }));
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
    const end = "2042-01-01T16:00:00Z";
    const invalid = await call({
      path: "/me/availability",
      method: "POST",
      cookie: craftsmanCookie,
      body: { start, end, areas: [{ cityId: "prague", districtId: "pilsen-doubravka" }] },
    });
    expect(invalid.status).toBe(400);
    const valid = await call({
      path: "/me/availability",
      method: "POST",
      cookie: craftsmanCookie,
      body: { start, end, areas: [{ cityId: "prague", districtId: null }] },
    });
    expect(valid.status).toBe(200);
  });

  test("restricts slot listing/deletion to the owner and cascades coverage deletion", async () => {
    const { id } = await createSlot();
    const otherList = await call({ path: "/me/availability", cookie: otherCraftsmanCookie });
    await expect(otherList.json()).resolves.toEqual([]);
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
    const own = await call({ path: "/me/bookings", cookie: customerCookie });
    expect(bookingSchema.array().parse(await own.json())).toContainEqual(booked);
    const provider = await call({ path: "/me/bookings", cookie: craftsmanCookie });
    expect(bookingSchema.array().parse(await provider.json())).toContainEqual(booked);
    const unrelated = await call({ path: "/me/bookings", cookie: otherCustomerCookie });
    expect(bookingSchema.array().parse(await unrelated.json())).not.toContainEqual(booked);
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

  test("concurrent requests for different districts and nonoverlapping portions of one slot have exactly one winner", async () => {
    const slot = await createSlot();
    const requests = Array.from({ length: 8 }, (_, index) => {
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
    expect(responses.filter(({ status }) => status === 404 || status === 409)).toHaveLength(7);
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

describe("craftsmen directory access", () => {
  test("rejects an anonymous request for the craftsmen list", async () => {
    const response = await call({ path: "/craftsmen" });

    expect(response.status).toBe(401);
  });

  test("rejects an anonymous request for a craftsman profile", async () => {
    const response = await call({ path: "/craftsmen/seed-painter" });

    expect(response.status).toBe(401);
  });

  test("lists craftsmen for a signed-in user", async () => {
    const { cookie } = await registerUser({ role: "customer" });
    const response = await call({ path: "/craftsmen", cookie });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.not.toHaveLength(0);
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

    const directory = await call({ path: "/craftsmen", cookie });
    const rows = await directory.json();
    expect(rows).toContainEqual(
      expect.objectContaining({
        id,
        rates: [
          { currency: "CZK", hourlyRate: "250.00" },
          { currency: "EUR", hourlyRate: "10.00" },
        ],
      }),
    );
    const original = await call({ path: "/craftsmen/seed-painter-1", cookie });
    await expect(original.json()).resolves.toMatchObject({ id: "seed-painter-1", bio: null });
  });

  test("enforces v1 rate policy at the API without modifying saved prices on rejection", async () => {
    const { cookie } = await registerUser({ role: "craftsman" });
    const saved = await call({ path: "/me/profile", method: "PUT", cookie, body: profileInput });
    expect(saved.status).toBe(200);
    const expected = await saved.json();
    for (const rates of [
      [],
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
