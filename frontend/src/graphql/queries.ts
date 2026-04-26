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
  query QuizQuestions($deckId: ID!, $offset: Int, $limit: Int) {
    quizQuestions(deckId: $deckId, offset: $offset, limit: $limit) {
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
