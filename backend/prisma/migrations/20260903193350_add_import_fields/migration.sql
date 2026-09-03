-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('MANUAL', 'IMPORT');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "source" "TaskSource" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "tasks_externalRef_idx" ON "tasks"("externalRef");
