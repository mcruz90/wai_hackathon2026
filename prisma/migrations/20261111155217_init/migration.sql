-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('family_doctor', 'nurse_practitioner');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('pending', 'live', 'expired', 'full');

-- CreateEnum
CREATE TYPE "WaitlistChannel" AS ENUM ('sms', 'email');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('waiting', 'offered', 'accepted', 'passed', 'left');

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "clinic" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "fsa" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "provider_type" "ProviderType" NOT NULL,
    "languages" TEXT[],
    "phone" TEXT,
    "source_type" TEXT NOT NULL,
    "source_url" TEXT,
    "raw_text" TEXT,
    "confidence" JSONB,
    "status" "ListingStatus" NOT NULL DEFAULT 'pending',
    "last_confirmed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "full_reports" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_hash" TEXT NOT NULL,

    CONSTRAINT "full_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fsa_centroids" (
    "fsa" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "fsa_centroids_pkey" PRIMARY KEY ("fsa")
);

-- CreateTable
CREATE TABLE "daily_counts" (
    "date" DATE NOT NULL,
    "fsa" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "searches" INTEGER NOT NULL DEFAULT 0,
    "searches_with_no_language_match" INTEGER NOT NULL DEFAULT 0,
    "listing_opens" INTEGER NOT NULL DEFAULT 0,
    "full_reports" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_counts_pkey" PRIMARY KEY ("date","fsa","language","is_sample")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fsa" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "channel" "WaitlistChannel" NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'waiting',
    "last_checkin_at" TIMESTAMP(3) NOT NULL,
    "is_sample" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respond_by" TIMESTAMP(3) NOT NULL,
    "response" TEXT,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_messages" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "offer_id" TEXT,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listings_status_expires_at_idx" ON "listings"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "full_reports_listing_id_token_hash_key" ON "full_reports"("listing_id", "token_hash");

-- CreateIndex
CREATE INDEX "waitlist_entries_status_joined_at_idx" ON "waitlist_entries"("status", "joined_at");

-- CreateIndex
CREATE INDEX "offers_listing_id_response_idx" ON "offers"("listing_id", "response");

-- AddForeignKey
ALTER TABLE "full_reports" ADD CONSTRAINT "full_reports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "waitlist_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_messages" ADD CONSTRAINT "outbox_messages_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "waitlist_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_messages" ADD CONSTRAINT "outbox_messages_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
