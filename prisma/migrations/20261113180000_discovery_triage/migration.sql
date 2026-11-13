-- The triage agent sorts found pages: watch as a clinic page, watch as a directory, dismiss, or ask a person.
ALTER TABLE "discovery_sources" ADD COLUMN "snippet" TEXT NOT NULL DEFAULT '';
ALTER TABLE "discovery_sources" ADD COLUMN "triage_decision" TEXT;
ALTER TABLE "discovery_sources" ADD COLUMN "triage_reason" TEXT;
ALTER TABLE "discovery_sources" ADD COLUMN "triaged_at" TIMESTAMP(3);
ALTER TABLE "discovery_search_state" ADD COLUMN "last_triage" JSONB;
