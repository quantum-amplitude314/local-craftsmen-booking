CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_no_overlap"
  EXCLUDE USING gist ("craftsman_id" WITH =, "range" WITH &&);
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_active_overlap"
  EXCLUDE USING gist ("craftsman_id" WITH =, "range" WITH &&)
  WHERE ("status" IN ('pending', 'confirmed'));
