import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { getAccessToken } from "./session";

const authLink = new SetContextLink((prevContext) => {
  const token = getAccessToken();

  return {
    headers: {
      ...prevContext.headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL,
  credentials: "include",
});

export const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
});