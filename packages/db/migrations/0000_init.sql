CREATE TYPE "public"."assigned_by" AS ENUM('lottery', 'customer');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."craft" AS ENUM('painter', 'plumber', 'electrician', 'carpenter', 'tiler');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'craftsman');--> statement-breakpoint
CREATE TABLE "availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"craftsman_id" text NOT NULL,
	"range" "tstzrange" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text NOT NULL,
	"craftsman_id" text NOT NULL,
	"craft" "craft" NOT NULL,
	"range" "tstzrange" NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"assigned_by" "assigned_by" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "craftsman_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"craft" "craft" NOT NULL,
	"city" text NOT NULL,
	"hourly_rate" integer NOT NULL,
	"bio" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "availability" ADD CONSTRAINT "availability_craftsman_id_craftsman_profile_user_id_fk" FOREIGN KEY ("craftsman_id") REFERENCES "public"."craftsman_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_customer_id_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_craftsman_id_craftsman_profile_user_id_fk" FOREIGN KEY ("craftsman_id") REFERENCES "public"."craftsman_profile"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craftsman_profile" ADD CONSTRAINT "craftsman_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_craftsman_idx" ON "availability" USING btree ("craftsman_id");--> statement-breakpoint
CREATE INDEX "booking_customer_idx" ON "booking" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "booking_craftsman_idx" ON "booking" USING btree ("craftsman_id");--> statement-breakpoint
CREATE INDEX "booking_active_idx" ON "booking" USING btree ("craftsman_id") WHERE "booking"."status" in ('pending', 'confirmed');