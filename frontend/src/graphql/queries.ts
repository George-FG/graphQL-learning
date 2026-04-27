import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      ID
      username
    }
  }
`;

export const MY_DECKS_QUERY = gql`
  query MyDecks {
    myDecks {
      id
      name
      cardCount
      createdAt
    }
  }
`;

export const BROWSE_QUERY = gql`
  query Browse($parentSetId: ID) {
    browse(parentSetId: $parentSetId) {
      sets {
        id
        name
        createdAt
        parentId
        childSetCount
        deckCount
        totalCardCount
      }
      decks {
        id
        name
        cardCount
        createdAt
      }
    }
  }
`;

export const DECK_QUERY = gql`
  query Deck($id: ID!, $offset: Int, $limit: Int) {
    deck(id: $id, offset: $offset, limit: $limit) {
      id
      name
      cardCount
      cards {
        id
        front
        back
        position
      }
    }
  }
`;

export const QUIZ_QUESTIONS_QUERY = gql`
  query QuizQuestions($deckId: ID!, $offset: Int, $limit: Int, $seed: Int) {
    quizQuestions(deckId: $deckId, offset: $offset, limit: $limit, seed: $seed) {
      totalCards
      questions {
        cardId
        front
        correctOptionId
        options {
          id
          text
        }
      }
    }
  }
`;

export const QUIZ_QUESTIONS_FOR_SET_QUERY = gql`
  query QuizQuestionsForSet($setId: ID!, $offset: Int, $limit: Int, $seed: Int) {
    quizQuestionsForSet(setId: $setId, offset: $offset, limit: $limit, seed: $seed) {
      totalCards
      questions {
        cardId
        front
        correctOptionId
        options {
          id
          text
        }
      }
    }
  }
`;

export const EXAM_HISTORY_QUERY = gql`
  query ExamHistory($deckId: ID, $setId: ID, $period: String) {
    examHistory(deckId: $deckId, setId: $setId, period: $period) {
      id
      createdAt
      totalCards
      answeredCount
      correctCount
      pctCorrect
      avgTimeSecs
      isRandom
      sourceName
    }
  }
`;

export const EXAM_SESSION_DETAIL_QUERY = gql`
  query ExamSessionDetail($id: ID!) {
    examSessionDetail(id: $id) {
      id
      createdAt
      totalCards
      answeredCount
      correctCount
      pctCorrect
      avgTimeSecs
      isRandom
      sourceName
      answers {
        cardId
        front
        wasCorrect
        timeSecs
      }
    }
  }
`;

export const EXAM_AGGREGATE_QUERY = gql`
  query ExamAggregate($deckId: ID, $setId: ID, $period: String) {
    examAggregate(deckId: $deckId, setId: $setId, period: $period) {
      totalAnswered
      correctCount
      pctCorrect
      avgTimeSecs
      sessionCount
      answers {
        cardId
        front
        wasCorrect
        timeSecs
        sessionDate
      }
    }
  }
`;
