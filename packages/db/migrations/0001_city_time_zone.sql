ALTER TABLE "city" ADD COLUMN "time_zone" text DEFAULT 'Europe/Prague' NOT NULL;--> statement-breakpoint
ALTER TABLE "city" ALTER COLUMN "time_zone" DROP DEFAULT;
