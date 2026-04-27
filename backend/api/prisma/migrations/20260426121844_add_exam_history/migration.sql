-- CreateTable
CREATE TABLE "exam_sessions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "deck_id" BIGINT,
    "set_id" BIGINT,
    "seed" INTEGER,
    "total_cards" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_answers" (
    "id" BIGSERIAL NOT NULL,
    "session_id" BIGINT NOT NULL,
    "card_id" BIGINT,
    "front" TEXT NOT NULL,
    "was_correct" BOOLEAN NOT NULL,
    "time_secs" INTEGER NOT NULL,

    CONSTRAINT "exam_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_sessions_user_id_idx" ON "exam_sessions"("user_id");

-- CreateIndex
CREATE INDEX "exam_sessions_deck_id_idx" ON "exam_sessions"("deck_id");

-- CreateIndex
CREATE INDEX "exam_sessions_set_id_idx" ON "exam_sessions"("set_id");

-- CreateIndex
CREATE INDEX "exam_answers_session_id_idx" ON "exam_answers"("session_id");

-- CreateIndex
CREATE INDEX "exam_answers_card_id_idx" ON "exam_answers"("card_id");

-- AddForeignKey
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "deck_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
