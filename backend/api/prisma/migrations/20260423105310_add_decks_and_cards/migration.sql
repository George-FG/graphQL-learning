/*
  Warnings:

  - You are about to drop the column `num_fish` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "num_fish";

-- CreateTable
CREATE TABLE "decks" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" BIGSERIAL NOT NULL,
    "deck_id" BIGINT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "decks_user_id_idx" ON "decks"("user_id");

-- CreateIndex
CREATE INDEX "cards_deck_id_idx" ON "cards"("deck_id");

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
