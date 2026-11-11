CREATE TABLE "discovery_sources" (
 "id" TEXT NOT NULL PRIMARY KEY, "url" TEXT NOT NULL, "host" TEXT NOT NULL,
 "title" TEXT NOT NULL DEFAULT '', "kind" TEXT NOT NULL DEFAULT 'unknown',
 "status" TEXT NOT NULL DEFAULT 'pending', "trusted_clinic" BOOLEAN NOT NULL DEFAULT false,
 "found_by" TEXT NOT NULL DEFAULT 'manual', "query" TEXT, "is_sample" BOOLEAN NOT NULL DEFAULT false,
 "last_checked_at" TIMESTAMP(3), "next_check_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "last_hash" TEXT, "last_error" TEXT, "lease_until" TIMESTAMP(3), "reviewed_at" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "discovery_sources_url_key" ON "discovery_sources"("url");
CREATE INDEX "discovery_sources_status_next_check_at_idx" ON "discovery_sources"("status", "next_check_at");
CREATE TABLE "discovery_checks" (
 "id" TEXT NOT NULL PRIMARY KEY, "source_id" TEXT NOT NULL, "content_hash" TEXT NOT NULL,
 "source_url" TEXT NOT NULL, "title" TEXT NOT NULL, "excerpt" TEXT NOT NULL,
 "published_date" TEXT, "retrieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "status" TEXT NOT NULL DEFAULT 'queued', "outcome_kind" TEXT, "outcome_id" TEXT, "error" TEXT,
 CONSTRAINT "discovery_checks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "discovery_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "discovery_checks_source_id_content_hash_key" ON "discovery_checks"("source_id", "content_hash");
CREATE INDEX "discovery_checks_retrieved_at_idx" ON "discovery_checks"("retrieved_at");
CREATE TABLE "discovery_search_state" (
 "id" TEXT NOT NULL PRIMARY KEY, "last_searched_at" TIMESTAMP(3),
 "next_search_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lease_until" TIMESTAMP(3), "last_error" TEXT
);
