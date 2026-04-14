ALTER TABLE "ExpenseCategory"
ADD COLUMN "color" VARCHAR(7) NOT NULL DEFAULT '#6e9274'; -- NOSONAR: PostgreSQL uses VARCHAR; VARCHAR2 is Oracle-specific.

ALTER TABLE "ExpenseCategory"
ADD CONSTRAINT "ExpenseCategory_color_hex_check"
CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$');
