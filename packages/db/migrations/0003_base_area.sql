CREATE TABLE "city" (
	"id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
INSERT INTO "city" ("id") VALUES ('prague'), ('pilsen'), ('pardubice');--> statement-breakpoint
ALTER TABLE "craftsman_profile" ADD COLUMN "base_city_id" text;--> statement-breakpoint
ALTER TABLE "craftsman_profile" ADD COLUMN "base_other_city_name" text;--> statement-breakpoint
ALTER TABLE "craftsman_profile" ADD COLUMN "base_district" text;--> statement-breakpoint
UPDATE "craftsman_profile" SET "base_other_city_name" = "city";--> statement-breakpoint
ALTER TABLE "craftsman_profile" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "craftsman_profile" ADD CONSTRAINT "craftsman_profile_base_city_id_city_id_fk" FOREIGN KEY ("base_city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craftsman_profile" ADD CONSTRAINT "craftsman_profile_base_city" CHECK (("craftsman_profile"."base_city_id" is null) <> ("craftsman_profile"."base_other_city_name" is null));
