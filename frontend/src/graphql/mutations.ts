import { gql } from "@apollo/client";

export const SIGN_UP_MUTATION = gql`
  mutation SignUp($username: String!, $password: String!, $numFish: Int!) {
    signUp(username: $username, password: $password, numFish: $numFish) {
      accessToken
      User {
        ID
        username
        numFish
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
        numFish
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
        numFish
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;