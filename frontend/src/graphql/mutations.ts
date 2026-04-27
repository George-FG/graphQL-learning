import { gql } from "@apollo/client";

export const SIGN_UP_MUTATION = gql`
  mutation SignUp($username: String!, $password: String!) {
    signUp(username: $username, password: $password) {
      accessToken
      User {
        ID
        username
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      accessToken
      User {
        ID
        username
      }
    }
  }
`;

export const REFRESH_SESSION_MUTATION = gql`
  mutation RefreshSession {
    refreshSession {
      accessToken
      User {
        ID
        username
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export const UPLOAD_APKG_MUTATION = gql`
  mutation UploadApkg($fileContent: String!, $shuffle: Boolean) {
    uploadApkg(fileContent: $fileContent, shuffle: $shuffle)
  }
`;

export const DELETE_DECK_MUTATION = gql`
  mutation DeleteDeck($id: ID!) {
    deleteDeck(id: $id)
  }
`;

export const DELETE_SET_MUTATION = gql`
  mutation DeleteDeckSet($id: ID!) {
    deleteDeckSet(id: $id)
  }
`;

export const START_EXAM_SESSION_MUTATION = gql`
  mutation StartExamSession($deckId: ID, $setId: ID, $seed: Int, $totalCards: Int!) {
    startExamSession(deckId: $deckId, setId: $setId, seed: $seed, totalCards: $totalCards)
  }
`;

export const RECORD_EXAM_ANSWER_MUTATION = gql`
  mutation RecordExamAnswer($sessionId: ID!, $cardId: ID!, $front: String!, $wasCorrect: Boolean!, $timeSecs: Int!) {
    recordExamAnswer(sessionId: $sessionId, cardId: $cardId, front: $front, wasCorrect: $wasCorrect, timeSecs: $timeSecs)
  }
`;