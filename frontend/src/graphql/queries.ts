import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      ID
      username
    }
  }
`;

export const JOURNEY_GRAPH_QUERY = gql`
  query JourneyGraph($start: String!, $end: String!) {
    journeyGraph(start: $start, end: $end) {
      start
      end
      nodes {
        id
        name
      }
      edges {
        id
        source
        target
        label
      }
    }
  }
`;