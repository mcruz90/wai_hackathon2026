-- CreateTable
CREATE TABLE "language_reports" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "language_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "language_reports_listing_id_idx" ON "language_reports"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "language_reports_listing_id_language_token_hash_key" ON "language_reports"("listing_id", "language", "token_hash");

-- AddForeignKey
ALTER TABLE "language_reports" ADD CONSTRAINT "language_reports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
