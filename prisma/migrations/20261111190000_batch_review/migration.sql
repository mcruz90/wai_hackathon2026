CREATE TABLE "review_decisions" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'shared_admin',
    "policy" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_decisions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "review_decisions_created_at_idx" ON "review_decisions"("created_at");
