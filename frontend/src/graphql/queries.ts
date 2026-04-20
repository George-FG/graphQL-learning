import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      ID
      username
    }
  }
`;

export const SEARCH_LOCATIONS_QUERY = gql`
  query SearchLocations($query: String!) {
    searchLocations(query: $query) {
      id
      name
      lat
      lng
      type
    }
  }
`;

export const JOURNEY_GRAPH_QUERY = gql`
  query JourneyGraph($startId: ID!, $endId: ID!) {
    journeyGraph(startId: $startId, endId: $endId) {
      start {
        id
        name
        lat
        lng
      }
      end {
        id
        name
        lat
        lng
      }
      nodes {
        id
        name
        lat
        lng
      }
      edges {
        id
        fromId
        toId
        transportType
        routeName
        duration
      }
      route {
        totalDuration
        nodes {
          id
          name
        }
        edges {
          id
          fromId
          toId
          routeName
          transportType
          duration
        }
      }
    }
  }
`;