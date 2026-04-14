ALTER TABLE "Expense"
ADD COLUMN "memberName" VARCHAR(120); -- NOSONAR: PostgreSQL uses VARCHAR; VARCHAR2 is Oracle-specific.
