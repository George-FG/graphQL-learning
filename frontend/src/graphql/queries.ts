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
