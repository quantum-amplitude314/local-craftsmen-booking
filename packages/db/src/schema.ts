import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
export const assignedByEnum = pgEnum("assigned_by", ["lottery", "customer"]);

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
});

export const craftsmanProfile = pgTable(
  "craftsman_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    craft: craftEnum("craft").notNull(),
    baseCityId: text("base_city_id").references(() => city.id),
    baseOtherCityName: text("base_other_city_name"),
    baseDistrict: text("base_district"),
    hourlyRate: integer("hourly_rate").notNull(),
    bio: text("bio"),
    timezone: text("timezone").notNull().default("UTC"),
    ...timestamps,
  },
  (table) => [
    check(
      "craftsman_profile_base_city",
      sql`(${table.baseCityId} is null) <> (${table.baseOtherCityName} is null)`,
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
  (table) => [index("availability_craftsman_idx").on(table.craftsmanId)],
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
    assignedBy: assignedByEnum("assigned_by").notNull(),
    ...timestamps,
  },
  (table) => [
    index("booking_customer_idx").on(table.customerId),
    index("booking_craftsman_idx").on(table.craftsmanId),
    index("booking_active_idx")
      .on(table.craftsmanId)
      .where(sql`${table.status} in ('pending', 'confirmed')`),
  ],
);
