-- Renamed in place so profiles and bookings keep their craft.
ALTER TYPE "public"."craft" RENAME VALUE 'painter' TO 'painting';--> statement-breakpoint
ALTER TYPE "public"."craft" RENAME VALUE 'plumber' TO 'plumbing';--> statement-breakpoint
ALTER TYPE "public"."craft" RENAME VALUE 'electrician' TO 'electrical';--> statement-breakpoint
ALTER TYPE "public"."craft" RENAME VALUE 'carpenter' TO 'carpentry';--> statement-breakpoint
ALTER TYPE "public"."craft" RENAME VALUE 'tiler' TO 'tiling';--> statement-breakpoint
ALTER TYPE "public"."craft" ADD VALUE 'cleaning';--> statement-breakpoint
ALTER TYPE "public"."craft" ADD VALUE 'it';--> statement-breakpoint
ALTER TYPE "public"."craft" ADD VALUE 'wellness';
