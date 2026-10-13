-- AlterTable
ALTER TABLE "users" ADD COLUMN     "position" TEXT,
ADD COLUMN     "schedule_name" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_schedule_name_key" ON "users"("schedule_name");
