CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."craft" AS ENUM('painter', 'plumber', 'electrician', 'carpenter', 'tiler');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'craftsman');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"craftsman_id" text NOT NULL,
	"range" "tstzrange" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_valid_range" CHECK (not isempty("availability"."range") and not lower_inf("availability"."range") and not upper_inf("availability"."range") and isfinite(lower("availability"."range")) and isfinite(upper("availability"."range")) and lower_inc("availability"."range") and not upper_inc("availability"."range"))
);
--> statement-breakpoint
CREATE TABLE "availability_area" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"availability_id" uuid NOT NULL,
	"city_id" text NOT NULL,
	"district_id" text,
	CONSTRAINT "availability_area_unique" UNIQUE NULLS NOT DISTINCT("availability_id","city_id","district_id")
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text NOT NULL,
	"craftsman_id" text NOT NULL,
	"craft" "craft" NOT NULL,
	"range" "tstzrange" NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"city_id" text NOT NULL,
	"district_id" text,
	"currency" text NOT NULL,
	"hourly_rate" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_valid_range" CHECK (not isempty("booking"."range") and not lower_inf("booking"."range") and not upper_inf("booking"."range") and isfinite(lower("booking"."range")) and isfinite(upper("booking"."range")) and lower_inc("booking"."range") and not upper_inc("booking"."range")),
	CONSTRAINT "booking_rate_positive" CHECK ("booking"."hourly_rate" > 0 and "booking"."hourly_rate" <> 'NaN'::numeric)
);
--> statement-breakpoint
CREATE TABLE "booking_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"event" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "city" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "craftsman_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"craft" "craft" NOT NULL,
	"base_city_id" text NOT NULL,
	"base_district_id" text,
	"bio" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "craftsman_rate" (
	"craftsman_id" text NOT NULL,
	"currency" text NOT NULL,
	"hourly_rate" numeric(12, 2) NOT NULL,
	CONSTRAINT "craftsman_rate_craftsman_id_currency_pk" PRIMARY KEY("craftsman_id","currency"),
	CONSTRAINT "craftsman_rate_positive" CHECK ("craftsman_rate"."hourly_rate" > 0 and "craftsman_rate"."hourly_rate" <> 'NaN'::numeric)
);
--> statement-breakpoint
CREATE TABLE "district" (
	"id" text PRIMARY KEY NOT NULL,
	"city_id" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "district_id_city_unique" UNIQUE("id","city_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_craftsman_id_craftsman_profile_user_id_fk" FOREIGN KEY ("craftsman_id") REFERENCES "public"."craftsman_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_area" ADD CONSTRAINT "availability_area_availability_id_availability_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."availability"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_area" ADD CONSTRAINT "availability_area_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_area" ADD CONSTRAINT "availability_area_district_city_fk" FOREIGN KEY ("district_id","city_id") REFERENCES "public"."district"("id","city_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_customer_id_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_craftsman_id_craftsman_profile_user_id_fk" FOREIGN KEY ("craftsman_id") REFERENCES "public"."craftsman_profile"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_district_city_fk" FOREIGN KEY ("district_id","city_id") REFERENCES "public"."district"("id","city_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craftsman_profile" ADD CONSTRAINT "craftsman_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craftsman_profile" ADD CONSTRAINT "craftsman_profile_base_city_id_city_id_fk" FOREIGN KEY ("base_city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craftsman_profile" ADD CONSTRAINT "profile_district_city_fk" FOREIGN KEY ("base_district_id","base_city_id") REFERENCES "public"."district"("id","city_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craftsman_rate" ADD CONSTRAINT "craftsman_rate_craftsman_id_craftsman_profile_user_id_fk" FOREIGN KEY ("craftsman_id") REFERENCES "public"."craftsman_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "district" ADD CONSTRAINT "district_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "availability_craftsman_idx" ON "availability" USING btree ("craftsman_id");--> statement-breakpoint
CREATE INDEX "availability_area_city_idx" ON "availability_area" USING btree ("city_id","availability_id");--> statement-breakpoint
CREATE INDEX "availability_area_district_idx" ON "availability_area" USING btree ("district_id","availability_id");--> statement-breakpoint
CREATE INDEX "booking_customer_idx" ON "booking" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "booking_craftsman_idx" ON "booking" USING btree ("craftsman_id");--> statement-breakpoint
CREATE INDEX "booking_active_idx" ON "booking" USING btree ("craftsman_id") WHERE "booking"."status" in ('pending', 'confirmed');--> statement-breakpoint
CREATE INDEX "booking_history_booking_idx" ON "booking_history" USING btree ("booking_id","recorded_at");--> statement-breakpoint
CREATE INDEX "district_city_idx" ON "district" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
--> statement-breakpoint
-- Custom PostgreSQL invariants and comments not emitted by drizzle-kit.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_no_overlap"
  EXCLUDE USING gist ("craftsman_id" WITH =, "range" WITH &&);
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_active_overlap"
  EXCLUDE USING gist ("craftsman_id" WITH =, "range" WITH &&)
  WHERE ("status" IN ('pending', 'confirmed'));
--> statement-breakpoint
COMMENT ON COLUMN "availability_area"."city_id" IS
  'Intentionally denormalized from district.city_id for city-based slot filtering without a district join. A composite foreign key enforces consistency. With a NULL district_id, this required city identifies whole-city coverage.';
--> statement-breakpoint
COMMENT ON TABLE "booking_history" IS
  'Independent historical snapshots intentionally have no foreign keys, so they survive deletion or changes to operational records.';
