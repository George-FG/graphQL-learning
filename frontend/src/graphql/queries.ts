import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      ID
      username
      numFish
    }
  }
`;