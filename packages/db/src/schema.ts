import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tstzrange } from "./range.ts";

export const userRoleEnum = pgEnum("user_role", ["customer", "craftsman"]);
export const craftEnum = pgEnum("craft", [
  "painter",
  "plumber",
  "electrician",
  "carpenter",
  "tiler",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("customer"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (table) => [index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const city = pgTable("city", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const district = pgTable(
  "district",
  {
    id: text("id").primaryKey(),
    cityId: text("city_id")
      .notNull()
      .references(() => city.id),
    name: text("name").notNull(),
  },
  (table) => [
    unique("district_id_city_unique").on(table.id, table.cityId),
    index("district_city_idx").on(table.cityId),
  ],
);

export const craftsmanProfile = pgTable(
  "craftsman_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    craft: craftEnum("craft").notNull(),
    baseCityId: text("base_city_id")
      .notNull()
      .references(() => city.id),
    baseDistrictId: text("base_district_id"),
    bio: text("bio"),
    timezone: text("timezone").notNull().default("UTC"),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      name: "profile_district_city_fk",
      columns: [table.baseDistrictId, table.baseCityId],
      foreignColumns: [district.id, district.cityId],
    }),
  ],
);

export const craftsmanRate = pgTable(
  "craftsman_rate",
  {
    craftsmanId: text("craftsman_id")
      .notNull()
      .references(() => craftsmanProfile.userId, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    hourlyRate: numeric("hourly_rate", { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.craftsmanId, table.currency] }),
    check(
      "craftsman_rate_positive",
      sql`${table.hourlyRate} > 0 and ${table.hourlyRate} <> 'NaN'::numeric`,
    ),
  ],
);

export const availability = pgTable(
  "availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    craftsmanId: text("craftsman_id")
      .notNull()
      .references(() => craftsmanProfile.userId, { onDelete: "cascade" }),
    range: tstzrange("range").notNull(),
    ...timestamps,
  },
  (table) => [
    index("availability_craftsman_idx").on(table.craftsmanId),
    check(
      "availability_valid_range",
      sql`not isempty(${table.range}) and not lower_inf(${table.range}) and not upper_inf(${table.range}) and isfinite(lower(${table.range})) and isfinite(upper(${table.range})) and lower_inc(${table.range}) and not upper_inc(${table.range})`,
    ),
  ],
);

export const availabilityArea = pgTable(
  "availability_area",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    availabilityId: uuid("availability_id")
      .notNull()
      .references(() => availability.id, { onDelete: "cascade" }),
    // Intentionally denormalized from district.city_id for city-based slot filtering
    // without a district join. A composite foreign key enforces consistency.
    // With no district, this required city identifies whole-city coverage.
    cityId: text("city_id")
      .notNull()
      .references(() => city.id),
    districtId: text("district_id"),
  },
  (table) => [
    foreignKey({
      name: "availability_area_district_city_fk",
      columns: [table.districtId, table.cityId],
      foreignColumns: [district.id, district.cityId],
    }),
    unique("availability_area_unique")
      .on(table.availabilityId, table.cityId, table.districtId)
      .nullsNotDistinct(),
    index("availability_area_city_idx").on(table.cityId, table.availabilityId),
    index("availability_area_district_idx").on(table.districtId, table.availabilityId),
  ],
);

export const booking = pgTable(
  "booking",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id),
    craftsmanId: text("craftsman_id")
      .notNull()
      .references(() => craftsmanProfile.userId),
    craft: craftEnum("craft").notNull(),
    range: tstzrange("range").notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    cityId: text("city_id")
      .notNull()
      .references(() => city.id),
    districtId: text("district_id"),
    currency: text("currency").notNull(),
    hourlyRate: numeric("hourly_rate", { precision: 12, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      name: "booking_district_city_fk",
      columns: [table.districtId, table.cityId],
      foreignColumns: [district.id, district.cityId],
    }),
    check(
      "booking_valid_range",
      sql`not isempty(${table.range}) and not lower_inf(${table.range}) and not upper_inf(${table.range}) and isfinite(lower(${table.range})) and isfinite(upper(${table.range})) and lower_inc(${table.range}) and not upper_inc(${table.range})`,
    ),
    check(
      "booking_rate_positive",
      sql`${table.hourlyRate} > 0 and ${table.hourlyRate} <> 'NaN'::numeric`,
    ),
    index("booking_customer_idx").on(table.customerId),
    index("booking_craftsman_idx").on(table.craftsmanId),
    index("booking_active_idx")
      .on(table.craftsmanId)
      .where(sql`${table.status} in ('pending', 'confirmed')`),
  ],
);

// Intentionally no foreign keys: historical snapshots survive operational record deletion.
export const bookingHistory = pgTable(
  "booking_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").notNull(),
    actorId: text("actor_id").notNull(),
    event: text("event").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("booking_history_booking_idx").on(table.bookingId, table.recordedAt)],
);
