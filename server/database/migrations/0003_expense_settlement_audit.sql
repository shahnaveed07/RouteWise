-- RouteWise Phase 5 Migration: Add Expense Split Settlement Audit Columns & Index
-- Adds nullable settled_at (TIMESTAMPTZ) and settled_by_user_id (UUID -> users.id ON DELETE SET NULL)
-- to expense_splits, plus lookup indexes for settlement queries.
-- Reversible down-migration (for reference only, do not run automatically):
--   DROP INDEX IF EXISTS "idx_expense_splits_user_settled";
--   DROP INDEX IF EXISTS "idx_expense_splits_expense_id";
--   ALTER TABLE "expense_splits" DROP COLUMN IF EXISTS "settled_by_user_id";
--   ALTER TABLE "expense_splits" DROP COLUMN IF EXISTS "settled_at";

ALTER TABLE "expense_splits"
  ADD COLUMN IF NOT EXISTS "settled_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "settled_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "idx_expense_splits_user_settled"
  ON "expense_splits" USING btree ("user_id", "is_settled");

CREATE INDEX IF NOT EXISTS "idx_expense_splits_expense_id"
  ON "expense_splits" USING btree ("expense_id");
