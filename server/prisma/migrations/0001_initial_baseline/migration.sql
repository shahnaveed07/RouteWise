-- RouteWise Initial PostgreSQL Relational Schema Baseline
-- Applied to Cloud SQL PostgreSQL instance `ai-studio-de6d6586` (asia-southeast1) on 2026-11-07
-- Verified via `information_schema.columns` (8 tables, 62 columns).

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "uid" varchar(128) NOT NULL,
  "full_name" varchar(100) NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_uid_unique" UNIQUE("uid"),
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "trips" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  "title" varchar(150) NOT NULL,
  "destination_name" varchar(180) NOT NULL,
  "description" text,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "currency" char(3) DEFAULT 'INR' NOT NULL,
  "planned_budget" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chk_trips_dates" CHECK ("trips"."end_date" >= "trips"."start_date"),
  CONSTRAINT "chk_trips_budget_non_negative" CHECK ("trips"."planned_budget" >= 0)
);

CREATE TABLE IF NOT EXISTS "trip_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  "role" varchar(20) DEFAULT 'member' NOT NULL,
  "membership_status" varchar(20) DEFAULT 'active' NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "uq_trip_members_trip_user" UNIQUE("trip_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "itinerary_days" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action,
  "day_date" date NOT NULL,
  "day_order" integer NOT NULL,
  "notes" text,
  CONSTRAINT "uq_itinerary_days_trip_date" UNIQUE("trip_id", "day_date"),
  CONSTRAINT "uq_itinerary_days_trip_order" UNIQUE("trip_id", "day_order"),
  CONSTRAINT "chk_itinerary_days_order_positive" CHECK ("itinerary_days"."day_order" >= 1)
);

CREATE TABLE IF NOT EXISTS "places" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(40),
  "provider_place_id" varchar(180),
  "name" varchar(180) NOT NULL,
  "address" text,
  "latitude" numeric(9, 6),
  "longitude" numeric(9, 6),
  CONSTRAINT "uq_places_provider_id" UNIQUE("provider", "provider_place_id"),
  CONSTRAINT "chk_places_coords_pair_and_range" CHECK (
    ("places"."latitude" IS NULL AND "places"."longitude" IS NULL)
    OR (
      "places"."latitude" IS NOT NULL
      AND "places"."longitude" IS NOT NULL
      AND "places"."latitude" >= -90
      AND "places"."latitude" <= 90
      AND "places"."longitude" >= -180
      AND "places"."longitude" <= 180
    )
  )
);

CREATE TABLE IF NOT EXISTS "itinerary_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "itinerary_day_id" uuid NOT NULL REFERENCES "public"."itinerary_days"("id") ON DELETE cascade ON UPDATE no action,
  "place_id" uuid REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action,
  "title" varchar(180) NOT NULL,
  "description" text,
  "start_time" time,
  "end_time" time,
  "estimated_cost" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "sort_order" integer NOT NULL,
  CONSTRAINT "uq_itinerary_items_day_order" UNIQUE("itinerary_day_id", "sort_order"),
  CONSTRAINT "chk_itinerary_items_cost_non_negative" CHECK ("itinerary_items"."estimated_cost" >= 0),
  CONSTRAINT "chk_itinerary_items_sort_positive" CHECK ("itinerary_items"."sort_order" >= 1)
);

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action,
  "paid_by_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  "created_by_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  "title" varchar(180) NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "category" varchar(50) NOT NULL,
  "expense_date" date NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chk_expenses_amount_positive" CHECK ("expenses"."amount" > 0)
);

CREATE TABLE IF NOT EXISTS "expense_splits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "expense_id" uuid NOT NULL REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  "share_amount" numeric(12, 2) NOT NULL,
  "is_settled" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uq_expense_splits_expense_user" UNIQUE("expense_id", "user_id"),
  CONSTRAINT "chk_expense_splits_share_non_negative" CHECK ("expense_splits"."share_amount" >= 0)
);

CREATE INDEX IF NOT EXISTS "idx_expenses_trip_date" ON "expenses" USING btree ("trip_id", "expense_date");
CREATE INDEX IF NOT EXISTS "idx_trips_owner_updated" ON "trips" USING btree ("owner_user_id", "updated_at");
