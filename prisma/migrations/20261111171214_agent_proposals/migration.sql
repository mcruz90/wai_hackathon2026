-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "agent_proposals" (
    "id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "listing_id" TEXT,
    "payload" JSONB NOT NULL,
    "rationale" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "trace" JSONB NOT NULL,
    "raw_text" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "agent_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_proposals_status_created_at_idx" ON "agent_proposals"("status", "created_at");

-- AddForeignKey
ALTER TABLE "agent_proposals" ADD CONSTRAINT "agent_proposals_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
