-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME
);

-- CreateTable
CREATE TABLE "cod_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "minOrderValue" REAL NOT NULL DEFAULT 0,
    "maxOrderValue" REAL NOT NULL DEFAULT 10000,
    "extraFee" REAL NOT NULL DEFAULT 0,
    "extraFeeType" TEXT NOT NULL DEFAULT 'flat',
    "blockedPincodes" TEXT NOT NULL DEFAULT '',
    "blockedStates" TEXT NOT NULL DEFAULT '',
    "requireOtp" BOOLEAN NOT NULL DEFAULT false,
    "autoVerifyReturningCustomers" BOOLEAN NOT NULL DEFAULT true,
    "rtoProtection" BOOLEAN NOT NULL DEFAULT true,
    "rtoRiskThreshold" TEXT NOT NULL DEFAULT 'medium',
    "prepaidDiscount" REAL NOT NULL DEFAULT 0,
    "prepaidDiscountType" TEXT NOT NULL DEFAULT 'flat',
    "partialCodEnabled" BOOLEAN NOT NULL DEFAULT false,
    "partialCodMinPrepaid" REAL NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "rto_stats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "codOrders" INTEGER NOT NULL DEFAULT 0,
    "rtoCount" INTEGER NOT NULL DEFAULT 0,
    "rtoRate" REAL NOT NULL DEFAULT 0,
    "savedByVerification" INTEGER NOT NULL DEFAULT 0,
    "prepaidConversions" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tracking_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "brandedPageEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customDomain" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "primaryColor" TEXT NOT NULL DEFAULT '#5C6AC4',
    "accentColor" TEXT NOT NULL DEFAULT '#47C1BF',
    "showEstimatedDelivery" BOOLEAN NOT NULL DEFAULT true,
    "showOrderItems" BOOLEAN NOT NULL DEFAULT true,
    "showCarrierInfo" BOOLEAN NOT NULL DEFAULT true,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "notifySms" BOOLEAN NOT NULL DEFAULT false,
    "whatsappNumber" TEXT NOT NULL DEFAULT '',
    "emailTemplate" TEXT NOT NULL DEFAULT 'default',
    "ndrsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ndrAutoReattempt" BOOLEAN NOT NULL DEFAULT true,
    "ndrMaxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "smart_cart_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "freeShippingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "freeShippingThreshold" REAL NOT NULL DEFAULT 499,
    "freeShippingMessage" TEXT NOT NULL DEFAULT 'Add {amount} more for FREE shipping 🚚',
    "freeShippingSuccessMessage" TEXT NOT NULL DEFAULT '🎉 You''ve unlocked FREE shipping!',
    "milestonesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "milestones" TEXT NOT NULL DEFAULT '[]',
    "upsellEnabled" BOOLEAN NOT NULL DEFAULT false,
    "upsellProductVariantId" TEXT NOT NULL DEFAULT '',
    "upsellProductTitle" TEXT NOT NULL DEFAULT '',
    "upsellProductPrice" REAL NOT NULL DEFAULT 0,
    "upsellProductImage" TEXT NOT NULL DEFAULT '',
    "upsellTitle" TEXT NOT NULL DEFAULT 'Complete your order',
    "upsellBadgeText" TEXT NOT NULL DEFAULT 'Frequently bought together',
    "prepaidNudgeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "prepaidDiscount" REAL NOT NULL DEFAULT 50,
    "prepaidDiscountType" TEXT NOT NULL DEFAULT 'flat',
    "trustBadgesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shipping_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "defaultWeight" INTEGER NOT NULL DEFAULT 500,
    "autoSelectCourier" BOOLEAN NOT NULL DEFAULT true,
    "showRatesInCart" BOOLEAN NOT NULL DEFAULT true,
    "codExtraCharge" REAL NOT NULL DEFAULT 30,
    "couriers" TEXT NOT NULL DEFAULT '[]',
    "zones" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "storeName" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "orderId" TEXT,
    "value" REAL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "cod_settings_shop_key" ON "cod_settings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "rto_stats_shop_key" ON "rto_stats"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_settings_shop_key" ON "tracking_settings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "smart_cart_settings_shop_key" ON "smart_cart_settings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_settings_shop_key" ON "shipping_settings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_shop_key" ON "app_settings"("shop");

-- CreateIndex
CREATE INDEX "analytics_events_shop_idx" ON "analytics_events"("shop");

-- CreateIndex
CREATE INDEX "analytics_events_shop_event_idx" ON "analytics_events"("shop", "event");

-- CreateIndex
CREATE INDEX "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");
