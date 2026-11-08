-- RouteWise Phase 6 SQL Migration: Trip Invitations & Collaboration Lifecycle
-- Creates the `trip_invitations` table storing SHA-256 token hashes (never raw tokens),
-- role & status CHECK constraints, lookup indexes, and a partial unique index preventing
-- duplicate pending invitations for the same (trip_id, invited_email).

CREATE TABLE IF NOT EXISTS "trip_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL REFERENCES "public"."trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "invited_email" varchar(255) NOT NULL,
  "role" varchar(20) DEFAULT 'member' NOT NULL,
  "token_hash" char(64) NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "invited_by_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "accepted_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "responded_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uq_trip_invitations_token_hash" UNIQUE ("token_hash"),
  CONSTRAINT "chk_trip_invitations_role" CHECK ("role" IN ('member', 'viewer')),
  CONSTRAINT "chk_trip_invitations_status" CHECK ("status" IN ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  CONSTRAINT "chk_trip_invitations_email_normalized" CHECK (
    "invited_email" = lower(btrim("invited_email"))
    AND length(btrim("invited_email")) >= 3
  )
);

CREATE INDEX IF NOT EXISTS "idx_trip_invitations_trip_status_created"
  ON "trip_invitations" ("trip_id", "status", "created_at" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_trip_invitations_pending_trip_email"
  ON "trip_invitations" ("trip_id", "invited_email")
  WHERE ("status" = 'pending');
