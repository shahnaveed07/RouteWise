-- RouteWise Phase 3 Migration: Add Destination Coordinates to Trips
-- Adds nullable destination_latitude and destination_longitude (NUMERIC(9,6))
-- with a paired WGS84 range CHECK constraint.
-- Reversible down-migration (for reference only, do not run automatically):
--   ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "chk_trips_destination_coords_pair_and_range";
--   ALTER TABLE "trips" DROP COLUMN IF EXISTS "destination_longitude";
--   ALTER TABLE "trips" DROP COLUMN IF EXISTS "destination_latitude";

ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "destination_latitude" numeric(9, 6),
  ADD COLUMN IF NOT EXISTS "destination_longitude" numeric(9, 6);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_trips_destination_coords_pair_and_range'
  ) THEN
    ALTER TABLE "trips"
      ADD CONSTRAINT "chk_trips_destination_coords_pair_and_range" CHECK (
        ("destination_latitude" IS NULL AND "destination_longitude" IS NULL)
        OR (
          "destination_latitude" IS NOT NULL
          AND "destination_longitude" IS NOT NULL
          AND "destination_latitude" >= -90
          AND "destination_latitude" <= 90
          AND "destination_longitude" >= -180
          AND "destination_longitude" <= 180
        )
      );
  END IF;
END $$;
