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

export const UPLOAD_DECK_MUTATION = gql`
  mutation UploadDeck($name: String!, $fileContent: String!, $shuffle: Boolean) {
    uploadDeck(name: $name, fileContent: $fileContent, shuffle: $shuffle) {
      id
      name
      cardCount
      createdAt
    }
  }
`;

export const DELETE_DECK_MUTATION = gql`
  mutation DeleteDeck($id: ID!) {
    deleteDeck(id: $id)
  }
`;