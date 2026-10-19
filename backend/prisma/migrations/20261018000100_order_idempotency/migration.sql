ALTER TABLE "Order" ADD COLUMN "idempotencyKey" UUID, ADD COLUMN "requestHash" CHAR(64);
CREATE UNIQUE INDEX "Order_customerId_idempotencyKey_key" ON "Order"("customerId", "idempotencyKey");
ALTER TABLE "Order" ADD CONSTRAINT "Order_confirmation_identity_check"
  CHECK (("idempotencyKey" IS NULL AND "requestHash" IS NULL) OR
         ("idempotencyKey" IS NOT NULL AND "requestHash" IS NOT NULL AND "requestHash" ~ '^[a-f0-9]{64}$'));
