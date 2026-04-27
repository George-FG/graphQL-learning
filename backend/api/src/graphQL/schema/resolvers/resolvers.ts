import type { Resolvers } from "@generated/generated";
import type { GraphQLContext } from "@generated/context";

// ── Queries ──────────────────────────────────────────────────────────────────
import { getUserByID }         from "./queries/getUserByID";
import { me }                  from "./queries/me";
import { browse }              from "./queries/browse";
import { myDecks }             from "./queries/myDecks";
import { deck }                from "./queries/deck";
import { quizQuestions }       from "./queries/quizQuestions";
import { quizQuestionsForSet } from "./queries/quizQuestionsForSet";
import { examHistory }         from "./queries/examHistory";
import { examSessionDetail }   from "./queries/examSessionDetail";
import { examAggregate }       from "./queries/examAggregate";
import { cardQuestion }        from "./queries/cardQuestion";

// ── Mutations ─────────────────────────────────────────────────────────────────
import { signUp }           from "./mutations/signUp";
import { login }            from "./mutations/login";
import { refreshSession }   from "./mutations/refreshSession";
import { logout }           from "./mutations/logout";
import { uploadApkg }       from "./mutations/uploadApkg";
import { deleteDeck }       from "./mutations/deleteDeck";
import { deleteDeckSet }    from "./mutations/deleteDeckSet";
import { startExamSession } from "./mutations/startExamSession";
import { recordExamAnswer } from "./mutations/recordExamAnswer";

export const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    getUserByID,
    me,
    browse,
    myDecks,
    deck,
    quizQuestions,
    quizQuestionsForSet,
    examHistory,
    examSessionDetail,
    examAggregate,
    cardQuestion,
  },
  Mutation: {
    signUp,
    login,
    refreshSession,
    logout,
    uploadApkg,
    deleteDeck,
    deleteDeckSet,
    startExamSession,
    recordExamAnswer,
  },
};
