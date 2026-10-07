-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SELLER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_ON_DELIVERY', 'SIMULATED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "logo" TEXT,
    "banner" TEXT,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "address" TEXT NOT NULL,
    "status" "BusinessStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" VARCHAR(80) NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'INACTIVE',
    "mainImage" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "recipientName" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "addressLine" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "postalCode" VARCHAR(20),
    "countryCode" CHAR(2) NOT NULL DEFAULT 'GT',
    "deliveryInstructions" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "customerId" UUID NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'GTQ',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "recipientName" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "addressLine" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "postalCode" VARCHAR(20),
    "countryCode" CHAR(2) NOT NULL DEFAULT 'GT',
    "deliveryInstructions" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerOrder" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "stockDeductedAt" TIMESTAMPTZ(3),
    "stockRestoredAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SellerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "sellerOrderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productName" VARCHAR(180) NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" UUID NOT NULL,
    "sellerOrderId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "sellerOrderId" UUID,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "familyId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "replacedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Business_ownerId_key" ON "Business"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE INDEX "Business_status_createdAt_idx" ON "Business"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_businessId_status_createdAt_idx" ON "Product"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Product_categoryId_status_price_idx" ON "Product"("categoryId", "status", "price");

-- CreateIndex
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_businessId_key" ON "Product"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_sku_key" ON "Product"("businessId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_position_key" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_url_key" ON "ProductImage"("productId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "CartItem"("cartId", "productId");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "SellerOrder_businessId_status_createdAt_idx" ON "SellerOrder"("businessId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerOrder_id_businessId_key" ON "SellerOrder"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerOrder_orderId_businessId_key" ON "SellerOrder"("orderId", "businessId");

-- CreateIndex
CREATE INDEX "OrderItem_sellerOrderId_businessId_idx" ON "OrderItem"("sellerOrderId", "businessId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_businessId_idx" ON "OrderItem"("productId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_sellerOrderId_productId_key" ON "OrderItem"("sellerOrderId", "productId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_sellerOrderId_createdAt_idx" ON "OrderStatusHistory"("sellerOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_actorId_idx" ON "OrderStatusHistory"("actorId");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_businessId_createdAt_idx" ON "InventoryMovement"("productId", "businessId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_sellerOrderId_businessId_idx" ON "InventoryMovement"("sellerOrderId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_replacedById_key" ON "RefreshToken"("replacedById");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_revokedAt_idx" ON "RefreshToken"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerOrder" ADD CONSTRAINT "SellerOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerOrder" ADD CONSTRAINT "SellerOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerOrderId_businessId_fkey" FOREIGN KEY ("sellerOrderId", "businessId") REFERENCES "SellerOrder"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_businessId_fkey" FOREIGN KEY ("productId", "businessId") REFERENCES "Product"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_businessId_fkey" FOREIGN KEY ("productId", "businessId") REFERENCES "Product"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_sellerOrderId_businessId_fkey" FOREIGN KEY ("sellerOrderId", "businessId") REFERENCES "SellerOrder"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Business invariants not representable in Prisma Schema.
ALTER TABLE "User" ADD CONSTRAINT "User_email_normalized_check"
  CHECK ("email" = lower(btrim("email")) AND length("email") > 0);
ALTER TABLE "Category" ADD CONSTRAINT "Category_not_own_parent_check"
  CHECK ("parentId" IS NULL OR "parentId" <> "id");
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_nonnegative_check" CHECK ("price" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_nonnegative_check" CHECK ("stock" >= 0);
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_position_nonnegative_check" CHECK ("position" >= 0);
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_quantity_positive_check" CHECK ("quantity" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_nonnegative_check" CHECK ("total" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_currency_format_check" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "SellerOrder" ADD CONSTRAINT "SellerOrder_subtotal_nonnegative_check" CHECK ("subtotal" >= 0);
ALTER TABLE "SellerOrder" ADD CONSTRAINT "SellerOrder_stock_timestamps_check"
  CHECK ("stockRestoredAt" IS NULL OR ("stockDeductedAt" IS NOT NULL AND "stockRestoredAt" >= "stockDeductedAt"));
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive_check" CHECK ("quantity" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_unitPrice_nonnegative_check" CHECK ("unitPrice" >= 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_lineTotal_consistent_check" CHECK ("lineTotal" = "unitPrice" * "quantity");
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_stocks_nonnegative_check"
  CHECK ("previousStock" >= 0 AND "newStock" >= 0);
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_balance_check"
  CHECK ("previousStock"::bigint + "quantity"::bigint = "newStock"::bigint);
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_type_sign_check"
  CHECK (("type" = 'IN' AND "quantity" > 0) OR ("type" = 'OUT' AND "quantity" < 0) OR ("type" = 'ADJUSTMENT' AND "quantity" <> 0));
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_expiry_check" CHECK ("expiresAt" > "createdAt");
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_hash_format_check" CHECK ("tokenHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_not_own_replacement_check"
  CHECK ("replacedById" IS NULL OR "replacedById" <> "id");
