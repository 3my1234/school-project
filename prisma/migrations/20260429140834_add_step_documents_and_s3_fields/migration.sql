-- AlterTable
ALTER TABLE "ClearanceDocument" ADD COLUMN     "fileKey" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "stepId" TEXT;

-- CreateIndex
CREATE INDEX "ClearanceDocument_stepId_idx" ON "ClearanceDocument"("stepId");

-- AddForeignKey
ALTER TABLE "ClearanceDocument" ADD CONSTRAINT "ClearanceDocument_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ClearanceStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
