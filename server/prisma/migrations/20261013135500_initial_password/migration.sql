-- AlterTable
ALTER TABLE "users" ADD COLUMN     "initial_password" TEXT,
ADD COLUMN     "password_changed" BOOLEAN NOT NULL DEFAULT false;
