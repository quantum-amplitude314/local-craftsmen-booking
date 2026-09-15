import { sql } from "drizzle-orm";
import {
  boolean,
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

export const craftsmanProfile = pgTable("craftsman_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  craft: craftEnum("craft").notNull(),
  city: text("city").notNull(),
  hourlyRate: integer("hourly_rate").notNull(),
  bio: text("bio"),
  timezone: text("timezone").notNull().default("UTC"),
  ...timestamps,
});

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
