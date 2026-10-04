-- Hand-written to keep the data: the audit log is renamed, closed jobs move out of "booking".
ALTER TABLE "booking_history" RENAME TO "booking_log";--> statement-breakpoint
ALTER TABLE "booking_log" RENAME CONSTRAINT "booking_history_pkey" TO "booking_log_pkey";--> statement-breakpoint
ALTER INDEX "booking_history_booking_idx" RENAME TO "booking_log_booking_idx";--> statement-breakpoint
CREATE TABLE "cancelled_booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cancelled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_by_id" text NOT NULL,
	"cancelled_by_name" text NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "completed_booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_review" text,
	"craftsman_review" text
);
--> statement-breakpoint
CREATE TABLE "booking_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"craftsman_id" text NOT NULL,
	"craftsman_name" text NOT NULL,
	"craft" "craft" NOT NULL,
	"range" "tstzrange" NOT NULL,
	"city_id" text NOT NULL,
	"district_id" text,
	"currency" text NOT NULL,
	"hourly_rate" numeric(12, 2) NOT NULL,
	"booked_at" timestamp with time zone NOT NULL,
	"completed_booking_id" uuid,
	"cancelled_booking_id" uuid,
	CONSTRAINT "booking_history_completed_booking_id_unique" UNIQUE("completed_booking_id"),
	CONSTRAINT "booking_history_cancelled_booking_id_unique" UNIQUE("cancelled_booking_id"),
	CONSTRAINT "booking_history_valid_range" CHECK (not isempty("booking_history"."range") and not lower_inf("booking_history"."range") and not upper_inf("booking_history"."range") and isfinite(lower("booking_history"."range")) and isfinite(upper("booking_history"."range")) and lower_inc("booking_history"."range") and not upper_inc("booking_history"."range")),
	CONSTRAINT "booking_history_rate_positive" CHECK ("booking_history"."hourly_rate" > 0 and "booking_history"."hourly_rate" <> 'NaN'::numeric),
	CONSTRAINT "booking_history_one_outcome" CHECK (num_nonnulls("booking_history"."completed_booking_id", "booking_history"."cancelled_booking_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "booking_history" ADD CONSTRAINT "booking_history_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_history" ADD CONSTRAINT "booking_history_completed_booking_id_completed_booking_id_fk" FOREIGN KEY ("completed_booking_id") REFERENCES "public"."completed_booking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_history" ADD CONSTRAINT "booking_history_cancelled_booking_id_cancelled_booking_id_fk" FOREIGN KEY ("cancelled_booking_id") REFERENCES "public"."cancelled_booking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_history" ADD CONSTRAINT "booking_history_district_city_fk" FOREIGN KEY ("district_id","city_id") REFERENCES "public"."district"("id","city_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_history_customer_idx" ON "booking_history" USING btree ("customer_id",lower("range"));--> statement-breakpoint
CREATE INDEX "booking_history_craftsman_idx" ON "booking_history" USING btree ("craftsman_id",lower("range"));--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "booked_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "craftsman_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "customer_done_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "craftsman_done_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "customer_review" text;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "craftsman_review" text;--> statement-breakpoint
UPDATE "booking" SET "booked_at" = "created_at";--> statement-breakpoint
UPDATE "booking" AS b SET "craftsman_confirmed_at" = coalesce(
	(SELECT min(l."recorded_at") FROM "booking_log" AS l WHERE l."booking_id" = b."id" AND l."event" = 'confirmed'),
	b."updated_at"
) WHERE b."status" = 'confirmed';--> statement-breakpoint
INSERT INTO "completed_booking" ("id", "completed_at")
SELECT b."id", coalesce(
	(SELECT max(l."recorded_at") FROM "booking_log" AS l WHERE l."booking_id" = b."id" AND l."event" = 'completed'),
	b."updated_at"
)
FROM "booking" AS b WHERE b."status" = 'completed';--> statement-breakpoint
INSERT INTO "cancelled_booking" ("id", "cancelled_at", "cancelled_by_id", "cancelled_by_name")
SELECT b."id", coalesce(c."recorded_at", b."updated_at"), u."id", u."name"
FROM "booking" AS b
LEFT JOIN LATERAL (
	SELECT l."recorded_at", l."actor_id" FROM "booking_log" AS l
	WHERE l."booking_id" = b."id" AND l."event" = 'cancelled'
	ORDER BY l."recorded_at" DESC LIMIT 1
) AS c ON true
JOIN "user" AS u ON u."id" = coalesce(c."actor_id", b."customer_id")
WHERE b."status" = 'cancelled';--> statement-breakpoint
INSERT INTO "booking_history" (
	"id", "customer_id", "customer_name", "craftsman_id", "craftsman_name", "craft", "range", "city_id",
	"district_id", "currency", "hourly_rate", "booked_at", "completed_booking_id", "cancelled_booking_id"
)
SELECT b."id", b."customer_id", customer."name", b."craftsman_id", craftsman."name", b."craft", b."range",
	b."city_id", b."district_id", b."currency", b."hourly_rate", b."created_at",
	CASE WHEN b."status" = 'completed' THEN b."id" END,
	CASE WHEN b."status" = 'cancelled' THEN b."id" END
FROM "booking" AS b
JOIN "user" AS customer ON customer."id" = b."customer_id"
JOIN "user" AS craftsman ON craftsman."id" = b."craftsman_id"
WHERE b."status" IN ('completed', 'cancelled');--> statement-breakpoint
DELETE FROM "booking" WHERE "status" IN ('completed', 'cancelled');--> statement-breakpoint
ALTER TABLE "booking" DROP CONSTRAINT "booking_no_active_overlap";--> statement-breakpoint
DROP INDEX "booking_craftsman_idx";--> statement-breakpoint
DROP INDEX "booking_active_idx";--> statement-breakpoint
ALTER TABLE "booking" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "booking" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "booking" DROP COLUMN "updated_at";--> statement-breakpoint
DROP TYPE "public"."booking_status";--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_done_after_confirmed" CHECK (("booking"."customer_done_at" is null and "booking"."craftsman_done_at" is null) or "booking"."craftsman_confirmed_at" is not null);--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_done_after_end" CHECK (("booking"."customer_done_at" is null or "booking"."customer_done_at" >= upper("booking"."range")) and ("booking"."craftsman_done_at" is null or "booking"."craftsman_done_at" >= upper("booking"."range")));--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_review_with_done" CHECK (("booking"."customer_review" is null or "booking"."customer_done_at" is not null) and ("booking"."craftsman_review" is null or "booking"."craftsman_done_at" is not null));--> statement-breakpoint
-- Custom PostgreSQL invariant not emitted by drizzle-kit: every row is an open job now.
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist ("craftsman_id" WITH =, "range" WITH &&);
