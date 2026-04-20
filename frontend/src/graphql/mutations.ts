import { gql } from "@apollo/client";

export const SIGN_UP_MUTATION = gql`
  mutation SignUp($username: String!, $password: String!, $numFish: Int!) {
    signUp(username: $username, password: $password, numFish: $numFish) {
      User {
        ID
        Username
        NumFish
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      User {
        ID
        Username
        NumFish
      }
    }
  }
`;