-- CreateTable: hierarchical set structure
CREATE TABLE "deck_sets" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "parent_id" BIGINT,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deck_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deck_sets_user_id_idx" ON "deck_sets"("user_id");
CREATE INDEX "deck_sets_parent_id_idx" ON "deck_sets"("parent_id");

-- AddForeignKey: deck_sets -> users
ALTER TABLE "deck_sets" ADD CONSTRAINT "deck_sets_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: deck_sets -> deck_sets (self-referential hierarchy)
ALTER TABLE "deck_sets" ADD CONSTRAINT "deck_sets_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "deck_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add deck_set_id to decks (nullable for existing decks)
ALTER TABLE "decks" ADD COLUMN "deck_set_id" BIGINT;

-- AddForeignKey: decks -> deck_sets
ALTER TABLE "decks" ADD CONSTRAINT "decks_deck_set_id_fkey"
    FOREIGN KEY ("deck_set_id") REFERENCES "deck_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: decks by set
CREATE INDEX "decks_deck_set_id_idx" ON "decks"("deck_set_id");
